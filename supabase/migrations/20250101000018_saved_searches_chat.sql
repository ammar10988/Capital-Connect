CREATE TABLE public.saved_searches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  filters      JSONB NOT NULL DEFAULT '{}',
  result_count INT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode        TEXT CHECK (mode IN ('compliance','market-intel','fundraising')),
  messages    JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mode)
);
