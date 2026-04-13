CREATE TABLE public.trending_startups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id    UUID REFERENCES public.startup_applications(id) ON DELETE CASCADE UNIQUE,
  rank          INT NOT NULL,
  trend_signal  TEXT,
  is_hot        BOOLEAN DEFAULT FALSE,
  weekly_views  INT DEFAULT 0,
  computed_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_trending_rank ON public.trending_startups(rank);
