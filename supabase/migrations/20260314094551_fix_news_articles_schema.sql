-- ============================================================
-- Fix news_articles to match the RSS scraper's output
-- ============================================================

-- 1. Add `url` as the article link and deduplication key
ALTER TABLE public.news_articles
  ADD COLUMN IF NOT EXISTS url TEXT;

-- Make it unique (scraper upserts on this column)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'news_articles_url_key' AND conrelid = 'public.news_articles'::regclass
  ) THEN
    ALTER TABLE public.news_articles ADD CONSTRAINT news_articles_url_key UNIQUE (url);
  END IF;
END $$;

-- 2. Drop UNIQUE from source_url — it now stores the RSS feed URL,
--    which is shared across all articles from the same source
ALTER TABLE public.news_articles
  DROP CONSTRAINT IF EXISTS news_articles_source_url_key;

-- 3. Add sector_tags (array of matched sector strings)
ALTER TABLE public.news_articles
  ADD COLUMN IF NOT EXISTS sector_tags TEXT[] DEFAULT '{}';

-- 4. Add is_featured (replaces is_hot for scraper-flagged featured articles)
ALTER TABLE public.news_articles
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. Add fetched_at (when the scraper ran — scraper writes this column)
ALTER TABLE public.news_articles
  ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ;

-- 6. Fix the category CHECK constraint to include all scraper-produced values:
--    Old allowed: Funding, Markets, AI/ML, FinTech, HealthTech, CleanTech, Policy, General
--    Scraper also produces: Acquisition, IPO, People, Technology, News
ALTER TABLE public.news_articles
  DROP CONSTRAINT IF EXISTS news_articles_category_check;

ALTER TABLE public.news_articles
  ADD CONSTRAINT news_articles_category_check
  CHECK (category IN (
    'Funding', 'Acquisition', 'IPO', 'People', 'Policy',
    'Technology', 'News', 'Markets', 'AI/ML', 'FinTech',
    'HealthTech', 'CleanTech', 'General'
  ));

-- 7. Enable RLS + read policy (idempotent)
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'news_articles' AND policyname = 'Anyone can read news'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can read news"
      ON public.news_articles FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 8. Index on url for fast dedup lookups
CREATE INDEX IF NOT EXISTS idx_news_url ON public.news_articles (url);
-- Index on sector_tags for array contains queries
CREATE INDEX IF NOT EXISTS idx_news_sector_tags ON public.news_articles USING GIN (sector_tags);
