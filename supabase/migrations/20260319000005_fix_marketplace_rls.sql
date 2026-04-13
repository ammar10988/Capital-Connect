-- 1. Allow investors to see ALL founder profiles in the marketplace
--    (not just verified=TRUE — that was too restrictive for a marketplace)
DROP POLICY IF EXISTS "Investors read verified founders" ON public.founder_profiles;

CREATE POLICY "Investors read all founders"
  ON public.founder_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'investor'
    )
  );

-- Founders should also be able to see other founder profiles (for community)
DROP POLICY IF EXISTS "Founders read other founders" ON public.founder_profiles;

CREATE POLICY "Founders read other founders"
  ON public.founder_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'founder'
    )
  );

-- 2. Allow authenticated users to read basic info of founder profiles
--    (needed so the join profile:profiles(...) works in StartupMarketplacePage)
DROP POLICY IF EXISTS "profiles: authenticated read founders" ON public.profiles;

CREATE POLICY "profiles: authenticated read founders"
  ON public.profiles FOR SELECT
  USING (
    role = 'founder' AND auth.uid() IS NOT NULL
  );
