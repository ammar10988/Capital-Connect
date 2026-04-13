import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Weights for trending score computation
// ---------------------------------------------------------------------------
const WEIGHT_VIEW_7D      = 3;
const WEIGHT_VIEW_30D     = 1;
const WEIGHT_BOOKMARK_7D  = 5;
const WEIGHT_INTRO_7D     = 8;
const WEIGHT_DECK_DL_7D   = 4;
const HOT_SCORE_THRESHOLD = 50;
const MAX_TRENDING_ROWS   = 20;

interface StartupScore {
  startup_id: string;
  score: number;
  trend_signal: string;
  weekly_views: number;
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
    const now = new Date();
    const ago7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString();
    const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // -----------------------------------------------------------------------
    // 1. Profile views in last 7 days and 30 days (approved startups only)
    // -----------------------------------------------------------------------
    const [
      { data: views7d  },
      { data: views30d },
      { data: bookmarks7d },
      { data: intros7d },
      { data: decks7d },
    ] = await Promise.all([
      supabase.rpc("count_events_by_startup", {
        table_name: "profile_views",
        ts_column: "viewed_at",
        since: ago7d,
      }).then(() =>
        // Fallback: direct query
        supabase
          .from("profile_views")
          .select("startup_id")
          .gte("viewed_at", ago7d)
      ),
      supabase
        .from("profile_views")
        .select("startup_id")
        .gte("viewed_at", ago30d)
        .lt("viewed_at", ago7d),
      supabase
        .from("bookmarks")
        .select("startup_id")
        .gte("created_at", ago7d),
      supabase
        .from("introductions")
        .select("startup_id")
        .gte("initiated_at", ago7d)
        .neq("status", "declined"),
      supabase
        .from("deck_downloads")
        .select("startup_id")
        .gte("downloaded_at", ago7d),
    ]);

    // -----------------------------------------------------------------------
    // 2. Aggregate counts per startup
    // -----------------------------------------------------------------------
    function countByStartup(rows: Array<{ startup_id: string }> | null): Map<string, number> {
      const map = new Map<string, number>();
      for (const row of rows ?? []) {
        map.set(row.startup_id, (map.get(row.startup_id) ?? 0) + 1);
      }
      return map;
    }

    const viewMap7d       = countByStartup(views7d);
    const viewMap30d      = countByStartup(views30d);
    const bookmarkMap7d   = countByStartup(bookmarks7d);
    const introMap7d      = countByStartup(intros7d);
    const deckMap7d       = countByStartup(decks7d);

    // -----------------------------------------------------------------------
    // 3. Collect all unique startup IDs from approved applications
    // -----------------------------------------------------------------------
    const { data: approvedStartups } = await supabase
      .from("startup_applications")
      .select("id, company_name, sector, stage")
      .eq("status", "approved");

    if (!approvedStartups || approvedStartups.length === 0) {
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: "No approved startups found" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // -----------------------------------------------------------------------
    // 4. Compute scores
    // -----------------------------------------------------------------------
    const scored: StartupScore[] = approvedStartups.map((s) => {
      const v7d  = viewMap7d.get(s.id)      ?? 0;
      const v30d = viewMap30d.get(s.id)     ?? 0;
      const b7d  = bookmarkMap7d.get(s.id)  ?? 0;
      const i7d  = introMap7d.get(s.id)     ?? 0;
      const d7d  = deckMap7d.get(s.id)      ?? 0;

      const score =
        v7d  * WEIGHT_VIEW_7D     +
        v30d * WEIGHT_VIEW_30D    +
        b7d  * WEIGHT_BOOKMARK_7D +
        i7d  * WEIGHT_INTRO_7D    +
        d7d  * WEIGHT_DECK_DL_7D;

      // Derive trend signal
      let trendSignal = "Gaining traction";
      if (i7d >= 3)       trendSignal = "High investor interest";
      else if (b7d >= 5)  trendSignal = "Heavily bookmarked";
      else if (d7d >= 3)  trendSignal = "Deck in demand";
      else if (v7d >= 20) trendSignal = "Trending this week";

      return { startup_id: s.id, score, trend_signal: trendSignal, weekly_views: v7d };
    });

    // -----------------------------------------------------------------------
    // 5. Sort by score descending, take top N
    // -----------------------------------------------------------------------
    scored.sort((a, b) => b.score - a.score);
    const topStartups = scored.slice(0, MAX_TRENDING_ROWS);

    if (topStartups.length === 0) {
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: "No scores computed" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // -----------------------------------------------------------------------
    // 6. Delete existing trending data and re-insert
    // -----------------------------------------------------------------------
    await supabase.from("trending_startups").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const upsertRows = topStartups.map((s, index) => ({
      startup_id:   s.startup_id,
      rank:         index + 1,
      trend_signal: s.trend_signal,
      is_hot:       s.score >= HOT_SCORE_THRESHOLD,
      weekly_views: s.weekly_views,
      computed_at:  now.toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("trending_startups")
      .upsert(upsertRows, { onConflict: "startup_id" });

    if (upsertError) {
      console.error("trending_startups upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Database upsert failed", detail: upsertError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // -----------------------------------------------------------------------
    // 7. Update sector trend data based on recent deals
    // -----------------------------------------------------------------------
    const month = now.toLocaleString("en-US", { month: "short" }); // "Mar"
    const year  = now.getFullYear();

    const sectorCounts = new Map<string, number>();
    for (const startup of approvedStartups) {
      if (startup.sector) {
        sectorCounts.set(startup.sector, (sectorCounts.get(startup.sector) ?? 0) + 1);
      }
    }

    const sectorUpserts = Array.from(sectorCounts.entries()).map(([sector, count]) => ({
      sector,
      month,
      year,
      deal_count:  count,
      computed_at: now.toISOString(),
    }));

    if (sectorUpserts.length > 0) {
      await supabase
        .from("sector_trend_data")
        .upsert(sectorUpserts, { onConflict: "sector,month,year" });
    }

    console.log(`refresh-trending: ranked ${topStartups.length} startups`);

    return new Response(
      JSON.stringify({
        success:  true,
        updated:  topStartups.length,
        topRanked: topStartups.slice(0, 5).map((s) => ({
          startup_id:   s.startup_id,
          rank:         topStartups.indexOf(s) + 1,
          score:        s.score,
          trend_signal: s.trend_signal,
        })),
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("refresh-trending error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
