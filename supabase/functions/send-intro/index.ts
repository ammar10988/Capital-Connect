import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/abuseProtection.ts";
import {
  parseJsonObject,
  requireEnum,
  requireUuid,
  sanitizeText,
  ValidationError,
} from "../_shared/inputValidation.ts";
import { logSecurityEvent } from "../_shared/security.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const INTRO_REQUEST_WINDOW_MS = 60 * 60 * 1000;
const INTRO_REQUEST_MAX_PER_USER = 20;
const INTRO_REQUEST_MAX_PER_IP = 40;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = getBearerToken(req);
    if (!token) {
      return json({ error: "Missing bearer token" }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
      await logSecurityEvent(serviceClient, req, {
        eventType: "intro_request_unauthorized",
        severity: "warning",
        route: "send-intro",
      });
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await parseJsonObject(req);
    const rawInvestorId = typeof body.investorId === "string"
      ? body.investorId
      : typeof body.investor_id === "string"
      ? body.investor_id
      : "";
    const investorId = rawInvestorId.startsWith("platform_")
      ? rawInvestorId.replace(/^platform_/, "")
      : rawInvestorId;
    const normalizedStartupId = body.startup_id ?? body.startupId ?? null;
    const message = sanitizeText(body.message, "message", {
      maxLength: 500,
      multiline: true,
      allowEmpty: true,
    });
    const connectorName = sanitizeText(body.connectorName, "connectorName", {
      maxLength: 120,
      allowEmpty: true,
    });
    const connectorRole = sanitizeText(body.connectorRole, "connectorRole", {
      maxLength: 120,
      allowEmpty: true,
    });
    const connectionType = body.connectionType == null
      ? null
      : requireEnum(body.connectionType, "connectionType", ["mutual", "advisor", "linkedin"] as const);

    if (!investorId) {
      return json({ error: "investorId is required" }, 400);
    }
    requireUuid(investorId, "investorId");
    if (normalizedStartupId != null) {
      requireUuid(normalizedStartupId, "startupId");
    }

    const { data: requesterProfile, error: requesterError } = await serviceClient
      .from("profiles")
      .select("id, role, first_name, last_name, company")
      .eq("id", authData.user.id)
      .single();

    if (requesterError || !requesterProfile) {
      await logSecurityEvent(serviceClient, req, {
        eventType: "intro_request_profile_missing",
        severity: "warning",
        route: "send-intro",
        userId: authData.user.id,
      });
      return json({ error: "Requester profile not found" }, 403);
    }

    if (requesterProfile.role !== "founder") {
      await logSecurityEvent(serviceClient, req, {
        eventType: "intro_request_forbidden_role",
        severity: "warning",
        route: "send-intro",
        userId: authData.user.id,
        metadata: { role: requesterProfile.role },
      });
      return json({ error: "Only founders can send intro requests" }, 403);
    }

    await enforceRateLimit(serviceClient, req, {
      route: "send-intro",
      windowMs: INTRO_REQUEST_WINDOW_MS,
      maxPerIp: INTRO_REQUEST_MAX_PER_IP,
      maxPerUser: INTRO_REQUEST_MAX_PER_USER,
      userId: authData.user.id,
      eventType: "intro_request_rate_limited",
    });

    if (normalizedStartupId) {
      const { data: startupOwner, error: startupError } = await serviceClient
        .from("startup_applications")
        .select("id")
        .eq("id", normalizedStartupId)
        .eq("founder_id", authData.user.id)
        .single();

      if (startupError || !startupOwner) {
        await logSecurityEvent(serviceClient, req, {
          eventType: "intro_request_startup_ownership_failed",
          severity: "warning",
          route: "send-intro",
          userId: authData.user.id,
          metadata: { startupId: normalizedStartupId },
        });
        return json({ error: "You do not own the startup linked to this request" }, 403);
      }
    }

    const { data: targetInvestor, error: investorError } = await serviceClient
      .from("profiles")
      .select("id, role")
      .eq("id", investorId)
      .single();

    if (investorError || !targetInvestor || targetInvestor.role !== "investor") {
      await logSecurityEvent(serviceClient, req, {
        eventType: "intro_request_target_not_found",
        severity: "warning",
        route: "send-intro",
        userId: authData.user.id,
        metadata: { investorId },
      });
      return json({ error: "Investor not found" }, 404);
    }

    const introInsert: Record<string, unknown> = {
      investor_id: investorId,
      founder_id: authData.user.id,
      message,
      connector_name: connectorName,
      connector_role: connectorRole,
      connection_type: connectionType,
      status: "pending",
    };

    if (normalizedStartupId) {
      introInsert.startup_id = normalizedStartupId;
    }

    const { data: intro, error: introError } = await serviceClient
      .from("introductions")
      .insert(introInsert)
      .select("id, startup_id")
      .single();

    if (introError || !intro) {
      await logSecurityEvent(serviceClient, req, {
        eventType: "intro_request_insert_failed",
        severity: "critical",
        route: "send-intro",
        userId: authData.user.id,
        metadata: { investorId, message: introError?.message ?? "unknown" },
      });
      return json({ error: introError?.message ?? "Failed to create introduction" }, 409);
    }

    let companyName = requesterProfile.company ?? "a founder";
    if (normalizedStartupId) {
      const { data: startup } = await serviceClient
        .from("startup_applications")
        .select("company_name")
        .eq("id", normalizedStartupId)
        .single();
      companyName = startup?.company_name ?? companyName;
    }

    const founderName =
      `${requesterProfile.first_name ?? ""} ${requesterProfile.last_name ?? ""}`.trim()
      || requesterProfile.company
      || "A founder";

    await serviceClient.from("notifications").insert({
      user_id: investorId,
      type: "intro_request",
      title: `New intro request from ${founderName}`,
      body: message || `A founder wants to connect about ${companyName}.`,
      action_url: "/dashboard/introductions",
      payload: {
        intro_id: intro.id,
        founder_id: authData.user.id,
        investor_id: investorId,
        startup_id: normalizedStartupId,
        company_name: companyName,
      },
    });

    const supabaseUrlForEmail = Deno.env.get("SUPABASE_URL")!;
    fetch(`${supabaseUrlForEmail}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        to: null,
        type: "intro_request",
        data: {
          intro_id: intro.id,
          founder_name: founderName,
          company_name: companyName,
          message: message ?? "",
          investor_id: investorId,
        },
      }),
    }).catch((error) => console.error("send-email trigger error:", error));

    return json({ success: true, introId: intro.id });
  } catch (error) {
    if (error instanceof ValidationError) {
      return json({ error: error.message }, error.status);
    }
    console.error("send-intro error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
