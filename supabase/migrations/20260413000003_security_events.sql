CREATE TABLE IF NOT EXISTS public.security_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  route TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  identifier_hash TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS security_events_created_at_idx
  ON public.security_events (created_at DESC);

CREATE INDEX IF NOT EXISTS security_events_event_type_created_at_idx
  ON public.security_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS security_events_ip_hash_created_at_idx
  ON public.security_events (ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS security_events_user_id_created_at_idx
  ON public.security_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.security_events FROM anon, authenticated;
