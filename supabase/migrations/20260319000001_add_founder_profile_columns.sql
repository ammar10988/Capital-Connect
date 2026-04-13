-- Add missing columns to founder_profiles that MyListingPage uses
ALTER TABLE public.founder_profiles
  ADD COLUMN IF NOT EXISTS website        TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url   TEXT,
  ADD COLUMN IF NOT EXISTS team_size      INT,
  ADD COLUMN IF NOT EXISTS founded_year   INT,
  ADD COLUMN IF NOT EXISTS funding_purpose TEXT;
