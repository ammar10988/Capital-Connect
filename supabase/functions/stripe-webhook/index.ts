import Stripe from "npm:stripe@22.0.1";
import {
  BILLING_CORS_HEADERS,
  asIsoFromUnix,
  createServiceClient,
  getAppUrl,
  getPlanFromMetadata,
  getPlanFromSubscription,
  getRoleFromMetadata,
  getRoleFromSubscription,
  getStripeClient,
  getUserIdForCustomer,
  getUserIdForSubscription,
  insertBillingNotification,
  isStripeSubscriptionStatus,
  json,
  readRawBody,
  toValidationResponse,
  upsertSubscription,
} from "../_shared/stripeBilling.ts";

async function handleCheckoutCompleted(
  serviceClient: ReturnType<typeof createServiceClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.user_id;
  const role = getRoleFromMetadata(session.metadata?.role);
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!userId || !subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscription(serviceClient, userId, {
    stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
    stripe_subscription_id: subscription.id,
    plan: getPlanFromSubscription(subscription) ?? "pro",
    role,
    status: isStripeSubscriptionStatus(subscription.status) ? subscription.status : "active",
    current_period_end: asIsoFromUnix(subscription.current_period_end),
    failed_payment_attempts: 0,
    suspended_at: null,
  });
}

async function handleInvoicePaid(
  serviceClient: ReturnType<typeof createServiceClient>,
  stripe: Stripe,
  invoice: Stripe.Invoice,
) {
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  let userId =
    await getUserIdForSubscription(serviceClient, subscriptionId)
    ?? await getUserIdForCustomer(
      serviceClient,
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id,
    );

  let subscription: Stripe.Subscription | null = null;
  if (subscriptionId) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
    userId = userId ?? subscription.metadata.user_id ?? null;
  }

  if (!userId) return;

  await serviceClient.from("invoices").upsert({
    user_id: userId,
    stripe_invoice_id: invoice.id,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status,
    invoice_pdf: invoice.invoice_pdf,
  }, { onConflict: "stripe_invoice_id" });

  await upsertSubscription(serviceClient, userId, {
    stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null,
    stripe_subscription_id: subscriptionId ?? null,
    plan: getPlanFromSubscription(subscription) ?? getPlanFromMetadata(invoice.parent?.subscription_details?.metadata?.plan) ?? "pro",
    role: getRoleFromSubscription(subscription) ?? getRoleFromMetadata(invoice.parent?.subscription_details?.metadata?.role),
    status: subscription && isStripeSubscriptionStatus(subscription.status) ? subscription.status : "active",
    current_period_end: subscription ? asIsoFromUnix(subscription.current_period_end) : null,
    failed_payment_attempts: 0,
    suspended_at: null,
  });
}

async function handleInvoiceFailed(
  serviceClient: ReturnType<typeof createServiceClient>,
  stripe: Stripe,
  invoice: Stripe.Invoice,
) {
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  let userId =
    await getUserIdForSubscription(serviceClient, subscriptionId)
    ?? await getUserIdForCustomer(
      serviceClient,
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id,
    );

  let subscription: Stripe.Subscription | null = null;
  if (subscriptionId) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
    userId = userId ?? subscription.metadata.user_id ?? null;
  }

  if (!userId) return;

  const { data: existing, error } = await serviceClient
    .from("subscriptions")
    .select("failed_payment_attempts")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const failedAttempts = (existing?.failed_payment_attempts ?? 0) + 1;
  const suspendedAt = failedAttempts >= 3 ? new Date().toISOString() : null;
  const appUrl = getAppUrl(undefined);

  await upsertSubscription(serviceClient, userId, {
    stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null,
    stripe_subscription_id: subscriptionId ?? null,
    plan: getPlanFromSubscription(subscription) ?? getPlanFromMetadata(invoice.parent?.subscription_details?.metadata?.plan) ?? "pro",
    role: getRoleFromSubscription(subscription) ?? getRoleFromMetadata(invoice.parent?.subscription_details?.metadata?.role),
    status: "past_due",
    current_period_end: subscription ? asIsoFromUnix(subscription.current_period_end) : null,
    failed_payment_attempts: failedAttempts,
    suspended_at: suspendedAt,
  });

  await insertBillingNotification(serviceClient, userId, {
    title: failedAttempts >= 3 ? "Billing suspended" : "Payment failed",
    body: failedAttempts >= 3
      ? "Your payment failed three times. Update your billing information to restore access."
      : `Your payment attempt failed. Attempt ${failedAttempts} of 3 has been recorded. Update your billing details to avoid suspension.`,
    actionUrl: `${appUrl}/dashboard/settings/billing`,
    payload: {
      stripe_invoice_id: invoice.id,
      failed_attempts: failedAttempts,
      suspended: failedAttempts >= 3,
    },
  });
}

async function handleSubscriptionDeleted(
  serviceClient: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription,
) {
  const userId =
    subscription.metadata.user_id
    ?? await getUserIdForSubscription(serviceClient, subscription.id)
    ?? await getUserIdForCustomer(serviceClient, typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id);

  if (!userId) return;

  await upsertSubscription(serviceClient, userId, {
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
    stripe_subscription_id: subscription.id,
    plan: "free",
    role: getRoleFromSubscription(subscription),
    status: "canceled",
    current_period_end: asIsoFromUnix(subscription.current_period_end),
  });
}

async function handleSubscriptionUpdated(
  serviceClient: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription,
) {
  const userId =
    subscription.metadata.user_id
    ?? await getUserIdForSubscription(serviceClient, subscription.id)
    ?? await getUserIdForCustomer(serviceClient, typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id);

  if (!userId) return;

  const status = isStripeSubscriptionStatus(subscription.status)
    ? subscription.status
    : "active";
  const shouldDowngrade = status === "canceled" && subscription.cancel_at_period_end === false;

  await upsertSubscription(serviceClient, userId, {
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
    stripe_subscription_id: subscription.id,
    plan: shouldDowngrade ? "free" : (getPlanFromSubscription(subscription) ?? "pro"),
    role: getRoleFromSubscription(subscription),
    status,
    current_period_end: asIsoFromUnix(subscription.current_period_end),
    failed_payment_attempts: status === "active" || status === "trialing" ? 0 : undefined,
    suspended_at: status === "active" || status === "trialing" ? null : undefined,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: BILLING_CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const stripe = getStripeClient();
    const serviceClient = createServiceClient();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!webhookSecret) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return json({ error: "Missing Stripe signature" }, 400);
    }

    const rawBody = await readRawBody(req);
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(serviceClient, stripe, event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaid(serviceClient, stripe, event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoiceFailed(serviceClient, stripe, event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(serviceClient, event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(serviceClient, event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }

    return json({ received: true });
  } catch (error) {
    const handled = toValidationResponse(error);
    if (handled) return handled;

    console.error("stripe-webhook error:", error);
    return json({ error: error instanceof Error ? error.message : "Webhook handling failed" }, 400);
  }
});
