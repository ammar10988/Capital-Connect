CREATE TABLE public.events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  event_type       TEXT CHECK (event_type IN (
                     'Demo Day','Office Hours','Hackathon',
                     'Webinar','Networking','Workshop'
                   )),
  host             TEXT,
  audience         TEXT CHECK (audience IN ('Founders','Investors','Both')),
  sectors          TEXT[] DEFAULT '{}',
  location         TEXT,
  is_virtual       BOOLEAN DEFAULT FALSE,
  meeting_url      TEXT,
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ,
  time_label       TEXT,
  total_spots      INT,
  spots_left       INT,
  registration_url TEXT,
  is_featured      BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.event_rsvps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rsvp_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_events_date ON public.events(starts_at);
CREATE INDEX idx_events_type ON public.events(event_type);
