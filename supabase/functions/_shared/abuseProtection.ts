import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRequestIp, logSecurityEvent, sha256Hex } from "./security.ts";

const RATE_LIMIT_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RateLimitConfig = {
  route: string;
  windowMs: number;
  maxPerIp: number;
  maxPerUser?: number;
  maxPerIdentifier?: number;
  userId?: string | null;
  identifier?: string | null;
  eventType?: string;
};

export function isServiceRoleBearer(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!authHeader?.startsWith("Bearer ") || !serviceRoleKey) {
    return false;
  }

  return authHeader.slice("Bearer ".length).trim() === serviceRoleKey;
}

export async function enforceRateLimit(
  serviceClient: SupabaseClient,
  req: Request,
  config: RateLimitConfig,
) {
  const ipAddress = getRequestIp(req);
  const ipHash = ipAddress ? await sha256Hex(ipAddress) : null;
  const identifierHash = config.identifier ? await sha256Hex(config.identifier) : null;
  const since = new Date(Date.now() - config.windowMs).toISOString();

  const checks: Array<Promise<{ count: number | null }>> = [
    ipHash
      ? serviceClient
        .from("request_rate_limits")
        .select("*", { count: "exact", head: true })
        .eq("route", config.route)
        .eq("ip_hash", ipHash)
        .gte("created_at", since)
      : Promise.resolve({ count: 0 }),
    config.userId
      ? serviceClient
        .from("request_rate_limits")
        .select("*", { count: "exact", head: true })
        .eq("route", config.route)
        .eq("user_id", config.userId)
        .gte("created_at", since)
      : Promise.resolve({ count: 0 }),
    identifierHash
      ? serviceClient
        .from("request_rate_limits")
        .select("*", { count: "exact", head: true })
        .eq("route", config.route)
        .eq("identifier_hash", identifierHash)
        .gte("created_at", since)
      : Promise.resolve({ count: 0 }),
  ];

  const [ipResult, userResult, identifierResult] = await Promise.all(checks);
  const ipCount = ipResult.count ?? 0;
  const userCount = userResult.count ?? 0;
  const identifierCount = identifierResult.count ?? 0;

  if (
    (config.maxPerIp > 0 && ipCount >= config.maxPerIp)
    || (config.maxPerUser && userCount >= config.maxPerUser)
    || (config.maxPerIdentifier && identifierCount >= config.maxPerIdentifier)
  ) {
    await logSecurityEvent(serviceClient, req, {
      eventType: config.eventType ?? "rate_limit_exceeded",
      severity: "critical",
      route: config.route,
      userId: config.userId ?? null,
      identifier: config.identifier ?? null,
      metadata: {
        window_ms: config.windowMs,
        max_per_ip: config.maxPerIp,
        max_per_user: config.maxPerUser ?? null,
        max_per_identifier: config.maxPerIdentifier ?? null,
        ip_count: ipCount,
        user_count: userCount,
        identifier_count: identifierCount,
      },
    });

    throw new Response(
      JSON.stringify({
        error: "Too many requests",
        code: "rate_limit_exceeded",
        retry_after_seconds: Math.ceil(config.windowMs / 1000),
      }),
      {
        status: 429,
        headers: RATE_LIMIT_HEADERS,
      },
    );
  }

  await serviceClient.from("request_rate_limits").insert({
    route: config.route,
    user_id: config.userId ?? null,
    identifier_hash: identifierHash,
    ip_hash: ipHash,
  });
}
