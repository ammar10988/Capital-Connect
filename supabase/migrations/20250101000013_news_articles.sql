CREATE TABLE public.news_articles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  summary       TEXT,
  source_name   TEXT,
  source_url    TEXT UNIQUE,
  image_url     TEXT,
  category      TEXT CHECK (category IN (
                  'Funding','Markets','AI/ML','FinTech',
                  'HealthTech','CleanTech','Policy','General'
                )),
  is_hot        BOOLEAN DEFAULT FALSE,
  published_at  TIMESTAMPTZ,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,''))
  ) STORED,
  indexed_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_news_search   ON public.news_articles USING gin(search_vector);
CREATE INDEX idx_news_date     ON public.news_articles(published_at DESC);
CREATE INDEX idx_news_category ON public.news_articles(category);
