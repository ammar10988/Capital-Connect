CREATE TABLE public.deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  startup_id      UUID REFERENCES public.startup_applications(id),
  pipeline_stage  TEXT CHECK (pipeline_stage IN (
                    'Sourced','Screening','First Call',
                    'Due Diligence','Term Sheet','Closed','Passed'
                  )),
  amount_usd      NUMERIC,
  probability_pct INT,
  notes           JSONB DEFAULT '[]',
  tags            TEXT[] DEFAULT '{}',
  next_action     TEXT,
  next_action_date DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(investor_id, startup_id)
);
CREATE INDEX idx_deals_investor ON public.deals(investor_id);
CREATE INDEX idx_deals_stage    ON public.deals(investor_id, pipeline_stage);
