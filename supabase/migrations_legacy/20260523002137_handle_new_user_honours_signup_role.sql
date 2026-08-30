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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS
  'Provisions a public.profiles row on auth.users insert. Reads role/first_name/last_name/phone from raw_user_meta_data (set by signUp options.data). role is whitelisted to homeowner|contractor and defaults to homeowner.';;
