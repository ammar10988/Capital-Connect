-- Backfill founder_profiles for founders who completed onboarding
-- but never got a founder_profiles row (handleFinish didn't upsert it).
-- Uses profiles.company as company_name so their card appears in the marketplace.

INSERT INTO public.founder_profiles (profile_id, founder_type, company_name, updated_at)
SELECT
  p.id                                AS profile_id,
  COALESCE(p.founder_type, 'active')  AS founder_type,
  NULLIF(TRIM(p.company), '')         AS company_name,
  NOW()                               AS updated_at
FROM public.profiles p
WHERE p.role = 'founder'
  AND p.onboarding_completed = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.founder_profiles fp WHERE fp.profile_id = p.id
  )
ON CONFLICT (profile_id) DO NOTHING;
