-- Intro requests between investors and founders (by profile ID)
CREATE TABLE IF NOT EXISTS public.founder_intro_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  founder_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message             TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','declined')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_founder_intro UNIQUE (investor_id, founder_id)
);

CREATE INDEX IF NOT EXISTS idx_fir_investor ON public.founder_intro_requests (investor_id);
CREATE INDEX IF NOT EXISTS idx_fir_founder  ON public.founder_intro_requests (founder_id);

ALTER TABLE public.founder_intro_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fir: investor insert"
  ON public.founder_intro_requests FOR INSERT
  WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "fir: investor select own"
  ON public.founder_intro_requests FOR SELECT
  USING (auth.uid() = investor_id OR auth.uid() = founder_id);
