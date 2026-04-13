import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type IntroStatus = "accepted" | "declined" | "completed";

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

    const { introId, status, declineReason } = await req.json() as {
      introId: string;
      status: IntroStatus;
      declineReason?: string;
    };

    if (!introId || !status) {
      return json({ error: "introId and status are required" }, 400);
    }

    const allowedStatuses: IntroStatus[] = ["accepted", "declined", "completed"];
    if (!allowedStatuses.includes(status)) {
      return json({ error: `status must be one of: ${allowedStatuses.join(", ")}` }, 400);
    }

    const { data: actorProfile, error: actorError } = await serviceClient
      .from("profiles")
      .select("id, role")
      .eq("id", authData.user.id)
      .single();

    if (actorError || !actorProfile || actorProfile.role !== "investor") {
      return json({ error: "Only investors can respond to intros" }, 403);
    }

    const { data: introRow, error: introLookupError } = await serviceClient
      .from("introductions")
      .select("id, investor_id, founder_id, startup_id")
      .eq("id", introId)
      .single();

    if (introLookupError || !introRow) {
      return json({ error: "Introduction not found" }, 404);
    }

    if (introRow.investor_id !== authData.user.id) {
      return json({ error: "You do not own this introduction" }, 403);
    }

    const updatePayload: Record<string, unknown> = {
      status,
      responded_at: new Date().toISOString(),
    };
    if (status === "declined") {
      updatePayload.decline_reason = declineReason?.trim() || null;
    }

    const { error: updateError } = await serviceClient
      .from("introductions")
      .update(updatePayload)
      .eq("id", introId)
      .eq("investor_id", authData.user.id);

    if (updateError) {
      return json({ error: updateError.message }, 400);
    }

    const notifType = status === "accepted" ? "intro_accepted" : "intro_declined";
    const notifTitle = status === "accepted"
      ? "Your intro request was accepted"
      : "Your intro request was declined";
    const notifBody = status === "accepted"
      ? "An investor accepted your intro request. Open the dashboard to continue the conversation."
      : `An investor declined your intro request${declineReason ? `: "${declineReason}"` : "."}`;

    if (introRow.founder_id) {
      await serviceClient.from("notifications").insert({
        user_id: introRow.founder_id,
        type: notifType,
        title: notifTitle,
        body: notifBody,
        action_url: "/dashboard/introductions",
        payload: {
          intro_id: introId,
          investor_id: authData.user.id,
          founder_id: introRow.founder_id,
          startup_id: introRow.startup_id,
          status,
          decline_reason: declineReason?.trim() || null,
        },
      });
    }

    fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        to: null,
        type: notifType,
        data: {
          intro_id: introId,
          founder_id: introRow.founder_id,
          startup_id: introRow.startup_id,
          status,
          decline_reason: declineReason?.trim() || null,
        },
      }),
    }).catch((error) => console.error("send-email trigger error:", error));

    return json({ success: true });
  } catch (error) {
    console.error("respond-intro error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
