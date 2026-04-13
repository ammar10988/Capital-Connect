-- Add missing columns to profiles used by SettingsPage
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio                      TEXT,
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS privacy_settings         JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS appearance_preferences   JSONB DEFAULT '{}';
