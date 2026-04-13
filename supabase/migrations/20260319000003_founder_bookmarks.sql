-- Bookmarks for founder profiles (investor-side)
CREATE TABLE IF NOT EXISTS public.founder_bookmarks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  founder_profile_id  UUID NOT NULL REFERENCES public.founder_profiles(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_founder_bookmark UNIQUE (investor_id, founder_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_fb_investor ON public.founder_bookmarks (investor_id);
CREATE INDEX IF NOT EXISTS idx_fb_profile  ON public.founder_bookmarks (founder_profile_id);

ALTER TABLE public.founder_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fb: investor owns"
  ON public.founder_bookmarks FOR ALL
  USING (auth.uid() = investor_id)
  WITH CHECK (auth.uid() = investor_id);
