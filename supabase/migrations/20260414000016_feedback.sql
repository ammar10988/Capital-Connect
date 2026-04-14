CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 4),
  message TEXT,
  page_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_user_created_idx
  ON public.feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS feedback_page_created_idx
  ON public.feedback (page_url, created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback: own insert" ON public.feedback;
CREATE POLICY "feedback: own insert"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback: admin full access" ON public.feedback;
CREATE POLICY "feedback: admin full access"
  ON public.feedback FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
