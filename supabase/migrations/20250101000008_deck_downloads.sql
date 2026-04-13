CREATE TABLE public.deck_downloads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id   UUID REFERENCES public.profiles(id),
  startup_id    UUID REFERENCES public.startup_applications(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_deck_downloads_startup ON public.deck_downloads(startup_id);
