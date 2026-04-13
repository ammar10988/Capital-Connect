CREATE TABLE public.introductions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  startup_id      UUID REFERENCES public.startup_applications(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'pending' CHECK (status IN (
                    'pending','accepted','declined','completed','expired'
                  )),
  message         TEXT,
  connector_name  TEXT,
  connector_role  TEXT,
  connection_type TEXT CHECK (connection_type IN ('mutual','advisor','linkedin')),
  decline_reason  TEXT,
  initiated_at    TIMESTAMPTZ DEFAULT NOW(),
  responded_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  UNIQUE(investor_id, startup_id)
);
CREATE INDEX idx_intro_investor ON public.introductions(investor_id, status);
CREATE INDEX idx_intro_startup  ON public.introductions(startup_id, status);
