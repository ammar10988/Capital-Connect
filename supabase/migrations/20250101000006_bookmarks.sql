CREATE TABLE public.bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  startup_id  UUID REFERENCES public.startup_applications(id) ON DELETE CASCADE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, startup_id)
);
CREATE INDEX idx_bookmarks_user    ON public.bookmarks(user_id);
CREATE INDEX idx_bookmarks_startup ON public.bookmarks(startup_id);
