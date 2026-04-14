import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/abuseProtection.ts";
import {
  parseJsonObject,
  requireEmail,
  requireEnum,
  requireOptionalHttpUrl,
  sanitizeMetadata,
  sanitizeText,
  ValidationError,
} from "../_shared/inputValidation.ts";
import {
  getRequestIp,
  getSafeErrorSummary,
  logSecurityEvent,
  sha256Hex,
} from "../_shared/security.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const RESET_WINDOW_MS = 60 * 60 * 1000;
const LOGIN_MAX_PER_IDENTIFIER = 5;
const LOGIN_MAX_PER_IP = 20;
const SIGNUP_MAX_PER_IDENTIFIER = 3;
const SIGNUP_MAX_PER_IP = 10;
const RESET_MAX_PER_IDENTIFIER = 3;
const RESET_MAX_PER_IP = 10;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;
const VERIFY_MAX_PER_IDENTIFIER = 10;
const VERIFY_MAX_PER_IP = 30;
const PASSWORD_MIN_LENGTH = 12;

type Action = "login" | "register" | "request_password_reset" | "verify_password";

type RequestBody = {
  action?: Action;
  email?: string;
  password?: string;
  redirectTo?: string;
  data?: Record<string, unknown>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function validatePassword(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }

  if (!/[a-z]/.test(password)) return "Include at least one lowercase letter";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Include at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Include at least one symbol";
  return null;
}

function getAllowedRedirects() {
  const raw = Deno.env.get("AUTH_ALLOWED_REDIRECT_URLS") ?? "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isAllowedRedirect(redirectTo?: string | null) {
  if (!redirectTo) return true;

  const allowedRedirects = getAllowedRedirects();
  if (allowedRedirects.length === 0) return true;

  return allowedRedirects.some((allowed) => redirectTo.startsWith(allowed));
}

