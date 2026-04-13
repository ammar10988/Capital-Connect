CREATE TABLE public.funding_rounds (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id     UUID REFERENCES public.startup_applications(id),
  company_name   TEXT NOT NULL,
  sector         TEXT,
  stage          TEXT,
  country        TEXT,
  location       TEXT,
  description    TEXT,
  amount_usd     NUMERIC,
  round_type     TEXT,
  lead_investor  TEXT,
  co_investors   TEXT[] DEFAULT '{}',
  valuation_usd  NUMERIC,
  announced_at   DATE,
  source_name    TEXT,
  source_url     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_funding_sector ON public.funding_rounds(sector);
CREATE INDEX idx_funding_stage  ON public.funding_rounds(stage);
CREATE INDEX idx_funding_date   ON public.funding_rounds(announced_at DESC);
