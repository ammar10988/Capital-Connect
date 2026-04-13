CREATE TABLE public.raw_articles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT,
  content      TEXT,
  source_name  TEXT,
  source_url   TEXT UNIQUE,
  published_at TIMESTAMPTZ,
  processed    BOOLEAN DEFAULT FALSE,
  indexed_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.discovered_investors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  firm           TEXT,
  investor_type  TEXT,
  title          TEXT,
  linkedin_url   TEXT,
  sectors        TEXT[] DEFAULT '{}',
  stages         TEXT[] DEFAULT '{}',
  last_seen_deal JSONB,
  verified       BOOLEAN DEFAULT FALSE,
  discovered_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, firm)
);
CREATE INDEX idx_disc_inv_name ON public.discovered_investors USING gin(name gin_trgm_ops);
