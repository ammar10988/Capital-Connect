CREATE TABLE public.portfolio_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  startup_id       UUID REFERENCES public.startup_applications(id),
  external_name    TEXT,
  external_sector  TEXT,
  invested_amount  NUMERIC NOT NULL,
  investment_date  DATE NOT NULL,
  current_value    NUMERIC,
  ownership_pct    NUMERIC,
  stage_at_entry   TEXT,
  moic             NUMERIC GENERATED ALWAYS AS (
                     CASE WHEN invested_amount > 0
                     THEN ROUND((current_value / invested_amount)::NUMERIC, 1)
                     ELSE NULL END
                   ) STORED,
  status           TEXT DEFAULT 'Active' CHECK (status IN (
                     'Active','Exited','Written Off','IPO'
                   )),
  exit_date        DATE,
  exit_value       NUMERIC,
  irr_pct          NUMERIC,
  arr_snapshot     TEXT,
  growth_rate      TEXT,
  team_size        INT,
  notes            TEXT,
  color            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_portfolio_investor ON public.portfolio_items(investor_id);
