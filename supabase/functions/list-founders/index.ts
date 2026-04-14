import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { get, set } from "../_shared/cache.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIST_FOUNDERS_TTL_SECONDS = 5 * 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
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
      return json({ error: "Unauthorized" }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const cacheKey = "list-founders:active";
    const cached = await get<{ founders: unknown[] }>(cacheKey, serviceClient);
    if (cached) {
      return json(cached);
    }

    const { data: founders, error: foundersError } = await serviceClient
      .from("founder_profiles")
      .select(`
        id, profile_id, founder_type, company_name, sector, stage, arr, mom_growth,
        raise_amount, bio, problem_statement, target_market, website, linkedin_url,
        team_size, founded_year, funding_purpose, views_count, verification_status,
        trust_badges, pitch_deck_url, created_at,
        profile:profiles(first_name, last_name, avatar_url)
      `)
      .eq("founder_type", "active")
      .order("created_at", { ascending: false });

    if (foundersError) {
      throw foundersError;
    }

    const payload = {
      founders: founders ?? [],
    };

    await set(cacheKey, payload, LIST_FOUNDERS_TTL_SECONDS, serviceClient);
    return json(payload);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
