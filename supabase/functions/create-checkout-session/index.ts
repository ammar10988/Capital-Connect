import { enforceRateLimit } from "../_shared/abuseProtection.ts";
import {
  BILLING_CORS_HEADERS,
  createServiceClient,
  ensureStripeCustomer,
  getAppUrl,
  getStripeClient,
  json,
  parseCheckoutBody,
  requireAuthenticatedUser,
  toValidationResponse,
} from "../_shared/stripeBilling.ts";

const CHECKOUT_WINDOW_MS = 60 * 60 * 1000;
const CHECKOUT_MAX_PER_USER = 10;
const CHECKOUT_MAX_PER_IP = 25;

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
    const [authUser, { priceId, userId, role }] = await Promise.all([
      requireAuthenticatedUser(req, serviceClient),
      parseCheckoutBody(req),
    ]);

    if (!priceId) {
      return json({ error: "priceId is required" }, 400);
    }

    if (authUser.id !== userId) {
      return json({ error: "You can only create checkout sessions for your own account." }, 403);
    }

    await enforceRateLimit(serviceClient, req, {
      route: "create-checkout-session",
      windowMs: CHECKOUT_WINDOW_MS,
      maxPerIp: CHECKOUT_MAX_PER_IP,
      maxPerUser: CHECKOUT_MAX_PER_USER,
      userId,
      eventType: "billing_checkout_rate_limited",
    });

    const customerId = await ensureStripeCustomer({
      serviceClient,
      stripe,
      userId,
      email: authUser.email,
      role,
    });

    const appUrl = getAppUrl(req);
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}/dashboard/settings/billing?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      metadata: {
        user_id: userId,
        role,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          role,
        },
      },
    });

    return json({ url: checkoutSession.url });
  } catch (error) {
    const handled = toValidationResponse(error);
    if (handled) return handled;

    console.error("create-checkout-session error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
