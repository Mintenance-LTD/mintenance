-- 001_profiles.sql
-- Purpose: Standardize identity and app profile separation.
-- - Creates public.profiles linked to auth.users
-- - Seeds profiles on new auth user
-- - Exposes a convenience view public.v_users
-- Safe to run multiple times (IF NOT EXISTS guards)

BEGIN;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('homeowner','contractor')),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE VIEW public.v_users AS
SELECT u.id, u.email,
       p.role, p.first_name, p.last_name, p.phone, p.address, p.profile_image_url,
       p.created_at, p.updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;

COMMIT;

-- Audit helper (run manually if you plan to update FKs):
-- SELECT tc.table_schema, tc.table_name, kcu.column_name
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name
-- JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name
-- WHERE tc.constraint_type='FOREIGN KEY' AND ccu.table_schema='public' AND ccu.table_name='users';

