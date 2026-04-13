import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      return json({ error: "Unauthorized" }, 401);
    }

    const {
      investorId: rawInvestorId,
      investor_id: legacyInvestorId,
      startupId,
      startup_id: legacyStartupId,
      message,
      connectorName,
      connectorRole,
      connectionType,
    } = await req.json() as {
      investorId?: string;
      investor_id?: string;
      startupId?: string;
      startup_id?: string;
      message?: string;
      connectorName?: string;
      connectorRole?: string;
      connectionType?: "mutual" | "advisor" | "linkedin";
    };

    const investorId = (rawInvestorId ?? legacyInvestorId ?? "").replace(/^platform_/, "");
    const normalizedStartupId = legacyStartupId ?? startupId ?? null;

    if (!investorId) {
      return json({ error: "investorId is required" }, 400);
    }

    const { data: requesterProfile, error: requesterError } = await serviceClient
      .from("profiles")
      .select("id, role, first_name, last_name, company")
      .eq("id", authData.user.id)
      .single();

    if (requesterError || !requesterProfile) {
      return json({ error: "Requester profile not found" }, 403);
    }

    if (requesterProfile.role !== "founder") {
      return json({ error: "Only founders can send intro requests" }, 403);
    }

    if (normalizedStartupId) {
      const { data: startupOwner, error: startupError } = await serviceClient
        .from("startup_applications")
        .select("id")
        .eq("id", normalizedStartupId)
        .eq("founder_id", authData.user.id)
        .single();

      if (startupError || !startupOwner) {
        return json({ error: "You do not own the startup linked to this request" }, 403);
      }
    }

    const { data: targetInvestor, error: investorError } = await serviceClient
      .from("profiles")
      .select("id, role")
      .eq("id", investorId)
      .single();

    if (investorError || !targetInvestor || targetInvestor.role !== "investor") {
      return json({ error: "Investor not found" }, 404);
    }

    const introInsert: Record<string, unknown> = {
      investor_id: investorId,
      founder_id: authData.user.id,
      message: message?.trim() || null,
      connector_name: connectorName ?? null,
      connector_role: connectorRole ?? null,
      connection_type: connectionType ?? null,
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
      body: message?.trim() || `A founder wants to connect about ${companyName}.`,
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
          message: message?.trim() ?? "",
          investor_id: investorId,
        },
      }),
    }).catch((error) => console.error("send-email trigger error:", error));

    return json({ success: true, introId: intro.id });
  } catch (error) {
    console.error("send-intro error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
