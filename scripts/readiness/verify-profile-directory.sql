-- Run on the isolated readiness database after applying the privacy migration.
BEGIN READ ONLY;
DO $$
DECLARE directory_owner oid;
BEGIN
  SELECT relowner INTO directory_owner FROM pg_class
  WHERE oid = 'public.profile_directory'::regclass;
  IF directory_owner <> 'profile_directory_reader'::regrole THEN
    RAISE EXCEPTION 'Directory must be owned by the restricted directory role';
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE oid = directory_owner AND
    (rolsuper OR rolbypassrls OR rolcanlogin OR rolcreaterole OR rolcreatedb)) THEN
    RAISE EXCEPTION 'Directory owner has excessive privileges';
  END IF;
  IF pg_has_role('authenticated', directory_owner, 'MEMBER') OR
     pg_has_role('anon', directory_owner, 'MEMBER') THEN
    RAISE EXCEPTION 'API roles must not assume the directory owner role';
  END IF;
  IF has_column_privilege(directory_owner, 'public.profiles', 'email', 'SELECT') OR
     has_column_privilege(directory_owner, 'public.profiles', 'phone', 'SELECT') OR
     has_column_privilege(directory_owner, 'public.profiles', 'address', 'SELECT') OR
     has_table_privilege(directory_owner, 'public.profiles', 'UPDATE') THEN
    RAISE EXCEPTION 'Directory owner can access private data or mutate profiles';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass) OR
     NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.contractor_payout_credit_events'::regclass) THEN
    RAISE EXCEPTION 'Required row-level security is disabled';
  END IF;
END
$$;
ROLLBACK;