async function countRecentAttempts(
  serviceClient: ReturnType<typeof createClient>,
  action: string,
  identifierHash: string,
  ipHash: string | null,
  windowMs: number,
) {
  const since = new Date(Date.now() - windowMs).toISOString();

  const [{ count: identifierCount }, { count: ipCount }] = await Promise.all([
    serviceClient
      .from("auth_attempts")
      .select("*", { count: "exact", head: true })
      .eq("action", action)
      .eq("identifier_hash", identifierHash)
      .eq("success", false)
      .gte("created_at", since),
    ipHash
      ? serviceClient
        .from("auth_attempts")
        .select("*", { count: "exact", head: true })
        .eq("action", action)
        .eq("ip_hash", ipHash)
        .eq("success", false)
        .gte("created_at", since)
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    identifierCount: identifierCount ?? 0,
    ipCount: ipCount ?? 0,
  };
}

async function recordAttempt(
  serviceClient: ReturnType<typeof createClient>,
  input: {
    action: string;
    identifierHash: string;
    ipHash: string | null;
    success: boolean;
    metadata?: Record<string, unknown>;
  },
) {
  await serviceClient.from("auth_attempts").insert({
    action: input.action,
    identifier_hash: input.identifierHash,
    ip_hash: input.ipHash,
    success: input.success,
    metadata: input.metadata ?? {},
  });
}

async function enforceFailedAttemptRateLimit(
  serviceClient: ReturnType<typeof createClient>,
  req: Request,
  input: {
    action: string;
    identifier: string;
    identifierHash: string;
    ipHash: string | null;
    windowMs: number;
    maxPerIdentifier: number;
    maxPerIp: number;
  },
) {
  const counts = await countRecentAttempts(
    serviceClient,
    input.action,
    input.identifierHash,
    input.ipHash,
    input.windowMs,
  );

  if (counts.identifierCount >= input.maxPerIdentifier || counts.ipCount >= input.maxPerIp) {
    await logSecurityEvent(serviceClient, req, {
      eventType: "auth_failed_attempt_lockout",
      severity: "warning",
      route: "auth-gateway",
      identifier: input.identifier,
      metadata: {
        action: input.action,
        window_ms: input.windowMs,
        identifier_count: counts.identifierCount,
        ip_count: counts.ipCount,
        max_per_identifier: input.maxPerIdentifier,
        max_per_ip: input.maxPerIp,
      },
    });
    const retryAfterSeconds = Math.ceil(input.windowMs / 1000);
    throw new Response(
      JSON.stringify({
        error: "Too many authentication attempts",
        code: "rate_limit_exceeded",
        retry_after_seconds: retryAfterSeconds,
      }),
      {
        status: 429,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: "Auth gateway is not configured" }, 500);
  }

  try {
    const rawBody = await parseJsonObject(req);
    const action = requireEnum(rawBody.action, "action", [
      "login",
      "register",
      "request_password_reset",
      "verify_password",
    ] as const);
    const email = requireEmail(rawBody.email, "email");
    const password = sanitizeText(rawBody.password, "password", {
      maxLength: 200,
      allowEmpty: true,
    }) ?? "";
    const redirectTo = requireOptionalHttpUrl(rawBody.redirectTo, "redirectTo");

    if (redirectTo && !isAllowedRedirect(redirectTo)) {
      const auditClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await logSecurityEvent(auditClient, req, {
        eventType: "auth_invalid_redirect",
        severity: "warning",
        route: "auth-gateway",
        identifier: email,
        metadata: { action, redirectTo },
      });
      return json({ error: "Invalid redirect target" }, 400);
    }

    const ipAddress = getRequestIp(req);
    const identifierHash = await sha256Hex(email);
    const ipHash = ipAddress ? await sha256Hex(ipAddress) : null;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (action === "login") {
      if (!password) return json({ error: "password is required" }, 400);

      await enforceRateLimit(serviceClient, req, {
        route: `auth-gateway:${action}`,
        windowMs: LOGIN_WINDOW_MS,
        maxPerIdentifier: LOGIN_MAX_PER_IDENTIFIER,
        maxPerIp: LOGIN_MAX_PER_IP,
        identifier: email,
        eventType: "auth_rate_limit_exceeded",
      });
      await enforceFailedAttemptRateLimit(serviceClient, req, {
        action,
        identifier: email,
        identifierHash,
        ipHash,
        windowMs: LOGIN_WINDOW_MS,
        maxPerIdentifier: LOGIN_MAX_PER_IDENTIFIER,
        maxPerIp: LOGIN_MAX_PER_IP,
      });

      const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        await recordAttempt(serviceClient, {
          action,
          identifierHash,
          ipHash,
          success: false,
        });
        await logSecurityEvent(serviceClient, req, {
          eventType: "auth_login_failed",
          severity: "warning",
          route: "auth-gateway",
          identifier: email,
          metadata: { action },
        });
        return json({ error: "Invalid email or password" }, 401);
      }

      if (!data.user?.email_confirmed_at) {
        await recordAttempt(serviceClient, {
          action,
          identifierHash,
          ipHash,
          success: false,
          metadata: { reason: "email_not_verified" },
        });
        await logSecurityEvent(serviceClient, req, {
          eventType: "auth_email_not_verified",
          severity: "warning",
          route: "auth-gateway",
          userId: data.user.id,
          identifier: email,
          metadata: { action },
        });
        return json({
          error: "Verify your email before signing in",
          code: "email_not_verified",
        }, 403);
      }

      await recordAttempt(serviceClient, {
        action,
        identifierHash,
        ipHash,
        success: true,
      });
      await logSecurityEvent(serviceClient, req, {
        eventType: "auth_login_succeeded",
        severity: "info",
        route: "auth-gateway",
        userId: data.user.id,
        identifier: email,
        metadata: { action },
      });

      return json({
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
      });
    }

    if (action === "register") {
      if (!password) return json({ error: "password is required" }, 400);
      const passwordError = validatePassword(password);
      if (passwordError) return json({ error: passwordError }, 400);

      await enforceRateLimit(serviceClient, req, {
        route: `auth-gateway:${action}`,
        windowMs: SIGNUP_WINDOW_MS,
        maxPerIdentifier: SIGNUP_MAX_PER_IDENTIFIER,
        maxPerIp: SIGNUP_MAX_PER_IP,
        identifier: email,
        eventType: "auth_rate_limit_exceeded",
      });
      await enforceFailedAttemptRateLimit(serviceClient, req, {
        action,
        identifier: email,
        identifierHash,
        ipHash,
        windowMs: SIGNUP_WINDOW_MS,
        maxPerIdentifier: SIGNUP_MAX_PER_IDENTIFIER,
        maxPerIp: SIGNUP_MAX_PER_IP,
      });

      const { error } = await anonClient.auth.signUp({
        email,
        password,
        options: {
          data: sanitizeMetadata(rawBody.data),
          emailRedirectTo: redirectTo,
        },
      });

      await recordAttempt(serviceClient, {
        action,
        identifierHash,
        ipHash,
        success: !error,
      });

      if (error) {
        await logSecurityEvent(serviceClient, req, {
          eventType: "auth_register_failed",
          severity: "warning",
          route: "auth-gateway",
          identifier: email,
          metadata: { action, message: error.message },
        });
        return json({ error: error.message }, 400);
      }

      await logSecurityEvent(serviceClient, req, {
        eventType: "auth_register_succeeded",
        severity: "info",
        route: "auth-gateway",
        identifier: email,
        metadata: { action },
      });
      return json({ success: true });
    }

    if (action === "request_password_reset") {
      await enforceRateLimit(serviceClient, req, {
        route: `auth-gateway:${action}`,
        windowMs: RESET_WINDOW_MS,
        maxPerIdentifier: RESET_MAX_PER_IDENTIFIER,
        maxPerIp: RESET_MAX_PER_IP,
        identifier: email,
        eventType: "auth_rate_limit_exceeded",
      });
      await enforceFailedAttemptRateLimit(serviceClient, req, {
        action,
        identifier: email,
        identifierHash,
        ipHash,
        windowMs: RESET_WINDOW_MS,
        maxPerIdentifier: RESET_MAX_PER_IDENTIFIER,
        maxPerIp: RESET_MAX_PER_IP,
      });

      const { error } = await anonClient.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      await recordAttempt(serviceClient, {
        action,
        identifierHash,
        ipHash,
        success: !error,
      });

      if (error) {
        await logSecurityEvent(serviceClient, req, {
          eventType: "auth_password_reset_failed",
          severity: "warning",
          route: "auth-gateway",
          identifier: email,
          metadata: { action, message: error.message },
        });
        return json({ error: error.message }, 400);
      }

      await logSecurityEvent(serviceClient, req, {
        eventType: "auth_password_reset_requested",
        severity: "info",
        route: "auth-gateway",
        identifier: email,
        metadata: { action },
      });
      return json({ success: true });
    }

    if (action === "verify_password") {
      if (!password) return json({ error: "password is required" }, 400);

      await enforceRateLimit(serviceClient, req, {
        route: `auth-gateway:${action}`,
        windowMs: VERIFY_WINDOW_MS,
        maxPerIdentifier: VERIFY_MAX_PER_IDENTIFIER,
        maxPerIp: VERIFY_MAX_PER_IP,
        identifier: email,
        eventType: "auth_rate_limit_exceeded",
      });
      await enforceFailedAttemptRateLimit(serviceClient, req, {
        action,
        identifier: email,
        identifierHash,
        ipHash,
        windowMs: VERIFY_WINDOW_MS,
        maxPerIdentifier: VERIFY_MAX_PER_IDENTIFIER,
        maxPerIp: VERIFY_MAX_PER_IP,
      });

      const { error } = await anonClient.auth.signInWithPassword({ email, password });
      if (error) {
        await logSecurityEvent(serviceClient, req, {
          eventType: "auth_password_verify_failed",
          severity: "warning",
          route: "auth-gateway",
          identifier: email,
          metadata: { action, message: error.message },
        });
        return json({ error: "Current password is incorrect" }, 401);
      }

      await logSecurityEvent(serviceClient, req, {
        eventType: "auth_password_verified",
        severity: "info",
        route: "auth-gateway",
        identifier: email,
        metadata: { action },
      });
      return json({ success: true });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    if (error instanceof ValidationError) {
      return json({ error: error.message }, error.status);
    }

    console.error("auth-gateway error:", getSafeErrorSummary(error));
    try {
      const auditClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await logSecurityEvent(auditClient, req, {
        eventType: "auth_gateway_error",
        severity: "critical",
        route: "auth-gateway",
        metadata: {
          ...getSafeErrorSummary(error),
        },
      });
    } catch {
      // Ignore secondary logging errors.
    }
    return json({ error: "Internal server error" }, 500);
  }
});
