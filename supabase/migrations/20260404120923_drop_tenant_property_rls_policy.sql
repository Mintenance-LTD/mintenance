-- 2026-05-21 drift-cleanup: recovered from supabase_migrations.schema_migrations.

-- Remove the tenant RLS policy that may interfere with property queries.
-- Tenant access to properties will be handled at the API layer instead.
DROP POLICY IF EXISTS "Tenants can view linked properties" ON public.properties;
