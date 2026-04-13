import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  escapeHtml,
  parseJsonObject,
  requireEmail,
  requireEnum,
  requireUuid,
  sanitizeText,
  ValidationError,
} from "../_shared/inputValidation.ts";
import { logSecurityEvent } from "../_shared/security.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_ADDRESS = "InvestLigence <noreply@investligence.app>";
const APP_URL = "https://app.investligence.app";

function isAuthorizedServiceCall(req: Request): boolean {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!authHeader?.startsWith("Bearer ") || !serviceRoleKey) {
    return false;
  }

  return authHeader.slice("Bearer ".length).trim() === serviceRoleKey;
}

// ---------------------------------------------------------------------------
// Email template builders
// ---------------------------------------------------------------------------
type EmailTemplate = { subject: string; html: string; text: string };

function baseHtml(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InvestLigence</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1117; color: #e2e8f0; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #1a1f2e; border-radius: 12px; overflow: hidden; border: 1px solid #2d3748; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 40px; }
    .body h2 { color: #f7fafc; font-size: 20px; margin: 0 0 16px; }
    .body p { color: #a0aec0; line-height: 1.7; margin: 0 0 16px; font-size: 15px; }
    .highlight { background: #252d3d; border-left: 3px solid #6366f1; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; color: #cbd5e0; font-style: italic; }
    .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 8px 0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-left: 8px; }
    .badge-success { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
    .badge-danger  { background: rgba(239, 68, 68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
    .badge-info    { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }
    .footer { padding: 24px 40px; border-top: 1px solid #2d3748; text-align: center; color: #4a5568; font-size: 13px; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>InvestLigence</h1>
      <p>India's Intelligent Investment Platform</p>
    </div>
    <div class="body">${bodyContent}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} InvestLigence · <a href="${APP_URL}">investligence.app</a></p>
      <p>You're receiving this because you're a member of InvestLigence.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildTemplate(type: string, data: Record<string, unknown>): EmailTemplate {
  switch (type) {
    case "intro_request": {
      const investorName = escapeHtml(String(data.investor_name ?? "An investor"));
      const companyName = escapeHtml(String(data.company_name ?? "your startup"));
      const message = data.message ? escapeHtml(String(data.message)) : null;
      const introId = String(data.intro_id ?? "");
      return {
        subject: `Introduction Request from ${investorName} — ${companyName}`,
        html: baseHtml(`
          <h2>New Introduction Request</h2>
          <p>Hello,</p>
          <p><strong>${investorName}</strong> has sent an introduction request for <strong>${companyName}</strong> on InvestLigence.</p>
          ${message ? `<div class="highlight">"${message}"</div>` : ""}
          <p>Review the request and respond within 14 days to keep the conversation moving forward.</p>
          <a href="${APP_URL}/dashboard/introductions/${introId}" class="cta">Review Introduction Request</a>
        `),
        text: `New Introduction Request\n\n${investorName} has sent an introduction request for ${companyName}.\n\n${message ? `Message: "${message}"\n\n` : ""}Review it at: ${APP_URL}/dashboard/introductions/${introId}`,
      };
    }

    case "intro_accepted": {
      const companyName = escapeHtml(String(data.company_name ?? "The startup"));
      const introId = String(data.intro_id ?? "");
      return {
        subject: `${companyName} accepted your introduction request`,
        html: baseHtml(`
          <h2>Introduction Accepted <span class="badge badge-success">Accepted</span></h2>
          <p>Hello,</p>
          <p>Great news! <strong>${companyName}</strong> has accepted your introduction request on InvestLigence.</p>
          <p>You can now connect with the founding team directly. Head to your dashboard to view contact details and next steps.</p>
          <a href="${APP_URL}/dashboard/introductions/${introId}" class="cta">View Introduction Details</a>
        `),
        text: `${companyName} has accepted your introduction request.\n\nView details at: ${APP_URL}/dashboard/introductions/${introId}`,
      };
    }

    case "intro_declined": {
      const companyName = escapeHtml(String(data.company_name ?? "The startup"));
      const declineReason = data.decline_reason ? escapeHtml(String(data.decline_reason)) : null;
      const introId = String(data.intro_id ?? "");
      return {
        subject: `${companyName} declined your introduction request`,
        html: baseHtml(`
          <h2>Introduction Declined <span class="badge badge-danger">Declined</span></h2>
          <p>Hello,</p>
          <p><strong>${companyName}</strong> has declined your introduction request on InvestLigence.</p>
          ${declineReason ? `<div class="highlight">"${declineReason}"</div>` : ""}
          <p>Don't worry — there are hundreds of other curated startups on the platform. Explore our latest deals below.</p>
          <a href="${APP_URL}/dashboard/discover" class="cta">Discover More Startups</a>
        `),
        text: `${companyName} has declined your introduction request.${declineReason ? `\n\nReason: "${declineReason}"` : ""}\n\nDiscover more startups at: ${APP_URL}/dashboard/discover`,
      };
    }

    case "application_status": {
      const companyName = escapeHtml(String(data.company_name ?? "Your startup"));
      const newStatus = escapeHtml(String(data.status ?? "updated"));
      const adminNotes = data.admin_notes ? escapeHtml(String(data.admin_notes)) : null;
      const isApproved = newStatus === "approved";
      return {
        subject: `Application Update: ${companyName} is ${newStatus}`,
        html: baseHtml(`
          <h2>Application Status Update <span class="badge ${isApproved ? "badge-success" : "badge-info"}">${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</span></h2>
          <p>Hello,</p>
          <p>The status of your startup application for <strong>${companyName}</strong> has been updated to <strong>${newStatus}</strong>.</p>
          ${adminNotes ? `<div class="highlight">${adminNotes}</div>` : ""}
          ${isApproved
            ? "<p>Congratulations! Your startup profile is now live and visible to investors on the InvestLigence platform. Start getting introductions today.</p>"
            : "<p>Please review the feedback and update your application accordingly. Our team is here to help you succeed.</p>"
          }
          <a href="${APP_URL}/dashboard/application" class="cta">View Application</a>
        `),
        text: `Application Update: ${companyName} is now ${newStatus}.${adminNotes ? `\n\nNotes: ${adminNotes}` : ""}\n\nView at: ${APP_URL}/dashboard/application`,
      };
    }

    case "trust_badge_upgrade": {
      const companyName = escapeHtml(String(data.company_name ?? "Your startup"));
      const badgeName = escapeHtml(String(data.badge_name ?? "Top Startup"));
      return {
        subject: `Your Trust Badge upgraded to "${badgeName}" — ${companyName}`,
        html: baseHtml(`
          <h2>Trust Badge Upgrade <span class="badge badge-success">${badgeName}</span></h2>
          <p>Hello,</p>
          <p>We're thrilled to inform you that <strong>${companyName}</strong>'s Trust Badge has been upgraded to <strong>${badgeName}</strong>!</p>
          <p>This badge is displayed prominently on your startup profile, increasing visibility and credibility with investors. Profiles with upgraded badges receive 3x more introduction requests on average.</p>
          <a href="${APP_URL}/dashboard/profile" class="cta">View Your Profile</a>
        `),
        text: `Trust Badge Upgrade: ${companyName} now has the "${badgeName}" badge.\n\nView your profile at: ${APP_URL}/dashboard/profile`,
      };
    }

    case "event_rsvp": {
      const eventTitle = escapeHtml(String(data.event_title ?? "the event"));
      const eventDate = escapeHtml(String(data.event_date ?? ""));
      const eventLocation = escapeHtml(String(data.event_location ?? ""));
      const eventId = String(data.event_id ?? "");
      const isVirtual = Boolean(data.is_virtual);
      return {
        subject: `RSVP Confirmed: ${eventTitle}`,
        html: baseHtml(`
          <h2>You're Going! <span class="badge badge-success">RSVP Confirmed</span></h2>
          <p>Hello,</p>
          <p>Your RSVP for <strong>${eventTitle}</strong> has been confirmed.</p>
          <table style="width:100%; border-collapse:collapse; margin:20px 0;">
            <tr><td style="color:#6b7280; padding:8px 0; font-size:14px; width:120px;">Date</td><td style="color:#e2e8f0; font-size:14px;">${eventDate}</td></tr>
            <tr><td style="color:#6b7280; padding:8px 0; font-size:14px;">Location</td><td style="color:#e2e8f0; font-size:14px;">${isVirtual ? "Online (link will be sent)" : eventLocation}</td></tr>
          </table>
          <p>Add this event to your calendar and check for updates on the events page.</p>
          <a href="${APP_URL}/dashboard/events/${eventId}" class="cta">View Event Details</a>
        `),
        text: `RSVP Confirmed: ${eventTitle}\n\nDate: ${eventDate}\nLocation: ${isVirtual ? "Online" : eventLocation}\n\nView event at: ${APP_URL}/dashboard/events/${eventId}`,
      };
    }

    default:
      return {
        subject: "InvestLigence Notification",
        html: baseHtml(`<h2>Notification</h2><p>You have a new notification on InvestLigence.</p><a href="${APP_URL}/dashboard" class="cta">Go to Dashboard</a>`),
        text: `You have a new notification on InvestLigence. Visit: ${APP_URL}/dashboard`,
      };
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    if (!isAuthorizedServiceCall(req)) {
      await logSecurityEvent(serviceClient, req, {
        eventType: "email_send_unauthorized",
        severity: "critical",
        route: "send-email",
      });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body = await parseJsonObject(req);
    const type = requireEnum(body.type, "type", [
      "intro_request",
      "intro_accepted",
      "intro_declined",
      "application_status",
      "trust_badge_upgrade",
      "event_rsvp",
    ] as const);
    const to = body.to == null ? null : requireEmail(body.to, "to");
    const data = typeof body.data === "object" && body.data !== null && !Array.isArray(body.data)
      ? body.data as Record<string, unknown>
      : {};

    if (data.intro_id != null) requireUuid(data.intro_id, "data.intro_id");
    if (data.founder_id != null) requireUuid(data.founder_id, "data.founder_id");
    if (data.investor_id != null) requireUuid(data.investor_id, "data.investor_id");
    if (data.user_id != null) requireUuid(data.user_id, "data.user_id");
    if (data.message != null) {
      data.message = sanitizeText(data.message, "data.message", { maxLength: 500, multiline: true });
    }
    if (data.decline_reason != null) {
      data.decline_reason = sanitizeText(data.decline_reason, "data.decline_reason", { maxLength: 500, multiline: true });
    }

    // -----------------------------------------------------------------------
    // Resolve recipient email if not provided directly
    // -----------------------------------------------------------------------
    let recipientEmail = to;
    if (!recipientEmail) {
      // Determine which user ID to look up based on event type
      let lookupUserId: string | null = null;
      if (type === "intro_request" && data.founder_id) {
        lookupUserId = String(data.founder_id);
      } else if (
        (type === "intro_accepted" || type === "intro_declined") && data.investor_id
      ) {
        lookupUserId = String(data.investor_id);
      } else if (data.user_id) {
        lookupUserId = String(data.user_id);
      }

      if (lookupUserId) {
        const { data: authUser } = await serviceClient.auth.admin.getUserById(lookupUserId);
        recipientEmail = authUser?.user?.email ?? null;
      }
    }

    if (!recipientEmail) {
      await logSecurityEvent(serviceClient, req, {
        eventType: "email_recipient_resolution_failed",
        severity: "warning",
        route: "send-email",
        metadata: { type },
      });
      return new Response(
        JSON.stringify({ error: "Could not determine recipient email address" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // -----------------------------------------------------------------------
    // Build the email template
    // -----------------------------------------------------------------------
    const template = buildTemplate(type, data);

    // -----------------------------------------------------------------------
    // Send via Resend API
    // -----------------------------------------------------------------------
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [recipientEmail],
        subject: template.subject,
        html: template.html,
        text: template.text,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend API error:", errText);
      await logSecurityEvent(serviceClient, req, {
        eventType: "email_provider_error",
        severity: "critical",
        route: "send-email",
        metadata: { type, status: resendRes.status, detail: errText.slice(0, 500) },
      });
      return new Response(
        JSON.stringify({ error: "Email delivery failed", detail: errText }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const resendData = await resendRes.json();
    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    if (err instanceof ValidationError) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: err.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
    console.error("send-email error:", err);
    try {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      await logSecurityEvent(serviceClient, req, {
        eventType: "email_internal_error",
        severity: "critical",
        route: "send-email",
        metadata: { message: err instanceof Error ? err.message : "Unknown error" },
      });
    } catch {
      // Ignore nested logging failures.
    }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
