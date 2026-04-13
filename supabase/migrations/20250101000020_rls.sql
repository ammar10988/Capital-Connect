-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_data       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_downloads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.introductions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_rounds        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_startups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_trend_data     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_articles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovered_investors  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles
-- ============================================================
CREATE POLICY "profiles: own read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: own update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Investors can see other investor profiles (for directory)
CREATE POLICY "profiles: investor can view other investors"
  ON public.profiles FOR SELECT
  USING (
    role = 'investor'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'investor'
    )
  );

-- Founders can view investor profiles
CREATE POLICY "profiles: founders can view investors"
  ON public.profiles FOR SELECT
  USING (
    role = 'investor'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'founder'
    )
  );

-- ============================================================
-- onboarding_data
-- ============================================================
CREATE POLICY "onboarding: own select"
  ON public.onboarding_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "onboarding: own insert"
  ON public.onboarding_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "onboarding: own update"
  ON public.onboarding_data FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "onboarding: own delete"
  ON public.onboarding_data FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- investor_profiles
-- ============================================================
CREATE POLICY "investor_profiles: own select"
  ON public.investor_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "investor_profiles: own insert"
  ON public.investor_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "investor_profiles: own update"
  ON public.investor_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Founders can view investor profiles (for matching / discovery)
CREATE POLICY "investor_profiles: founders can view"
  ON public.investor_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'founder'
    )
  );

-- Investors can view other investor profiles
CREATE POLICY "investor_profiles: investors can view others"
  ON public.investor_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'investor'
    )
  );

-- ============================================================
-- startup_applications
-- ============================================================
CREATE POLICY "startups: founder owns"
  ON public.startup_applications FOR ALL
  USING (auth.uid() = founder_id)
  WITH CHECK (auth.uid() = founder_id);

-- Investors can read approved startups
CREATE POLICY "startups: investors read approved"
  ON public.startup_applications FOR SELECT
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'investor'
    )
  );

-- ============================================================
-- bookmarks
-- ============================================================
CREATE POLICY "bookmarks: own select"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "bookmarks: own insert"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookmarks: own delete"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- profile_views
-- ============================================================
-- Investors can insert views
CREATE POLICY "profile_views: investor insert"
  ON public.profile_views FOR INSERT
  WITH CHECK (
    auth.uid() = viewer_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'investor'
    )
  );

-- Founders can see who viewed their startups
CREATE POLICY "profile_views: founder sees own startup views"
  ON public.profile_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_applications s
      WHERE s.id = startup_id AND s.founder_id = auth.uid()
    )
  );

-- Investors can see their own views
CREATE POLICY "profile_views: investor sees own views"
  ON public.profile_views FOR SELECT
  USING (auth.uid() = viewer_id);

-- ============================================================
-- deck_downloads
-- ============================================================
CREATE POLICY "deck_downloads: investor insert"
  ON public.deck_downloads FOR INSERT
  WITH CHECK (
    auth.uid() = investor_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'investor'
    )
  );

CREATE POLICY "deck_downloads: founder sees own startup downloads"
  ON public.deck_downloads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_applications s
      WHERE s.id = startup_id AND s.founder_id = auth.uid()
    )
  );

CREATE POLICY "deck_downloads: investor sees own"
  ON public.deck_downloads FOR SELECT
  USING (auth.uid() = investor_id);

-- ============================================================
-- introductions
-- ============================================================
CREATE POLICY "intros: investor insert"
  ON public.introductions FOR INSERT
  WITH CHECK (
    auth.uid() = investor_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'investor'
    )
  );

CREATE POLICY "intros: investor select own"
  ON public.introductions FOR SELECT
  USING (auth.uid() = investor_id);

CREATE POLICY "intros: founder select own startup"
  ON public.introductions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_applications s
      WHERE s.id = startup_id AND s.founder_id = auth.uid()
    )
  );

-- Founder can update status (accept/decline)
CREATE POLICY "intros: founder update status"
  ON public.introductions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_applications s
      WHERE s.id = startup_id AND s.founder_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.startup_applications s
      WHERE s.id = startup_id AND s.founder_id = auth.uid()
    )
  );

-- ============================================================
-- deals
-- ============================================================
CREATE POLICY "deals: investor owns"
  ON public.deals FOR ALL
  USING (auth.uid() = investor_id)
  WITH CHECK (auth.uid() = investor_id);

-- ============================================================
-- portfolio_items
-- ============================================================
CREATE POLICY "portfolio: investor owns"
  ON public.portfolio_items FOR ALL
  USING (auth.uid() = investor_id)
  WITH CHECK (auth.uid() = investor_id);

-- ============================================================
-- funding_rounds  (public read)
-- ============================================================
CREATE POLICY "funding_rounds: authenticated read"
  ON public.funding_rounds FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- news_articles  (public read)
-- ============================================================
CREATE POLICY "news_articles: authenticated read"
  ON public.news_articles FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- trending_startups  (public read)
-- ============================================================
CREATE POLICY "trending: authenticated read"
  ON public.trending_startups FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- events  (public read)
-- ============================================================
CREATE POLICY "events: authenticated read"
  ON public.events FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- event_rsvps
-- ============================================================
CREATE POLICY "event_rsvps: own select"
  ON public.event_rsvps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "event_rsvps: own insert"
  ON public.event_rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event_rsvps: own delete"
  ON public.event_rsvps FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- sectors  (public read)
-- ============================================================
CREATE POLICY "sectors: authenticated read"
  ON public.sectors FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "sector_trend_data: authenticated read"
  ON public.sector_trend_data FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- notifications
-- ============================================================
CREATE POLICY "notifications: own select"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications: own update"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications: own delete"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- saved_searches
-- ============================================================
CREATE POLICY "saved_searches: own all"
  ON public.saved_searches FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- chat_sessions
-- ============================================================
CREATE POLICY "chat_sessions: own all"
  ON public.chat_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- raw_articles  (service role only — no user-level access)
-- ============================================================
CREATE POLICY "raw_articles: service role only"
  ON public.raw_articles FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- discovered_investors  (authenticated read, service role write)
-- ============================================================
CREATE POLICY "disc_inv: authenticated read"
  ON public.discovered_investors FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "disc_inv: service role write"
  ON public.discovered_investors FOR ALL
  USING (auth.role() = 'service_role');
