import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/abuseProtection.ts";
import { parseJsonObject, requireEnum, sanitizeText, ValidationError } from "../_shared/inputValidation.ts";
import { getSafeErrorSummary, logSecurityEvent } from "../_shared/security.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const ROUTE = "submit-bug-report";
const BUG_WINDOW_MS = 24 * 60 * 60 * 1000;
const BUG_MAX_PER_USER = 10;
const BUG_MAX_PER_IP = 20;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });
}

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role environment variables are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient.auth.getUser(token);

  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  return {
    serviceClient,
    user: data.user,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const [{ serviceClient, user }, body] = await Promise.all([
      requireAuthenticatedUser(req),
      parseJsonObject(req),
    ]);

    await enforceRateLimit(serviceClient, req, {
      route: ROUTE,
      windowMs: BUG_WINDOW_MS,
      maxPerIp: BUG_MAX_PER_IP,
      maxPerUser: BUG_MAX_PER_USER,
      userId: user.id,
      identifier: user.email ?? user.id,
      eventType: "bug_report_rate_limited",
    });

    const title = sanitizeText(body.title, "title", { minLength: 3, maxLength: 100 }) ?? "";
    const description = sanitizeText(body.description, "description", {
      minLength: 10,
      maxLength: 1000,
      multiline: true,
    }) ?? "";
    const severity = requireEnum(body.severity, "severity", ["Low", "Medium", "High", "Critical"] as const);
    const steps = sanitizeText(body.steps, "steps", {
      maxLength: 1000,
      multiline: true,
      allowEmpty: true,
    });
    const pageUrl = sanitizeText(body.pageUrl, "pageUrl", { minLength: 1, maxLength: 500 }) ?? "";
    const screenshotUrl = sanitizeText(body.screenshotUrl, "screenshotUrl", {
      maxLength: 500,
      allowEmpty: true,
    });

    const browserInfo = typeof body.browserInfo === "object" && body.browserInfo !== null && !Array.isArray(body.browserInfo)
      ? body.browserInfo
      : {};

    const { error } = await serviceClient.from("bug_reports").insert({
      user_id: user.id,
      title,
      description,
      severity,
      steps,
      screenshot_url: screenshotUrl,
      page_url: pageUrl,
      browser_info: browserInfo,
      status: "new",
    });

    if (error) {
      throw new Error(error.message);
    }

    return json({
      success: true,
      message: "Bug report submitted.",
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return json({ error: error.message }, error.status);
    }

    if (error instanceof Response) {
      return error;
    }

    console.error("submit-bug-report error:", getSafeErrorSummary(error));

    try {
      const serviceClient = createServiceClient();
      await logSecurityEvent(serviceClient, req, {
        eventType: "bug_report_internal_error",
        severity: "critical",
        route: ROUTE,
        metadata: getSafeErrorSummary(error),
      });
    } catch {
      // Ignore nested logging failures.
    }

    return json({ error: "Internal server error" }, 500);
  }
});
