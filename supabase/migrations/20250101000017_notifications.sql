CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT CHECK (type IN (
                'intro_request','intro_accepted','intro_declined','intro_expired',
                'startup_viewed','startup_bookmarked','deck_downloaded',
                'trust_badge_upgrade','application_status',
                'new_funding_round','event_reminder','system'
              )),
  title       TEXT NOT NULL,
  body        TEXT,
  action_url  TEXT,
  read        BOOLEAN DEFAULT FALSE,
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notif_user_unread ON public.notifications(user_id, read, created_at DESC);
