\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY['role', 'verified', 'admin_verified', 'background_check_status', 'email', 'id'] LOOP
    IF has_column_privilege('authenticated', 'public.profiles', c, 'UPDATE') THEN
      RAISE EXCEPTION 'Protected profile column writable: %', c;
    END IF;
  END LOOP;
  IF has_table_privilege('authenticated', 'public.profiles', 'INSERT')
     OR has_table_privilege('authenticated', 'public.profiles', 'DELETE')
     OR has_table_privilege('anon', 'public.profiles', 'TRUNCATE') THEN
    RAISE EXCEPTION 'Unsafe profile table mutation grant';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.profiles', 'first_name', 'UPDATE') THEN
    RAISE EXCEPTION 'Ordinary profile editing permission missing';
  END IF;
END $$;
ROLLBACK;
