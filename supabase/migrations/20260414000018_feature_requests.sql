CREATE TABLE IF NOT EXISTS public.feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Founder Tools', 'Investor Tools', 'Matching', 'Analytics', 'General')),
  status TEXT NOT NULL DEFAULT 'under_review' CHECK (status IN ('under_review', 'planned', 'in_progress', 'shipped')),
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feature_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feature_request_votes_user_request_key UNIQUE (user_id, request_id)
);

CREATE INDEX IF NOT EXISTS feature_requests_status_votes_idx
  ON public.feature_requests (status, vote_count DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS feature_requests_created_idx
  ON public.feature_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS feature_request_votes_request_idx
  ON public.feature_request_votes (request_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.sync_feature_request_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.feature_requests
    SET vote_count = (
      SELECT COUNT(*)
      FROM public.feature_request_votes
      WHERE request_id = OLD.request_id
    )
    WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;

  UPDATE public.feature_requests
  SET vote_count = (
    SELECT COUNT(*)
    FROM public.feature_request_votes
    WHERE request_id = NEW.request_id
  )
  WHERE id = NEW.request_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feature_request_votes_sync_count ON public.feature_request_votes;
CREATE TRIGGER feature_request_votes_sync_count
AFTER INSERT OR DELETE ON public.feature_request_votes
FOR EACH ROW
EXECUTE FUNCTION public.sync_feature_request_vote_count();

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_requests: authenticated read" ON public.feature_requests;
CREATE POLICY "feature_requests: authenticated read"
  ON public.feature_requests FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "feature_requests: own insert" ON public.feature_requests;
CREATE POLICY "feature_requests: own insert"
  ON public.feature_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feature_requests: admin full access" ON public.feature_requests;
CREATE POLICY "feature_requests: admin full access"
  ON public.feature_requests FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "feature_request_votes: authenticated read" ON public.feature_request_votes;
CREATE POLICY "feature_request_votes: authenticated read"
  ON public.feature_request_votes FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "feature_request_votes: own insert" ON public.feature_request_votes;
CREATE POLICY "feature_request_votes: own insert"
  ON public.feature_request_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feature_request_votes: admin full access" ON public.feature_request_votes;
CREATE POLICY "feature_request_votes: admin full access"
  ON public.feature_request_votes FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
