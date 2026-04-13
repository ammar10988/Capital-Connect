CREATE TABLE IF NOT EXISTS public.public_startups (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name        TEXT NOT NULL UNIQUE,
  tagline             TEXT,
  sector              TEXT,
  city                TEXT,
  country             TEXT DEFAULT 'India',
  stage               TEXT,
  funding_amount      TEXT,
  funding_amount_usd  NUMERIC,
  funding_round       TEXT,
  currency            TEXT,
  investor_name       TEXT,
  description         TEXT,
  source_url          TEXT,
  source_name         TEXT,
  announced_date      DATE,
  is_hot              BOOLEAN DEFAULT FALSE,
  trend_signal        TEXT,
  rank                INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ps_sector ON public.public_startups (sector);
CREATE INDEX IF NOT EXISTS idx_ps_rank ON public.public_startups (rank ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ps_is_hot ON public.public_startups (is_hot) WHERE is_hot = TRUE;
CREATE INDEX IF NOT EXISTS idx_ps_updated_at ON public.public_startups (updated_at DESC);

ALTER TABLE public.public_startups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read public startups"
  ON public.public_startups FOR SELECT TO authenticated USING (true);
