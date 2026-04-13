-- ============================================================
-- Fix: add INSERT policy for profiles so upsert works during
-- onboarding even if the trigger-created row is somehow absent.
-- Also replace the recursive SELECT policies with a single
-- simple "authenticated users can read all profiles" policy,
-- which is what the app needs for investor/founder discovery.
-- ============================================================

-- 1. Drop the recursive SELECT policies that query profiles from
--    within a profiles policy (potential for unpredictable behaviour
--    depending on PostgreSQL planner version).
DROP POLICY IF EXISTS "profiles: investor can view other investors" ON public.profiles;
DROP POLICY IF EXISTS "profiles: founders can view investors"       ON public.profiles;

-- 2. Replace with a single permissive SELECT for all authenticated
--    users (investors browse founders, founders browse investors).
CREATE POLICY "profiles: authenticated can read all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 3. Add INSERT policy so the client-side upsert in completeOnboarding
--    can create the row when the trigger-created row is absent.
DROP POLICY IF EXISTS "profiles: own insert" ON public.profiles;
CREATE POLICY "profiles: own insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
