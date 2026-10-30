-- Build-time read access to migration metadata only. No customer data or DDL.
CREATE OR REPLACE FUNCTION public.release_migration_status()
RETURNS TABLE(version text, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT m.version::text, m.name::text
  FROM supabase_migrations.schema_migrations m
  ORDER BY m.version;
$$;
REVOKE ALL ON FUNCTION public.release_migration_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_migration_status() TO service_role;
COMMENT ON FUNCTION public.release_migration_status() IS
  'Service-only release preflight. Returns migration identifiers, never statements or application data.';

