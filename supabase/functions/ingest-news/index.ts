import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isServiceRoleBearer } from "../_shared/abuseProtection.ts";
import { fetchWithTimeout } from "../_shared/fetchWithTimeout.ts";
import { logSecurityEvent } from "../_shared/security.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Keywords for NewsAPI query
// ---------------------------------------------------------------------------
const SEARCH_QUERY =
  "(startup OR venture OR funding OR fintech OR healthtech OR edtech OR SaaS OR unicorn) AND (India OR Indian OR Bengaluru OR Mumbai OR Delhi)";

// ---------------------------------------------------------------------------
// Category auto-detection based on title/description keywords
// ---------------------------------------------------------------------------
type NewsCategory =
  | "Funding"
  | "Markets"
  | "AI/ML"
  | "FinTech"
  | "HealthTech"
  | "CleanTech"
  | "Policy"
  | "General";

const CATEGORY_RULES: Array<{ keywords: RegExp; category: NewsCategory }> = [
  { keywords: /\b(raise|raised|raises|funding|series [a-e]|seed round|pre-seed|ipo|unicorn|valuation|investment)\b/i, category: "Funding" },
  { keywords: /\b(ai|artificial intelligence|machine learning|llm|generative ai|gpt|deep learning|neural)\b/i, category: "AI/ML" },
  { keywords: /\b(fintech|neobank|payment|upi|neft|lending|nbfc|insurance|wealthtech|insurtech|digital banking)\b/i, category: "FinTech" },
  { keywords: /\b(healthtech|medtech|telemedicine|pharma|digital health|hospital|clinical|patient|diagnostics)\b/i, category: "HealthTech" },
  { keywords: /\b(cleantech|electric vehicle|ev|solar|wind|renewable|carbon|green hydrogen|climate|sustainability)\b/i, category: "CleanTech" },
  { keywords: /\b(sebi|rbi|government|policy|regulation|budget|ministry|fdi|tax|compliance|act|bill|parliament)\b/i, category: "Policy" },
  { keywords: /\b(market|nse|bse|sensex|nifty|stock|equity|ipo|listing|quarter|revenue|profit|loss)\b/i, category: "Markets" },
];

function categorise(title: string, description: string): NewsCategory {
  const text = `${title} ${description}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(text)) return rule.category;
  }
  return "General";
}

function isHot(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return /\b(unicorn|ipo|record|billion|raises \$[5-9]\d{2}|raises \$[1-9]\d{3}|breakthrough|landmark|historic)\b/.test(text);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (!isServiceRoleBearer(req)) {
      await logSecurityEvent(supabase, req, {
        eventType: "ingest_news_unauthorized",
        severity: "critical",
        route: "ingest-news",
      });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const newsApiKey = Deno.env.get("NEWS_API_KEY");
    if (!newsApiKey) {
      return new Response(
        JSON.stringify({ error: "NEWS_API_KEY environment variable not set" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // -----------------------------------------------------------------------
    // Fetch from NewsAPI
    // -----------------------------------------------------------------------
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 3); // last 3 days
    const fromStr = fromDate.toISOString().split("T")[0];

    const newsUrl = new URL("https://newsapi.org/v2/everything");
    newsUrl.searchParams.set("q", SEARCH_QUERY);
    newsUrl.searchParams.set("language", "en");
    newsUrl.searchParams.set("sortBy", "publishedAt");
    newsUrl.searchParams.set("pageSize", "50");
    newsUrl.searchParams.set("from", fromStr);
    newsUrl.searchParams.set("apiKey", newsApiKey);

    const newsRes = await fetchWithTimeout(newsUrl.toString());
    if (!newsRes.ok) {
      const errText = await newsRes.text();
      console.error("NewsAPI error:", errText);
      return new Response(
        JSON.stringify({ error: "NewsAPI request failed", detail: errText }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const newsData = await newsRes.json() as {
      status: string;
      articles: Array<{
        title: string;
        description: string | null;
        url: string;
        urlToImage: string | null;
        source: { name: string };
        publishedAt: string;
      }>;
    };

    if (newsData.status !== "ok") {
      return new Response(
        JSON.stringify({ error: "NewsAPI returned non-ok status", detail: newsData }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // -----------------------------------------------------------------------
    // Filter and transform articles
    // -----------------------------------------------------------------------
    const articles = newsData.articles
      .filter((a) => a.title && a.url && !a.title.includes("[Removed]"))
      .map((a) => ({
        title: a.title,
        summary: a.description ?? null,
        source_name: a.source.name,
        source_url: a.url,
        image_url: a.urlToImage ?? null,
        category: categorise(a.title, a.description ?? ""),
        is_hot: isHot(a.title, a.description ?? ""),
        published_at: a.publishedAt,
      }));

    if (articles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, inserted: 0, message: "No new articles found" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // -----------------------------------------------------------------------
    // Upsert into news_articles (ignore conflicts on source_url)
    // -----------------------------------------------------------------------
    const { data: inserted, error: upsertError } = await supabase
      .from("news_articles")
      .upsert(articles, { onConflict: "source_url", ignoreDuplicates: true })
      .select("id");

    if (upsertError) {
      console.error("news_articles upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Database upsert failed", detail: upsertError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const insertedCount = inserted?.length ?? 0;
    console.log(`ingest-news: processed ${articles.length} articles, inserted ${insertedCount} new`);

    return new Response(
      JSON.stringify({
        success: true,
        fetched: articles.length,
        inserted: insertedCount,
        from: fromStr,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("ingest-news error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
