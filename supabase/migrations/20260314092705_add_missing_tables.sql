-- ============================================================
-- A: scraped_investors
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.scraped_investors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  institution         TEXT,
  title               TEXT,
  location            TEXT,
  sectors             TEXT[] DEFAULT '{}',
  stages              TEXT[] DEFAULT '{}',
  check_min           TEXT,
  check_max           TEXT,
  funding_type        TEXT,
  typical_equity      TEXT,
  investment_thesis   TEXT,
  portfolio_count     INTEGER,
  recent_investments  TEXT[] DEFAULT '{}',
  verified            BOOLEAN NOT NULL DEFAULT FALSE,
  response_rate       TEXT,
  actively_investing  BOOLEAN NOT NULL DEFAULT TRUE,
  email               TEXT,
  website             TEXT,
  linkedin_url        TEXT,
  source_url          TEXT NOT NULL DEFAULT '',
  source_type         TEXT NOT NULL DEFAULT 'manual_seed',
  is_new              BOOLEAN NOT NULL DEFAULT TRUE,
  date_added          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_scraped_investor UNIQUE (name, institution)
);

CREATE INDEX IF NOT EXISTS idx_scraped_sectors ON public.scraped_investors USING GIN (sectors);
CREATE INDEX IF NOT EXISTS idx_scraped_stages ON public.scraped_investors USING GIN (stages);
CREATE INDEX IF NOT EXISTS idx_scraped_date_added ON public.scraped_investors (date_added DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_is_new ON public.scraped_investors (is_new) WHERE is_new = TRUE;
CREATE INDEX IF NOT EXISTS idx_scraped_name_trgm ON public.scraped_investors USING GIN (name gin_trgm_ops);

ALTER TABLE public.scraped_investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read scraped investors"
  ON public.scraped_investors FOR SELECT TO authenticated USING (true);

-- ============================================================
-- B: matches
-- ============================================================
CREATE TABLE IF NOT EXISTS public.matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  founder_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score           NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  match_reasons   TEXT[] DEFAULT '{}',
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT unique_match UNIQUE (investor_id, founder_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_investor ON public.matches (investor_id);
CREATE INDEX IF NOT EXISTS idx_matches_founder ON public.matches (founder_id);
CREATE INDEX IF NOT EXISTS idx_matches_score ON public.matches (score DESC);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = investor_id OR auth.uid() = founder_id);

-- ============================================================
-- C: founder_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.founder_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  founder_type          TEXT NOT NULL DEFAULT 'active',
  company_name          TEXT,
  sector                TEXT,
  stage                 TEXT,
  arr                   TEXT,
  mom_growth            TEXT,
  raise_amount          TEXT,
  idea_title            TEXT,
  problem_statement     TEXT,
  idea_stage            TEXT,
  target_market         TEXT,
  support_needed        TEXT[] DEFAULT '{}',
  bio                   TEXT,
  pitch_deck_url        TEXT,
  verified              BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status   TEXT NOT NULL DEFAULT 'pending',
  trust_badges          TEXT[] DEFAULT '{}',
  views_count           INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_founder_profile UNIQUE (profile_id)
);

CREATE INDEX IF NOT EXISTS idx_founder_sector ON public.founder_profiles (sector);
CREATE INDEX IF NOT EXISTS idx_founder_stage ON public.founder_profiles (stage);
CREATE INDEX IF NOT EXISTS idx_founder_verified ON public.founder_profiles (verified);

ALTER TABLE public.founder_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders read own profile"
  ON public.founder_profiles FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Investors read verified founders"
  ON public.founder_profiles FOR SELECT
  USING (
    verified = TRUE AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'investor'
    )
  );
CREATE POLICY "Founders insert own profile"
  ON public.founder_profiles FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Founders update own profile"
  ON public.founder_profiles FOR UPDATE USING (auth.uid() = profile_id);

-- ============================================================
-- D: analytics_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  snapshot_date             DATE NOT NULL,
  profile_views             INTEGER NOT NULL DEFAULT 0,
  bookmarks_received        INTEGER NOT NULL DEFAULT 0,
  intro_requests_received   INTEGER NOT NULL DEFAULT 0,
  pitch_downloads           INTEGER NOT NULL DEFAULT 0,
  matches_count             INTEGER NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_profile_snapshot UNIQUE (profile_id, snapshot_date)
);

ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own snapshots"
  ON public.analytics_snapshots FOR SELECT USING (auth.uid() = profile_id);

-- ============================================================
-- E: global_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS public.global_snapshots (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date             DATE NOT NULL UNIQUE,
  total_startups            INTEGER NOT NULL DEFAULT 0,
  new_startups_this_week    INTEGER NOT NULL DEFAULT 0,
  active_raises             INTEGER NOT NULL DEFAULT 0,
  total_funded_this_month   INTEGER NOT NULL DEFAULT 0,
  top_sector                TEXT,
  deals_by_sector           JSONB DEFAULT '{}',
  deal_flow_trend           JSONB DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.global_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read global snapshots"
  ON public.global_snapshots FOR SELECT TO authenticated USING (true);

-- ============================================================
-- F: Verify all tables exist
-- ============================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
