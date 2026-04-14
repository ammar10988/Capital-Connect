CREATE TABLE IF NOT EXISTS public.bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  steps TEXT,
  screenshot_url TEXT,
  page_url TEXT NOT NULL,
  browser_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in-progress', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bug_reports_user_created_idx
  ON public.bug_reports (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bug_reports_status_created_idx
  ON public.bug_reports (status, created_at DESC);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bug_reports: own insert" ON public.bug_reports;
CREATE POLICY "bug_reports: own insert"
  ON public.bug_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bug_reports: own select" ON public.bug_reports;
CREATE POLICY "bug_reports: own select"
  ON public.bug_reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bug_reports: admin full access" ON public.bug_reports;
CREATE POLICY "bug_reports: admin full access"
  ON public.bug_reports FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "reports upload" ON storage.objects;
CREATE POLICY "reports upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "reports own read" ON storage.objects;
CREATE POLICY "reports own read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );
