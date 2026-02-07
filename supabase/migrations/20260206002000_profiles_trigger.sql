-- Migration: Profiles trigger and convenience view (from root migrations)
-- Date: 2026-02-06

BEGIN;

-- Ensure a default role so profile creation on auth insert is valid
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT ''homeowner''';
  END IF;
END $$;

-- Create trigger to seed profiles on auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'homeowner')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Convenience view for auth users + profiles
CREATE OR REPLACE VIEW public.v_users AS
SELECT
  u.id,
  u.email,
  p.role,
  p.first_name,
  p.last_name,
  p.phone,
  p.avatar_url,
  p.bio,
  p.verified,
  p.created_at,
  p.updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;

COMMIT;
