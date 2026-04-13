CREATE TABLE public.startup_applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name        TEXT NOT NULL,
  tagline             TEXT,
  website             TEXT,
  sector              TEXT,
  sub_sector          TEXT,
  country             TEXT DEFAULT 'India',
  city                TEXT,
  founded_year        INT,
  stage               TEXT CHECK (stage IN (
                        'Pre-Seed','Seed','Series A','Series B','Series B+','Growth'
                      )),
  business_model      TEXT,
  description         TEXT,
  arr_usd             NUMERIC,
  mrr_usd             NUMERIC,
  growth_rate_pct     NUMERIC,
  users_count         INT,
  funding_ask_usd     NUMERIC,
  funding_round       TEXT,
  use_of_funds        TEXT,
  previous_raised     NUMERIC DEFAULT 0,
  previous_investors  TEXT,
  team_size           INT,
  founders_data       JSONB DEFAULT '[]',
  deck_path           TEXT,
  pitch_video_url     TEXT,
  status              TEXT DEFAULT 'draft' CHECK (status IN (
                        'draft','submitted','under_review','approved','rejected'
                      )),
  admin_notes         TEXT,
  submitted_at        TIMESTAMPTZ,
  reviewed_at         TIMESTAMPTZ,
  trust_badge         TEXT DEFAULT 'Verified' CHECK (trust_badge IN (
                        'Verified','Revenue Verified','Top Startup'
                      )),
  total_views         INT DEFAULT 0,
  total_bookmarks     INT DEFAULT 0,
  total_intros        INT DEFAULT 0,
  total_deck_downloads INT DEFAULT 0,
  search_vector       tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(company_name,'') || ' ' ||
      coalesce(tagline,'') || ' ' ||
      coalesce(description,'') || ' ' ||
      coalesce(sector,'')
    )
  ) STORED,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_startup_search    ON public.startup_applications USING gin(search_vector);
CREATE INDEX idx_startup_status    ON public.startup_applications(status);
CREATE INDEX idx_startup_sector    ON public.startup_applications(sector);
CREATE INDEX idx_startup_stage     ON public.startup_applications(stage);
CREATE INDEX idx_startup_founder   ON public.startup_applications(founder_id);
CREATE INDEX idx_startup_name_trgm ON public.startup_applications
  USING gin(company_name gin_trgm_ops);
