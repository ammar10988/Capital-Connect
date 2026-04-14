import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type SecuritySeverity = "info" | "warning" | "critical";

type SecurityEventInput = {
  eventType: string;
  severity: SecuritySeverity;
  route: string;
  userId?: string | null;
  identifier?: string | null;
  metadata?: Record<string, unknown>;
};

export function getRequestIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? null;
}

export async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function getSafeErrorSummary(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  if (typeof error === "string") {
    return {
      name: "Error",
      message: error,
    };
  }

  return {
    name: "UnknownError",
    message: "Unknown error",
  };
}

export async function logSecurityEvent(
  serviceClient: SupabaseClient,
  req: Request,
  input: SecurityEventInput,
) {
  try {
    const ipAddress = getRequestIp(req);
    const identifierHash = input.identifier ? await sha256Hex(input.identifier) : null;
    const ipHash = ipAddress ? await sha256Hex(ipAddress) : null;

    await serviceClient.from("security_events").insert({
      event_type: input.eventType,
      severity: input.severity,
      route: input.route,
      user_id: input.userId ?? null,
      identifier_hash: identifierHash,
      ip_hash: ipHash,
      user_agent: req.headers.get("user-agent"),
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.error("security log error:", getSafeErrorSummary(error));
  }
}
