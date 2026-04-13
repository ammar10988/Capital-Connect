import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/abuseProtection.ts";
import {
  parseJsonObject,
  requireEnum,
  sanitizeText,
  ValidationError,
} from "../_shared/inputValidation.ts";
import { logSecurityEvent } from "../_shared/security.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatMode = "compliance" | "market-intel" | "fundraising";
const AI_CHAT_WINDOW_MS = 10 * 60 * 1000;
const AI_CHAT_MAX_PER_USER = 12;
const AI_CHAT_MAX_PER_IP = 25;
const AI_CHAT_MAX_MESSAGE_LENGTH = 4000;

function getAuthToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim() || null;
}

function buildSystemPrompt(mode: ChatMode, role: string): string {
  const base = `You are InvestLigence AI, a specialised assistant for the Indian startup and venture capital ecosystem.
Always be concise, data-driven, and cite specific metrics when possible.
Current date: ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}.
User role: ${role}.`;

  const modePrompts: Record<ChatMode, string> = {
    compliance: `${base}
Mode: Regulatory Compliance Assistant.
You help ${role === "investor" ? "investors" : "founders"} navigate Indian startup regulations.
Topics you cover: SEBI regulations, FEMA compliance, FDI policy, Companies Act 2013, RBI guidelines for FinTech, DPIIT startup recognition, angel tax exemptions, GST for SaaS.
Always clarify you are not a licensed legal advisor and recommend consulting a qualified CA or lawyer for binding advice.
Format your responses with clear headings and bullet points.`,

    "market-intel": `${base}
Mode: Market Intelligence Assistant.
You provide deep insights on the Indian startup ecosystem.
Topics: funding trends, sector analysis, investor landscape, competitive benchmarking, valuation multiples, M&A activity, IPO pipeline.
When asked about specific companies or sectors, provide the most recent data you have and note the knowledge cutoff.
Use structured formats with tables when comparing multiple data points.`,

    fundraising: `${base}
Mode: Fundraising Strategy Assistant.
${role === "founder"
  ? "You help founders craft compelling pitches, prepare data rooms, understand term sheets, identify the right investors, and navigate the fundraising process end-to-end."
  : "You help investors evaluate deals, structure term sheets, conduct due diligence, and manage portfolio companies."
}
Be tactical and specific. Provide templates, checklists, and real examples from the Indian startup ecosystem where relevant.
When discussing valuation, reference comparable transactions from the Indian market.`,
  };

  return modePrompts[mode] ?? base;
}

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
    const token = getAuthToken(req);
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body = await parseJsonObject(req);
    const mode = requireEnum(body.mode, "mode", ["compliance", "market-intel", "fundraising"] as const);
    const message = sanitizeText(body.message, "message", {
      minLength: 1,
      maxLength: AI_CHAT_MAX_MESSAGE_LENGTH,
      multiline: true,
    });

    if (!message || !mode) {
      return new Response(JSON.stringify({ error: "Missing required fields: message, mode" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      const auditClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await logSecurityEvent(auditClient, req, {
        eventType: "ai_chat_unauthorized",
        severity: "warning",
        route: "ai-chat",
      });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Failed to load profile for chat:", profileError);
      await logSecurityEvent(supabase, req, {
        eventType: "ai_chat_profile_lookup_failed",
        severity: "warning",
        route: "ai-chat",
        userId: user.id,
        metadata: { message: profileError.message },
      });
      return new Response(JSON.stringify({ error: "Failed to load user profile" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const role = profile?.role === "investor" ? "investor" : "founder";

    await enforceRateLimit(supabase, req, {
      route: "ai-chat",
      windowMs: AI_CHAT_WINDOW_MS,
      maxPerIp: AI_CHAT_MAX_PER_IP,
      maxPerUser: AI_CHAT_MAX_PER_USER,
      userId: user.id,
      eventType: "ai_chat_rate_limited",
    });

    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("messages")
      .eq("user_id", user.id)
      .eq("mode", mode)
      .maybeSingle();

    if (sessionError) {
      console.error("Failed to load chat session:", sessionError);
      await logSecurityEvent(supabase, req, {
        eventType: "ai_chat_session_lookup_failed",
        severity: "warning",
        route: "ai-chat",
        userId: user.id,
        metadata: { mode, message: sessionError.message },
      });
      return new Response(JSON.stringify({ error: "Failed to load chat session" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const history: Array<{ role: string; parts: Array<{ text: string }> }> =
      (session?.messages ?? []).map((entry: { role: string; content: string }) => ({
        role: entry.role === "assistant" ? "model" : "user",
        parts: [{ text: entry.content }],
      }));

    const geminiPayload = {
      system_instruction: {
        parts: [{ text: buildSystemPrompt(mode, role) }],
      },
      contents: [
        ...history,
        { role: "user", parts: [{ text: message }] },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;
    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${geminiApiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      await logSecurityEvent(supabase, req, {
        eventType: "ai_chat_provider_error",
        severity: "critical",
        route: "ai-chat",
        userId: user.id,
        metadata: { mode, status: geminiRes.status, detail: errText.slice(0, 500) },
      });
      return new Response(JSON.stringify({ error: "Gemini API error", detail: errText }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let fullResponse = "";
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const processStream = async () => {
      const reader = geminiRes.body?.getReader();
      if (!reader) {
        await writer.close();
        return;
      }

      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) {
              continue;
            }

            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") {
              continue;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (!text) {
                continue;
              }

              fullResponse += text;
              await writer.write(encoder.encode(text));
            } catch {
              // Ignore keepalive / malformed SSE frames.
            }
          }
        }
      } finally {
        await writer.close();

        const updatedMessages = [
          ...(session?.messages ?? []),
          { role: "user", content: message, timestamp: new Date().toISOString() },
          { role: "assistant", content: fullResponse, timestamp: new Date().toISOString() },
        ];

        const { error: upsertError } = await supabase.from("chat_sessions").upsert({
          user_id: user.id,
          mode,
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,mode" });

        if (upsertError) {
          console.error("Failed to persist chat session:", upsertError);
          await logSecurityEvent(supabase, req, {
            eventType: "ai_chat_session_persist_failed",
            severity: "warning",
            route: "ai-chat",
            userId: user.id,
            metadata: { mode, message: upsertError.message },
          });
        }
      }
    };

    processStream().catch((error) => console.error("Stream processing error:", error));

    return new Response(readable, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    console.error("ai-chat error:", error);
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      await logSecurityEvent(supabase, req, {
        eventType: "ai_chat_internal_error",
        severity: "critical",
        route: "ai-chat",
        metadata: {
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
    } catch {
      // Ignore logging failures in the error path.
    }
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
