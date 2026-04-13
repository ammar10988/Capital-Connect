CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action TEXT NOT NULL CHECK (action IN ('login', 'register', 'request_password_reset', 'verify_password')),
  identifier_hash TEXT NOT NULL,
  ip_hash TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_attempts_action_identifier_created_idx
  ON public.auth_attempts (action, identifier_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS auth_attempts_action_ip_created_idx
  ON public.auth_attempts (action, ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;

ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.auth_attempts FROM anon, authenticated;
