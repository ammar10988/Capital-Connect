-- ─── 1. Add founder_id to introductions ─────────────────────────────────────
-- Allows founders to send intros without needing a startup_application row.
ALTER TABLE public.introductions
  ADD COLUMN IF NOT EXISTS founder_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ─── 2. Fix INSERT — founders request intros, not investors ──────────────────
DROP POLICY IF EXISTS "intros: investor insert" ON public.introductions;
DROP POLICY IF EXISTS "intros: founder insert" ON public.introductions;

CREATE POLICY "intros: founder insert"
  ON public.introductions FOR INSERT
  WITH CHECK (
    auth.uid() = founder_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'founder'
    )
  );

-- ─── 3. SELECT for founders by founder_id ────────────────────────────────────
DROP POLICY IF EXISTS "intros: founder select own" ON public.introductions;

CREATE POLICY "intros: founder select own"
  ON public.introductions FOR SELECT
  USING (auth.uid() = founder_id);

-- ─── 4. UPDATE for investors (accept / decline) ──────────────────────────────
DROP POLICY IF EXISTS "intros: investor update" ON public.introductions;

CREATE POLICY "intros: investor update"
  ON public.introductions FOR UPDATE
  USING (auth.uid() = investor_id)
  WITH CHECK (auth.uid() = investor_id);

-- ─── 5. Notifications: allow any authenticated user to insert ─────────────────
-- Required so founders can notify investors and vice versa.
DROP POLICY IF EXISTS "notifications: authenticated insert" ON public.notifications;

CREATE POLICY "notifications: authenticated insert"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
