CREATE TABLE public.profile_views (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id    UUID REFERENCES public.profiles(id),
  startup_id   UUID REFERENCES public.startup_applications(id) ON DELETE CASCADE,
  viewer_firm  TEXT,
  viewed_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_views_startup ON public.profile_views(startup_id, viewed_at DESC);
CREATE INDEX idx_views_viewer  ON public.profile_views(viewer_id);
