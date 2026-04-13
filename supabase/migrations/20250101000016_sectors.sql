CREATE TABLE public.sectors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT UNIQUE NOT NULL,
  color               TEXT,
  total_deals         INT DEFAULT 0,
  avg_deal_usd        NUMERIC,
  total_funding_usd   NUMERIC DEFAULT 0,
  active_investors    INT DEFAULT 0,
  yoy_growth_pct      NUMERIC,
  trend               TEXT CHECK (trend IN ('up','down','flat')),
  top_investors       TEXT[] DEFAULT '{}',
  computed_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.sector_trend_data (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector       TEXT NOT NULL,
  month        TEXT NOT NULL,
  year         INT NOT NULL,
  deal_count   INT DEFAULT 0,
  computed_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sector, month, year)
);
