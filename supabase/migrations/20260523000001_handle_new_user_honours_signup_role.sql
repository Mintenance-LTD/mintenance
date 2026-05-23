-- 2026-05-23: handle_new_user() previously hard-coded role='homeowner'
-- on every signup. Both the web (apps/web/lib/auth-manager.ts) and the
-- mobile app (apps/mobile/src/services/AuthService.ts) forward the
-- chosen role to Supabase via `signUp({ options: { data: { role, ... } } })`,
-- which lands in auth.users.raw_user_meta_data. The trigger ignored that
-- payload entirely, so every contractor signup became a homeowner — and
-- contractor onboarding / bidding routes were unreachable for new accounts.
--
-- Fix: extract role + first_name + last_name + phone from the signup
-- metadata and persist them on the profile row.
--
-- Defensive choices:
--   * `role` is whitelisted to ('homeowner','contractor'). 'admin' must
--     never be settable from the client-supplied metadata blob.
--   * Empty strings collapse to NULL (avoid storing trim-empty values).
--   * ON CONFLICT (id) DO NOTHING preserved — same defensive idempotency
--     the previous version had against double-fire of the trigger.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_phone TEXT;
BEGIN
  -- Extract role from signup metadata; whitelist + fall back to homeowner.
  v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'homeowner');
  IF v_role NOT IN ('homeowner', 'contractor') THEN
    v_role := 'homeowner';
  END IF;

  v_first_name := NULLIF(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name  := NULLIF(NEW.raw_user_meta_data->>'last_name', '');
  v_phone      := NULLIF(NEW.raw_user_meta_data->>'phone', '');

  INSERT INTO public.profiles (id, email, role, first_name, last_name, phone)
  VALUES (NEW.id, NEW.email, v_role, v_first_name, v_last_name, v_phone)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger definition is unchanged from prior migrations — re-applying it
-- here is a no-op IF EXISTS so the migration is safe even though the
-- trigger was already created by an earlier file.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS
  'Provisions a public.profiles row on auth.users insert. Reads role/first_name/last_name/phone from raw_user_meta_data (set by signUp options.data). role is whitelisted to homeowner|contractor and defaults to homeowner.';
