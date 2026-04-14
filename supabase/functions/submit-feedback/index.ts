import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/abuseProtection.ts";
import { parseJsonObject, sanitizeText, ValidationError } from "../_shared/inputValidation.ts";
import { getSafeErrorSummary, logSecurityEvent } from "../_shared/security.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const ROUTE = "submit-feedback";
const FEEDBACK_WINDOW_MS = 24 * 60 * 60 * 1000;
const FEEDBACK_MAX_PER_USER = 5;
const FEEDBACK_MAX_PER_IP = 10;

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
      windowMs: FEEDBACK_WINDOW_MS,
      maxPerIp: FEEDBACK_MAX_PER_IP,
      maxPerUser: FEEDBACK_MAX_PER_USER,
      userId: user.id,
      identifier: user.email ?? user.id,
      eventType: "feedback_rate_limited",
    });

    const rawMood = body.mood;
    if (typeof rawMood !== "number" || !Number.isInteger(rawMood) || rawMood < 1 || rawMood > 4) {
      throw new ValidationError("mood must be an integer between 1 and 4");
    }

    const pageUrl = sanitizeText(body.pageUrl, "pageUrl", { minLength: 1, maxLength: 500 }) ?? "";
    const message = sanitizeText(body.message, "message", {
      maxLength: 500,
      multiline: true,
      allowEmpty: true,
    });

    const { error } = await serviceClient.from("feedback").insert({
      user_id: user.id,
      mood: rawMood,
      message,
      page_url: pageUrl,
    });

    if (error) {
      throw new Error(error.message);
    }

    return json({
      success: true,
      message: "Thanks for the feedback.",
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return json({ error: error.message }, error.status);
    }

    if (error instanceof Response) {
      return error;
    }

    console.error("submit-feedback error:", getSafeErrorSummary(error));

    try {
      const serviceClient = createServiceClient();
      await logSecurityEvent(serviceClient, req, {
        eventType: "feedback_internal_error",
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
