import Stripe from "npm:stripe@22.0.1";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseJsonObject, requireEnum, requireUuid, ValidationError } from "./inputValidation.ts";

export const BILLING_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

export type BillingPlan = "free" | "pro" | "enterprise";
export type BillingRole = "founder" | "investor";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";

type AuthenticatedUser = {
  id: string;
  email: string | null;
};

type SubscriptionUpdate = {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  plan?: BillingPlan;
  role?: BillingRole | null;
  status?: SubscriptionStatus;
  current_period_end?: string | null;
  failed_payment_attempts?: number;
  suspended_at?: string | null;
};

export function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...BILLING_CORS_HEADERS,
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

export function getStripeClient() {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(stripeSecretKey);
}

export function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role environment variables are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getAppUrl(req?: Request, fallbackPath = "/dashboard/settings/billing") {
  const explicit = Deno.env.get("APP_URL")
    ?? Deno.env.get("SITE_URL")
    ?? Deno.env.get("VITE_APP_URL");

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const origin = req?.headers.get("origin");
  if (origin) {
    return origin.replace(/\/$/, "");
  }

  return `http://localhost:5173${fallbackPath.startsWith("/") ? "" : "/"}${fallbackPath}`;
}

export async function requireAuthenticatedUser(
  req: Request,
  serviceClient: SupabaseClient,
): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        ...BILLING_CORS_HEADERS,
        "Content-Type": "application/json",
      },
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const { data, error } = await serviceClient.auth.getUser(token);
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        ...BILLING_CORS_HEADERS,
        "Content-Type": "application/json",
      },
    });
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}

export async function parseCheckoutBody(req: Request) {
  const body = await parseJsonObject(req);
  return {
    priceId: String(body.priceId ?? "").trim(),
    userId: requireUuid(body.userId, "userId"),
    role: requireEnum(body.role, "role", ["founder", "investor"] as const),
  };
}

export async function parsePortalBody(req: Request) {
  const body = await parseJsonObject(req);
  return {
    userId: requireUuid(body.userId, "userId"),
  };
}

export function getPlanFromSubscription(
  subscription: Stripe.Subscription | null | undefined,
): BillingPlan | null {
  const metadataPlan = subscription?.metadata?.plan;
  if (metadataPlan === "free" || metadataPlan === "pro" || metadataPlan === "enterprise") {
    return metadataPlan;
  }

  const lookup = subscription?.items.data[0]?.price.lookup_key;
  if (lookup?.includes("enterprise")) return "enterprise";
  if (lookup?.includes("pro")) return "pro";

  const nickname = subscription?.items.data[0]?.price.nickname?.toLowerCase() ?? "";
  if (nickname.includes("enterprise")) return "enterprise";
  if (nickname.includes("pro")) return "pro";

  return null;
}

export function getRoleFromSubscription(
  subscription: Stripe.Subscription | null | undefined,
): BillingRole | null {
  const metadataRole = subscription?.metadata?.role;
  if (metadataRole === "founder" || metadataRole === "investor") {
    return metadataRole;
  }

  const lookup = subscription?.items.data[0]?.price.lookup_key?.toLowerCase() ?? "";
  if (lookup.includes("founder")) return "founder";
  if (lookup.includes("investor")) return "investor";

  const nickname = subscription?.items.data[0]?.price.nickname?.toLowerCase() ?? "";
  if (nickname.includes("founder")) return "founder";
  if (nickname.includes("investor")) return "investor";

  return null;
}

export async function ensureStripeCustomer(input: {
  serviceClient: SupabaseClient;
  stripe: Stripe;
  userId: string;
  email: string | null;
  role: BillingRole | null;
}) {
  const { data: existingSubscription, error } = await input.serviceClient
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const existingCustomerId = existingSubscription?.stripe_customer_id ?? null;
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const customer = await input.stripe.customers.create({
    email: input.email ?? undefined,
    metadata: {
      user_id: input.userId,
      role: input.role ?? "",
    },
  });

  const { error: updateError } = await input.serviceClient
    .from("subscriptions")
    .upsert(
      {
        user_id: input.userId,
        stripe_customer_id: customer.id,
        role: input.role,
      },
      { onConflict: "user_id" },
    );

  if (updateError) {
    throw new Error(updateError.message);
  }

  return customer.id;
}

export async function upsertSubscription(
  serviceClient: SupabaseClient,
  userId: string,
  update: SubscriptionUpdate,
) {
  const payload = {
    user_id: userId,
    ...update,
    updated_at: new Date().toISOString(),
  };

  const { error } = await serviceClient
    .from("subscriptions")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getUserIdForCustomer(
  serviceClient: SupabaseClient,
  stripeCustomerId: string | null | undefined,
) {
  if (!stripeCustomerId) return null;

  const { data, error } = await serviceClient
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.user_id ?? null;
}

export async function getUserIdForSubscription(
  serviceClient: SupabaseClient,
  stripeSubscriptionId: string | null | undefined,
) {
  if (!stripeSubscriptionId) return null;

  const { data, error } = await serviceClient
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.user_id ?? null;
}

export async function insertBillingNotification(
  serviceClient: SupabaseClient,
  userId: string,
  input: {
    title: string;
    body: string;
    actionUrl?: string;
    payload?: Record<string, unknown>;
  },
) {
  const { error } = await serviceClient.from("notifications").insert({
    user_id: userId,
    type: "system",
    title: input.title,
    body: input.body,
    action_url: input.actionUrl ?? "/dashboard/settings/billing",
    payload: input.payload ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function asIsoFromUnix(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

export function isStripeSubscriptionStatus(
  status: string | null | undefined,
): status is SubscriptionStatus {
  return status === "active" || status === "canceled" || status === "past_due" || status === "trialing";
}

export function getPlanFromMetadata(
  value: string | null | undefined,
): BillingPlan | null {
  if (value === "free" || value === "pro" || value === "enterprise") {
    return value;
  }

  return null;
}

export function getRoleFromMetadata(
  value: string | null | undefined,
): BillingRole | null {
  if (value === "founder" || value === "investor") {
    return value;
  }

  return null;
}

export async function readRawBody(req: Request) {
  return await req.text();
}

export function toValidationResponse(error: unknown) {
  if (error instanceof ValidationError) {
    return json({ error: error.message }, error.status);
  }
  if (error instanceof Response) {
    return error;
  }

  return null;
}
