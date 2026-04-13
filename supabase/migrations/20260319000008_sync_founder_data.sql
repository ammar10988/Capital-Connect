-- 1. Ensure every onboarding-completed founder has a founder_profiles row
INSERT INTO public.founder_profiles (profile_id, founder_type, company_name, updated_at)
SELECT
  p.id,
  COALESCE(p.founder_type, 'active'),
  NULLIF(TRIM(p.company), ''),
  NOW()
FROM public.profiles p
WHERE p.role = 'founder'
  AND p.onboarding_completed = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.founder_profiles fp WHERE fp.profile_id = p.id
  )
ON CONFLICT (profile_id) DO NOTHING;

-- 2. For rows where company_name is NULL or empty, backfill from profiles.company
UPDATE public.founder_profiles fp
SET
  company_name = NULLIF(TRIM(p.company), ''),
  updated_at   = NOW()
FROM public.profiles p
WHERE fp.profile_id = p.id
  AND (fp.company_name IS NULL OR TRIM(fp.company_name) = '')
  AND p.company IS NOT NULL
  AND TRIM(p.company) != '';

-- 3. For rows that still have no company_name, pull from onboarding_data
--    (the 'complete' step stores founderData as JSONB in step_data)
UPDATE public.founder_profiles fp
SET
  company_name = od.step_data->>'company_name',
  sector       = COALESCE(NULLIF(fp.sector, ''),       od.step_data->>'sector'),
  stage        = COALESCE(NULLIF(fp.stage, ''),        od.step_data->>'stage'),
  target_market = COALESCE(NULLIF(fp.target_market,''), od.step_data->>'target_market'),
  problem_statement = COALESCE(NULLIF(fp.problem_statement,''), od.step_data->>'problem_statement'),
  updated_at   = NOW()
FROM public.onboarding_data od
WHERE od.user_id = fp.profile_id
  AND od.step_key = 'complete'
  AND od.step_data->>'company_name' IS NOT NULL
  AND TRIM(od.step_data->>'company_name') != ''
  AND (fp.company_name IS NULL OR TRIM(fp.company_name) = '');
