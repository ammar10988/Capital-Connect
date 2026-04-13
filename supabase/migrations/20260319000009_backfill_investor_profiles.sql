-- Backfill investor_profiles for investors who completed onboarding
-- before the AuthContext bug was fixed (saved to non-existent
-- 'investor_preferences' table instead of 'investor_profiles').
--
-- We can only recover what's in onboarding_data.step_data JSONB.
-- The 'complete' step stores { role, investorType, founderType }.
-- Individual step data is stored per step_key.
-- We insert a minimal row so these investors appear in Browse Investors.

INSERT INTO public.investor_profiles (user_id, updated_at)
SELECT
  p.id,
  NOW()
FROM public.profiles p
WHERE p.role = 'investor'
  AND p.onboarding_completed = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.investor_profiles ip WHERE ip.user_id = p.id
  )
ON CONFLICT (user_id) DO NOTHING;
