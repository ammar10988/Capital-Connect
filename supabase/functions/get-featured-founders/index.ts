import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { get, set } from "../_shared/cache.ts";
import { parseJsonObject, ValidationError } from "../_shared/inputValidation.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FEATURED_FOUNDERS_TTL_SECONDS = 15 * 60;

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

    const [authResult, body] = await Promise.all([
      authClient.auth.getUser(token),
      parseJsonObject(req).catch(() => ({})),
    ]);

    if (authResult.error || !authResult.data.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const requestedLimit = typeof body.limit === "number" ? body.limit : 6;
    const limit = Math.min(Math.max(requestedLimit, 1), 12);
    const cacheKey = `featured-founders:${limit}`;
    const cached = await get<{ founders: unknown[] }>(cacheKey, serviceClient);
    if (cached) {
      return json(cached);
    }

    const { data, error } = await serviceClient
      .from("founder_profiles")
      .select(`
        id, profile_id, company_name, sector, stage, arr, mom_growth, raise_amount,
        bio, team_size, views_count, verification_status, trust_badges, created_at,
        profile:profiles(first_name, last_name, avatar_url)
      `)
      .eq("founder_type", "active")
      .order("views_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit * 3);

    if (error) {
      throw error;
    }

    const founders = (data ?? [])
      .sort((left, right) => {
        const leftFeatured = left.verification_status === "verified" || (left.trust_badges?.length ?? 0) > 0;
        const rightFeatured = right.verification_status === "verified" || (right.trust_badges?.length ?? 0) > 0;
        if (leftFeatured !== rightFeatured) {
          return leftFeatured ? -1 : 1;
        }

        return (right.views_count ?? 0) - (left.views_count ?? 0);
      })
      .slice(0, limit);

    const payload = { founders };
    await set(cacheKey, payload, FEATURED_FOUNDERS_TTL_SECONDS, serviceClient);
    return json(payload);
  } catch (error) {
    if (error instanceof ValidationError) {
      return json({ error: error.message }, error.status);
    }

    return json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
