-- Sprint 1.2 / DB-P0-1: Add service_role-only policies to 8 internal/system
-- tables that have RLS enabled but no policies. Without these, anon and
-- authenticated roles can never read/write them (which is correct for internal
-- use) but the advisor flags the lack of policies as a configuration bug.
--
-- These tables are written by cron jobs and read by admin dashboards only.
-- Service role bypasses RLS by default, so the policy is defense-in-depth +
-- audit clarity.

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'ab_arms', 'ab_calibration_data', 'cdn_upload_queue',
    'learning_model_versions', 'ml_metrics', 'performance_metrics',
    'production_metrics', 'rate_limits'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS service_role_only ON public.%I;
      CREATE POLICY service_role_only ON public.%I
        FOR ALL TO service_role
        USING (true) WITH CHECK (true);
    $f$, tbl, tbl);
  END LOOP;
END $$;;
