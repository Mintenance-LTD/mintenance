-- =============================================================================
-- Fix Linter: Function Search Path Mutable + Materialized View in API
-- - Set search_path = 'public, extensions' on all public functions that lack it.
-- - Revoke SELECT on flagged materialized views from anon, authenticated.
-- See: https://supabase.com/docs/guides/database/database-linter
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SET search_path ON PUBLIC FUNCTIONS (fix function_search_path_mutable)
-- Only alter functions that do not already have search_path set.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  fn_sig text;
  altered int := 0;
  skipped int := 0;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
           p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND (p.proconfig IS NULL
           OR NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c
                         WHERE c LIKE 'search_path=%'))
  LOOP
    fn_sig := format('%I.%I(%s)', 'public', r.proname, r.args);
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', fn_sig);
      altered := altered + 1;
    EXCEPTION WHEN OTHERS THEN
      skipped := skipped + 1;
      RAISE WARNING 'Could not alter %: %', fn_sig, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'Altered % functions, skipped %', altered, skipped;
END $$;

-- -----------------------------------------------------------------------------
-- 2. REVOKE DATA API ACCESS ON MATERIALIZED VIEWS (fix materialized_view_in_api)
-- Revoke SELECT from anon and authenticated; service_role retains access.
-- -----------------------------------------------------------------------------
REVOKE SELECT ON public.mv_user_activity FROM anon, authenticated;
REVOKE SELECT ON public.dashboard_stats FROM anon, authenticated;
REVOKE SELECT ON public.mv_user_performance_analytics FROM anon, authenticated;
REVOKE SELECT ON public.mv_job_statistics FROM anon, authenticated;
REVOKE SELECT ON public.mv_validated_assessments FROM anon, authenticated;
REVOKE SELECT ON public.mv_stratum_routing_performance FROM anon, authenticated;
REVOKE SELECT ON public.trending_searches FROM anon, authenticated;
REVOKE SELECT ON public.notification_engagement_analytics FROM anon, authenticated;
REVOKE SELECT ON public.titans_effectiveness_latest_mv FROM anon, authenticated;

COMMIT;
