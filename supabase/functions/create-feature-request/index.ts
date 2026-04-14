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

const ROUTE = "create-feature-request";
const FEATURE_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000;
const FEATURE_REQUEST_MAX_PER_USER = 3;
const FEATURE_REQUEST_MAX_PER_IP = 6;
const FEATURE_REQUEST_CATEGORIES = [
  "Founder Tools",
  "Investor Tools",
  "Matching",
  "Analytics",
  "General",
] as const;

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
      windowMs: FEATURE_REQUEST_WINDOW_MS,
      maxPerIp: FEATURE_REQUEST_MAX_PER_IP,
      maxPerUser: FEATURE_REQUEST_MAX_PER_USER,
      userId: user.id,
      identifier: user.email ?? user.id,
      eventType: "feature_request_rate_limited",
    });

    const title = sanitizeText(body.title, "title", { minLength: 3, maxLength: 100 }) ?? "";
    const description = sanitizeText(body.description, "description", {
      minLength: 10,
      maxLength: 500,
      multiline: true,
    }) ?? "";
    const category = requireEnum(body.category, "category", FEATURE_REQUEST_CATEGORIES);

    const { data, error } = await serviceClient
      .from("feature_requests")
      .insert({
        user_id: user.id,
        title,
        description,
        category,
      })
      .select("id, status, vote_count, created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return json({
      success: true,
      featureRequest: data,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return json({ error: error.message }, error.status);
    }

    if (error instanceof Response) {
      return error;
    }

    console.error("create-feature-request error:", getSafeErrorSummary(error));

    try {
      const serviceClient = createServiceClient();
      await logSecurityEvent(serviceClient, req, {
        eventType: "feature_request_internal_error",
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
