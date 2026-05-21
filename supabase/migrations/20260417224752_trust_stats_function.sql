-- R1 from docs/RETENTION_ROADMAP_2026.md — live stats for the public /trust
-- page. SECURITY DEFINER so the anon role can invoke without needing direct
-- information_schema / pg_catalog permissions.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_trust_stats()
RETURNS TABLE (
  public_tables integer,
  rls_enabled integer,
  rls_disabled integer,
  policies integer,
  migrations integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
STABLE
AS $$
  SELECT
    (SELECT COUNT(*)::int FROM pg_tables WHERE schemaname = 'public')                           AS public_tables,
    (SELECT COUNT(*)::int FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true)    AS rls_enabled,
    (SELECT COUNT(*)::int FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false)   AS rls_disabled,
    (SELECT COUNT(*)::int FROM pg_policies WHERE schemaname = 'public')                         AS policies,
    (SELECT COUNT(*)::int FROM supabase_migrations.schema_migrations)                           AS migrations;
$$;

-- Allow anonymous reads — these numbers are intentionally public.
GRANT EXECUTE ON FUNCTION public.get_trust_stats() TO anon, authenticated, service_role;

COMMIT;
