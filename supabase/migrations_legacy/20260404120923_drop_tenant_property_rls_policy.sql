-- Remove the tenant RLS policy that may interfere with property queries.
-- Tenant access to properties will be handled at the API layer instead.
DROP POLICY IF EXISTS "Tenants can view linked properties" ON public.properties;;
