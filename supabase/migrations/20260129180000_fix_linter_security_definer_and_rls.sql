-- =============================================================================
-- Fix Supabase Linter: Security Definer Views + RLS Disabled
-- - Alter 24 views to SECURITY INVOKER (use caller's permissions, not owner's).
-- - Enable RLS on 11 tables (spatial_ref_sys excluded: PostGIS-owned) and add minimal policies.
-- See: https://supabase.com/docs/guides/database/database-linter
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SECURITY DEFINER VIEWS → SECURITY INVOKER (PostgreSQL 15+)
-- Views run with querying user's permissions instead of view owner's.
-- -----------------------------------------------------------------------------
ALTER VIEW IF EXISTS public.v_fnr_edge_cases SET (security_invoker = on);
ALTER VIEW IF EXISTS public.rls_coverage_check SET (security_invoker = on);
ALTER VIEW IF EXISTS public.training_data_status SET (security_invoker = on);
ALTER VIEW IF EXISTS public.budget_anchoring_analytics SET (security_invoker = on);
ALTER VIEW IF EXISTS public.suspicious_ips SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_fnr_monitoring_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_fnr_recent_escalations SET (security_invoker = on);
ALTER VIEW IF EXISTS public.table_sizes SET (security_invoker = on);
ALTER VIEW IF EXISTS public.contractor_job_interactions SET (security_invoker = on);
ALTER VIEW IF EXISTS public.ab_arm_comparison SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_conformal_routing_analytics SET (security_invoker = on);
ALTER VIEW IF EXISTS public.maintenance_daily_stats SET (security_invoker = on);
ALTER VIEW IF EXISTS public.database_index_usage SET (security_invoker = on);
ALTER VIEW IF EXISTS public.database_slow_queries SET (security_invoker = on);
ALTER VIEW IF EXISTS public.ab_experiment_status SET (security_invoker = on);
ALTER VIEW IF EXISTS public.feature_flag_stats SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_calibration_summary SET (security_invoker = on);
ALTER VIEW IF EXISTS public.model_ab_test_metrics SET (security_invoker = on);
ALTER VIEW IF EXISTS public.database_table_stats SET (security_invoker = on);
ALTER VIEW IF EXISTS public.security_dashboard SET (security_invoker = on);
ALTER VIEW IF EXISTS public.failed_login_attempts SET (security_invoker = on);
ALTER VIEW IF EXISTS public.yolo_models_comparison SET (security_invoker = on);
ALTER VIEW IF EXISTS public.contractor_schedule_overview SET (security_invoker = on);
ALTER VIEW IF EXISTS public.yolo_savings_analytics SET (security_invoker = on);
ALTER VIEW IF EXISTS public.contractor_feedback_summary SET (security_invoker = on);

-- -----------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY ON TABLES
-- (spatial_ref_sys skipped: PostGIS-owned system table, cannot alter ownership.)
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.contractor_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ab_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ab_historical_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ab_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feature_extractor_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.self_modification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.yolo_model_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.token_cleanup_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. RLS POLICIES
-- Internal/admin tables: no permissive policies → only service_role (bypass) can access.
-- newsletter_subscriptions: allow anon INSERT only (signup); no SELECT.
-- -----------------------------------------------------------------------------

-- newsletter_subscriptions: anon can insert (signup), no SELECT
DROP POLICY IF EXISTS "Allow anon insert newsletter_subscriptions" ON public.newsletter_subscriptions;
CREATE POLICY "Allow anon insert newsletter_subscriptions" ON public.newsletter_subscriptions
  FOR INSERT TO anon WITH CHECK (true);

-- contractor_contributions, maintenance_performance_metrics, ab_*, feature_extractor_ab_tests,
-- self_modification_events, yolo_model_migrations, schema_migrations, token_cleanup_logs:
-- no permissive policies → only service_role (bypasses RLS) can access.

COMMIT;
