-- ============================================================
-- Migration: 001_create_news_articles
-- Description: Creates the news_articles table that is the
--              single source of truth for the News Feed page.
--              Populated exclusively by the Python RSS scraper
--              running via GitHub Actions every 6 hours.
-- Run this once in the Supabase SQL editor or via CLI:
--   supabase db push
-- ============================================================

CREATE TABLE IF NOT EXISTS public.news_articles (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  url          TEXT        NOT NULL UNIQUE,          -- dedup key
  summary      TEXT,                                  -- ≤ 300 chars, HTML-stripped
  image_url    TEXT,                                  -- nullable thumbnail
  source_name  TEXT        NOT NULL,                  -- "Inc42", "YourStory", …
  source_url   TEXT        NOT NULL,                  -- the RSS feed URL
  published_at TIMESTAMPTZ,                           -- from pubDate; nullable for bad feeds
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),    -- when scraper ran
  category     TEXT        NOT NULL DEFAULT 'News',
  sector_tags  TEXT[]      NOT NULL DEFAULT '{}',
  is_featured  BOOLEAN     NOT NULL DEFAULT FALSE,

  CONSTRAINT valid_category CHECK (
    category IN ('Funding','Acquisition','IPO','People','Policy','Technology','News')
  )
);

COMMENT ON TABLE public.news_articles IS
  'Curated India startup/VC news articles ingested by the RSS scraper every 6 hours.';
COMMENT ON COLUMN public.news_articles.url IS
  'Canonical article URL — used as the unique deduplication key.';
COMMENT ON COLUMN public.news_articles.sector_tags IS
  'Array of matched sector strings, e.g. {Fintech, AI/ML}. Supports GIN index for @> queries.';
COMMENT ON COLUMN public.news_articles.is_featured IS
  'TRUE for Inc42/YourStory articles published within 24 h that have a thumbnail image.';

-- ── Indexes ──────────────────────────────────────────────────

-- Primary sort order: newest first
CREATE INDEX IF NOT EXISTS idx_news_published_at
  ON public.news_articles (published_at DESC);

-- Filter by source (e.g. "Inc42")
CREATE INDEX IF NOT EXISTS idx_news_source_name
  ON public.news_articles (source_name);

-- Filter by category
CREATE INDEX IF NOT EXISTS idx_news_category
  ON public.news_articles (category);

-- Partial index on featured articles only — very fast for the featured card query
CREATE INDEX IF NOT EXISTS idx_news_is_featured
  ON public.news_articles (published_at DESC)
  WHERE is_featured = TRUE;

-- GIN index for sector_tags array containment queries (@>)
CREATE INDEX IF NOT EXISTS idx_news_sector_tags
  ON public.news_articles USING GIN (sector_tags);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all articles
CREATE POLICY "Authenticated users can read news"
  ON public.news_articles
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT / UPDATE / DELETE policy for authenticated users.
-- Only the service-role key (used by the scraper) can write,
-- because service-role bypasses RLS entirely.

-- ── Optional: auto-cleanup function (alternative to scraper cleanup) ─────

-- You can schedule this in Supabase's pg_cron extension instead of
-- relying on the scraper. Left commented out — enable if desired.
--
-- SELECT cron.schedule(
--   'delete-stale-news',
--   '0 2 * * *',   -- daily at 02:00 UTC
--   $$
--     DELETE FROM public.news_articles
--     WHERE published_at < NOW() - INTERVAL '30 days';
--   $$
-- );
