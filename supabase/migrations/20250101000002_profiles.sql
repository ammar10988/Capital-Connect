CREATE TABLE public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                  TEXT CHECK (role IN ('investor', 'founder')),
  investor_type         TEXT CHECK (investor_type IN (
                          'angel', 'venture-capital', 'bank',
                          'nbfc', 'family-office', 'corporate-venture'
                        )),
  founder_type          TEXT CHECK (founder_type IN ('active', 'idea')),
  first_name            TEXT NOT NULL DEFAULT '',
  last_name             TEXT,
  company               TEXT,
  avatar_url            TEXT,
  onboarding_completed  BOOLEAN DEFAULT FALSE,
  last_seen_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, company)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
    NEW.raw_user_meta_data->>'lastName',
    NEW.raw_user_meta_data->>'company'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
