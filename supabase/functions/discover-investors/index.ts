import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { get, set } from "../_shared/cache.ts";
import { parseJsonObject, sanitizeText, ValidationError } from "../_shared/inputValidation.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCOVER_INVESTORS_TTL_SECONDS = 5 * 60;

type InvestorRecord = {
  id: string;
  name: string;
  institution?: string;
  title?: string;
  location?: string;
  sectors: string[];
  stages: string[];
  check_min?: string;
  check_max?: string;
  investment_thesis?: string;
  portfolio_count?: number;
  verified: boolean;
  response_rate?: string;
  actively_investing?: boolean;
  email?: string;
  website?: string;
  linkedin_url?: string;
  source_url?: string;
  is_new?: boolean;
  date_added?: string;
  is_platform_member?: boolean;
  avatar_url?: string;
  user_id?: string;
  inferred_type?: string;
};

type DiscoverInvestorsResponse = {
  investors: InvestorRecord[];
  totalCount: number;
};

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

function normalizeFilter(value: unknown, field: string) {
  return sanitizeText(value, field, { maxLength: 120, allowEmpty: true }) ?? "";
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
      parseJsonObject(req),
    ]);

    if (authResult.error || !authResult.data.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const sectorFilter = normalizeFilter(body.sectorFilter, "sectorFilter");
    const stageFilter = normalizeFilter(body.stageFilter, "stageFilter");
    const locationFilter = normalizeFilter(body.locationFilter, "locationFilter");

    const cacheKey = [
      "discover-investors",
      sectorFilter || "all",
      stageFilter || "all",
      locationFilter || "all",
    ].join(":");

    const cached = await get<DiscoverInvestorsResponse>(cacheKey, serviceClient);
    if (cached) {
      return json(cached);
    }

    const scrapedCountQuery = serviceClient
      .from("scraped_investors")
      .select("id", { count: "exact", head: true });
    const platformCountQuery = serviceClient
      .from("investor_profiles")
      .select("id", { count: "exact", head: true });

    let scrapedQuery = serviceClient
      .from("scraped_investors")
      .select("id, name, institution, title, location, sectors, stages, check_min, check_max, email, website, linkedin_url, response_rate, actively_investing, verified, is_new, date_added, investment_thesis")
      .order("date_added", { ascending: false })
      .limit(1000);

    let platformQuery = serviceClient
      .from("investor_profiles")
      .select(`
        id, user_id, title, location, sectors, stage_preference,
        ticket_size_min, ticket_size_max, investment_thesis,
        linkedin_url, website_url, actively_investing, is_verified,
        response_rate, portfolio_count, created_at,
        fund_name, bank_name, nbfc_name, office_name, cvc_name, parent_company,
        profile:profiles(first_name, last_name, company, avatar_url)
      `);

    if (sectorFilter) {
      scrapedQuery = scrapedQuery.contains("sectors", [sectorFilter]);
      platformQuery = platformQuery.contains("sectors", [sectorFilter]);
    }
    if (stageFilter) {
      scrapedQuery = scrapedQuery.contains("stages", [stageFilter]);
      platformQuery = platformQuery.contains("stage_preference", [stageFilter]);
    }
    if (locationFilter) {
      scrapedQuery = scrapedQuery.eq("location", locationFilter);
      platformQuery = platformQuery.eq("location", locationFilter);
    }

    const [scrapedCount, platformCount, scrapedRes, platformRes] = await Promise.all([
      scrapedCountQuery,
      platformCountQuery,
      scrapedQuery,
      platformQuery,
    ]);

    if (scrapedRes.error) throw scrapedRes.error;
    if (platformRes.error) throw platformRes.error;

    const scraped: InvestorRecord[] = (scrapedRes.data ?? []).map((row) => ({
      ...row,
      sectors: row.sectors ?? [],
      stages: row.stages ?? [],
      is_platform_member: false,
    }));

    const platform: InvestorRecord[] = (platformRes.data ?? []).map((row) => {
      const profile = row.profile as {
        first_name: string;
        last_name: string | null;
        company: string | null;
        avatar_url: string | null;
      } | null;
      const institution = row.fund_name || row.bank_name || row.nbfc_name || row.office_name ||
        row.cvc_name || row.parent_company || profile?.company || "";
      const fullName = profile ? `${profile.first_name} ${profile.last_name ?? ""}`.trim() : "";

      return {
        id: `platform_${row.id}`,
        name: fullName || institution || "Capital Connect Investor",
        institution: institution || undefined,
        title: row.title || undefined,
        location: row.location || undefined,
        sectors: row.sectors ?? [],
        stages: row.stage_preference ?? [],
        check_min: row.ticket_size_min != null ? String(row.ticket_size_min) : undefined,
        check_max: row.ticket_size_max != null ? String(row.ticket_size_max) : undefined,
        investment_thesis: row.investment_thesis || undefined,
        portfolio_count: row.portfolio_count ?? 0,
        verified: row.is_verified ?? false,
        response_rate: row.response_rate || undefined,
        actively_investing: row.actively_investing ?? true,
        website: row.website_url || undefined,
        linkedin_url: row.linkedin_url || undefined,
        is_new: false,
        date_added: row.created_at,
        is_platform_member: true,
        avatar_url: profile?.avatar_url || undefined,
        user_id: row.user_id,
        inferred_type: row.fund_name
          ? "VC"
          : row.bank_name
          ? "Bank"
          : row.nbfc_name
          ? "NBFC"
          : row.office_name
          ? "Family Office"
          : row.cvc_name
          ? "CVC"
          : "Angel",
      };
    });

    const payload: DiscoverInvestorsResponse = {
      investors: [...platform, ...scraped],
      totalCount: (scrapedCount.count ?? 0) + (platformCount.count ?? 0),
    };

    await set(cacheKey, payload, DISCOVER_INVESTORS_TTL_SECONDS, serviceClient);
    return json(payload);
  } catch (error) {
    if (error instanceof ValidationError) {
      return json({ error: error.message }, error.status);
    }

    return json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
