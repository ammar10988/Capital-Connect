import { enforceRateLimit } from "../_shared/abuseProtection.ts";
import {
  BILLING_CORS_HEADERS,
  createServiceClient,
  getAppUrl,
  getStripeClient,
  json,
  parsePortalBody,
  requireAuthenticatedUser,
  toValidationResponse,
} from "../_shared/stripeBilling.ts";

const PORTAL_WINDOW_MS = 60 * 60 * 1000;
const PORTAL_MAX_PER_USER = 20;
const PORTAL_MAX_PER_IP = 40;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: BILLING_CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const serviceClient = createServiceClient();
    const stripe = getStripeClient();
    const [authUser, { userId }] = await Promise.all([
      requireAuthenticatedUser(req, serviceClient),
      parsePortalBody(req),
    ]);

    if (authUser.id !== userId) {
      return json({ error: "You can only open the billing portal for your own account." }, 403);
    }

    await enforceRateLimit(serviceClient, req, {
      route: "create-portal-session",
      windowMs: PORTAL_WINDOW_MS,
      maxPerIp: PORTAL_MAX_PER_IP,
      maxPerUser: PORTAL_MAX_PER_USER,
      userId,
      eventType: "billing_portal_rate_limited",
    });

    const { data, error } = await serviceClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.stripe_customer_id) {
      return json(
        { error: "No Stripe billing profile exists yet. Choose a paid plan first." },
        400,
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${getAppUrl(req)}/dashboard/settings/billing`,
    });

    return json({ url: portalSession.url });
  } catch (error) {
    const handled = toValidationResponse(error);
    if (handled) return handled;

    console.error("create-portal-session error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
