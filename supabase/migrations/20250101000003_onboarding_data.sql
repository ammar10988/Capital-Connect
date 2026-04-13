CREATE TABLE public.onboarding_data (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  step_key   TEXT NOT NULL,
  step_data  JSONB NOT NULL DEFAULT '{}',
  completed  BOOLEAN DEFAULT FALSE,
  saved_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, step_key)
);
CREATE INDEX idx_onboarding_user ON public.onboarding_data(user_id);
