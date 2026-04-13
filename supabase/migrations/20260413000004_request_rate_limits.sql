CREATE TABLE IF NOT EXISTS public.request_rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  route TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  identifier_hash TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS request_rate_limits_route_created_at_idx
  ON public.request_rate_limits (route, created_at DESC);

CREATE INDEX IF NOT EXISTS request_rate_limits_route_ip_created_at_idx
  ON public.request_rate_limits (route, ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS request_rate_limits_route_user_created_at_idx
  ON public.request_rate_limits (route, user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS request_rate_limits_route_identifier_created_at_idx
  ON public.request_rate_limits (route, identifier_hash, created_at DESC)
  WHERE identifier_hash IS NOT NULL;

ALTER TABLE public.request_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.request_rate_limits FROM anon, authenticated;
