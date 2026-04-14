import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/abuseProtection.ts";
import { fetchWithTimeout } from "../_shared/fetchWithTimeout.ts";
import {
  parseJsonObject,
  requireEmail,
  requireEnum,
  sanitizeText,
  ValidationError,
} from "../_shared/inputValidation.ts";
import { getSafeErrorSummary, logSecurityEvent } from "../_shared/security.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const SUBJECT_OPTIONS = [
  "General Inquiry",
  "Billing",
  "Technical Issue",
  "Partnership",
] as const;

const ROUTE = "support-contact";
const SUPPORT_WINDOW_MS = 60 * 60 * 1000;
const SUPPORT_MAX_PER_USER = 3;
const SUPPORT_MAX_PER_IP = 6;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });
}

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role environment variables are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient.auth.getUser(token);

  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  return {
    serviceClient,
    user: data.user,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const [{ serviceClient, user }, body] = await Promise.all([
      requireAuthenticatedUser(req),
      parseJsonObject(req),
    ]);

    await enforceRateLimit(serviceClient, req, {
      route: ROUTE,
      windowMs: SUPPORT_WINDOW_MS,
      maxPerIp: SUPPORT_MAX_PER_IP,
      maxPerUser: SUPPORT_MAX_PER_USER,
      userId: user.id,
      identifier: user.email ?? user.id,
      eventType: "support_contact_rate_limited",
    });

    const name = sanitizeText(body.name, "name", { minLength: 2, maxLength: 120 }) ?? "";
    const email = requireEmail(body.email, "email");
    const subject = requireEnum(body.subject, "subject", SUBJECT_OPTIONS);
    const message = sanitizeText(body.message, "message", {
      minLength: 10,
      maxLength: 5000,
      multiline: true,
    }) ?? "";

    const { data: insertedTicket, error: insertError } = await serviceClient
      .from("support_tickets")
      .insert({
        user_id: user.id,
        name,
        email,
        subject,
        message,
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    const supportRecipient =
      Deno.env.get("SUPPORT_NOTIFICATION_EMAIL") ??
      Deno.env.get("SUPPORT_CONTACT_EMAIL") ??
      "support@investligence.app";

    const sendEmailUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!serviceRoleKey) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    }

    const sendEmailResponse = await fetchWithTimeout(sendEmailUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        type: "support_contact",
        to: supportRecipient,
        data: {
          ticket_id: insertedTicket.id,
          user_id: user.id,
          name,
          email,
          subject,
          message,
        },
      }),
    });

    if (!sendEmailResponse.ok) {
      const detail = await sendEmailResponse.text();
      await logSecurityEvent(serviceClient, req, {
        eventType: "support_contact_email_failed",
        severity: "warning",
        route: ROUTE,
        userId: user.id,
        identifier: email,
        metadata: {
          ticket_id: insertedTicket.id,
          status: sendEmailResponse.status,
          detail: detail.slice(0, 500),
        },
      });
    }

    return json({
      success: true,
      ticketId: insertedTicket.id,
      message: "We'll get back to you within 24 hours",
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return json({ error: error.message }, error.status);
    }

    if (error instanceof Response) {
      return error;
    }

    console.error("support-contact error:", getSafeErrorSummary(error));

    try {
      const serviceClient = createServiceClient();
      await logSecurityEvent(serviceClient, req, {
        eventType: "support_contact_internal_error",
        severity: "critical",
        route: ROUTE,
        metadata: getSafeErrorSummary(error),
      });
    } catch {
      // Ignore nested logging failures.
    }

    return json({ error: "Internal server error" }, 500);
  }
});
