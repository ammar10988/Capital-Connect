import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getIpAddress(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? null;
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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

async function enforceRateLimit(
  serviceClient: ReturnType<typeof createClient>,
  input: {
    action: string;
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
    const body = await req.json() as RequestBody;
    const action = body.action;
    const email = body.email ? normalizeEmail(body.email) : "";
    const password = body.password ?? "";
    const redirectTo = body.redirectTo;

    if (!action || !email) {
      return json({ error: "action and email are required" }, 400);
    }

    if (redirectTo && !isAllowedRedirect(redirectTo)) {
      return json({ error: "Invalid redirect target" }, 400);
    }

    const ipAddress = getIpAddress(req);
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

      await enforceRateLimit(serviceClient, {
        action,
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

      await enforceRateLimit(serviceClient, {
        action,
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
          data: body.data ?? {},
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
        return json({ error: error.message }, 400);
      }

      return json({ success: true });
    }

    if (action === "request_password_reset") {
      await enforceRateLimit(serviceClient, {
        action,
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
        return json({ error: error.message }, 400);
      }

      return json({ success: true });
    }

    if (action === "verify_password") {
      if (!password) return json({ error: "password is required" }, 400);

      const { error } = await anonClient.auth.signInWithPassword({ email, password });
      if (error) {
        return json({ error: "Current password is incorrect" }, 401);
      }

      return json({ success: true });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("auth-gateway error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
