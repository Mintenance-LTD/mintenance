-- =============================================================================
-- RLS Policies for Unprotected Tables
-- Addresses: VULN-003 (CVSS 8.5) - 11 tables with RLS enabled but no policies
--
-- Security Context:
-- These tables currently rely entirely on service_role bypass for access.
-- If the service_role key leaks, all data becomes exposed.
-- This migration adds defense-in-depth with proper RLS policies.
--
-- Tables Protected:
-- 1. contractor_contributions - Contractor training data contributions
-- 2. maintenance_performance_metrics - Performance tracking data
-- 3. ab_checkpoints - A/B testing checkpoints
-- 4. ab_historical_validations - Historical validation data
-- 5. ab_audit_log - A/B test audit trail
-- 6. feature_extractor_ab_tests - Feature extraction tests
-- 7. self_modification_events - AI self-modification tracking
-- 8. yolo_model_migrations - YOLO model version tracking
-- 9. schema_migrations - Database schema versions
-- 10. token_cleanup_logs - Token cleanup audit trail
-- 11. newsletter_subscriptions - Already has policy, verifying completeness
-- =============================================================================

BEGIN;

-- =============================================================================
-- PATTERN A: USER-OWNED DATA WITH ADMIN OVERSIGHT
-- Tables: contractor_contributions, maintenance_performance_metrics
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. contractor_contributions
-- Contractors can view/update their own contribution data
-- Admins can view all contribution data for management
-- Service role has full access for backend operations
-- -----------------------------------------------------------------------------

-- Policy: Contractors can view their own contributions
DROP POLICY IF EXISTS "contractors_select_own_contributions" ON public.contractor_contributions;
CREATE POLICY "contractors_select_own_contributions" ON public.contractor_contributions
  FOR SELECT
  TO authenticated
  USING (contractor_id = auth.uid());

-- Policy: Contractors can update their own contributions
DROP POLICY IF EXISTS "contractors_update_own_contributions" ON public.contractor_contributions;
CREATE POLICY "contractors_update_own_contributions" ON public.contractor_contributions
  FOR UPDATE
  TO authenticated
  USING (contractor_id = auth.uid())
  WITH CHECK (contractor_id = auth.uid());

-- Policy: Service role can insert new contribution records
DROP POLICY IF EXISTS "service_insert_contributions" ON public.contractor_contributions;
CREATE POLICY "service_insert_contributions" ON public.contractor_contributions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Admins can view all contributions
DROP POLICY IF EXISTS "admins_select_all_contributions" ON public.contractor_contributions;
CREATE POLICY "admins_select_all_contributions" ON public.contractor_contributions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Service role has full access
DROP POLICY IF EXISTS "service_all_contributions" ON public.contractor_contributions;
CREATE POLICY "service_all_contributions" ON public.contractor_contributions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 2. maintenance_performance_metrics
-- System-level metrics, read-only for authenticated users
-- Only service role and admins can modify
-- -----------------------------------------------------------------------------

-- Policy: Authenticated users can read performance metrics
DROP POLICY IF EXISTS "authenticated_read_metrics" ON public.maintenance_performance_metrics;
CREATE POLICY "authenticated_read_metrics" ON public.maintenance_performance_metrics
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins can view all metrics
DROP POLICY IF EXISTS "admins_select_all_metrics" ON public.maintenance_performance_metrics;
CREATE POLICY "admins_select_all_metrics" ON public.maintenance_performance_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Service role has full access for metrics collection
DROP POLICY IF EXISTS "service_all_metrics" ON public.maintenance_performance_metrics;
CREATE POLICY "service_all_metrics" ON public.maintenance_performance_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- PATTERN B: A/B TESTING TABLES - RESTRICTED ACCESS
-- Tables: ab_checkpoints, ab_historical_validations, ab_audit_log, feature_extractor_ab_tests
-- Only service role and admins should access experimental data
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3. ab_checkpoints
-- A/B test checkpoint data - admin and service role only
-- -----------------------------------------------------------------------------

-- Policy: Admins can view all A/B checkpoints
DROP POLICY IF EXISTS "admins_select_ab_checkpoints" ON public.ab_checkpoints;
CREATE POLICY "admins_select_ab_checkpoints" ON public.ab_checkpoints
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Service role has full access
DROP POLICY IF EXISTS "service_all_ab_checkpoints" ON public.ab_checkpoints;
CREATE POLICY "service_all_ab_checkpoints" ON public.ab_checkpoints
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 4. ab_historical_validations
-- Historical A/B test validation data - admin and service role only
-- -----------------------------------------------------------------------------

-- Policy: Admins can view all historical validations
DROP POLICY IF EXISTS "admins_select_ab_historical" ON public.ab_historical_validations;
CREATE POLICY "admins_select_ab_historical" ON public.ab_historical_validations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Service role has full access
DROP POLICY IF EXISTS "service_all_ab_historical" ON public.ab_historical_validations;
CREATE POLICY "service_all_ab_historical" ON public.ab_historical_validations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 5. ab_audit_log
-- A/B test audit trail - append-only for authenticated, read for admins
-- -----------------------------------------------------------------------------

-- Policy: Authenticated users can insert audit logs
DROP POLICY IF EXISTS "authenticated_insert_ab_audit" ON public.ab_audit_log;
CREATE POLICY "authenticated_insert_ab_audit" ON public.ab_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Admins can view all audit logs
DROP POLICY IF EXISTS "admins_select_ab_audit" ON public.ab_audit_log;
CREATE POLICY "admins_select_ab_audit" ON public.ab_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Service role has full access
DROP POLICY IF EXISTS "service_all_ab_audit" ON public.ab_audit_log;
CREATE POLICY "service_all_ab_audit" ON public.ab_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 6. feature_extractor_ab_tests
-- Feature extraction A/B tests - admin and service role only
-- -----------------------------------------------------------------------------

-- Policy: Admins can view all feature extraction tests
DROP POLICY IF EXISTS "admins_select_feature_tests" ON public.feature_extractor_ab_tests;
CREATE POLICY "admins_select_feature_tests" ON public.feature_extractor_ab_tests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Service role has full access
DROP POLICY IF EXISTS "service_all_feature_tests" ON public.feature_extractor_ab_tests;
CREATE POLICY "service_all_feature_tests" ON public.feature_extractor_ab_tests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- PATTERN C: AI SYSTEM TABLES - STRICT CONTROL
-- Tables: self_modification_events, yolo_model_migrations
-- Critical AI system data - service role and admin only
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 7. self_modification_events
-- AI self-modification tracking - audit trail, admins can read
-- -----------------------------------------------------------------------------

-- Policy: Admins can view all self-modification events
DROP POLICY IF EXISTS "admins_select_self_mod_events" ON public.self_modification_events;
CREATE POLICY "admins_select_self_mod_events" ON public.self_modification_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Service role has full access
DROP POLICY IF EXISTS "service_all_self_mod_events" ON public.self_modification_events;
CREATE POLICY "service_all_self_mod_events" ON public.self_modification_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 8. yolo_model_migrations
-- YOLO model version tracking - service role and admin only
-- -----------------------------------------------------------------------------

-- Policy: Admins can view all model migrations
DROP POLICY IF EXISTS "admins_select_model_migrations" ON public.yolo_model_migrations;
CREATE POLICY "admins_select_model_migrations" ON public.yolo_model_migrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Service role has full access
DROP POLICY IF EXISTS "service_all_model_migrations" ON public.yolo_model_migrations;
CREATE POLICY "service_all_model_migrations" ON public.yolo_model_migrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- PATTERN D: SYSTEM TABLES - READ-ONLY FOR DEBUGGING
-- Tables: schema_migrations, token_cleanup_logs
-- System maintenance tables - service role modifies, admins can read
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 9. schema_migrations
-- Database schema version tracking - critical system table
-- Service role only can modify, admins can read for debugging
-- -----------------------------------------------------------------------------

-- Policy: Admins can view schema migrations
DROP POLICY IF EXISTS "admins_select_schema_migrations" ON public.schema_migrations;
CREATE POLICY "admins_select_schema_migrations" ON public.schema_migrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Service role has full access
DROP POLICY IF EXISTS "service_all_schema_migrations" ON public.schema_migrations;
CREATE POLICY "service_all_schema_migrations" ON public.schema_migrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 10. token_cleanup_logs
-- Token cleanup audit trail - service role writes, admins read
-- -----------------------------------------------------------------------------

-- Policy: Admins can view cleanup logs
DROP POLICY IF EXISTS "admins_select_cleanup_logs" ON public.token_cleanup_logs;
CREATE POLICY "admins_select_cleanup_logs" ON public.token_cleanup_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Service role has full access
DROP POLICY IF EXISTS "service_all_cleanup_logs" ON public.token_cleanup_logs;
CREATE POLICY "service_all_cleanup_logs" ON public.token_cleanup_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- PATTERN E: PUBLIC SIGNUP TABLE
-- Table: newsletter_subscriptions
-- Verify existing policy is sufficient
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 11. newsletter_subscriptions
-- Already has policy from 20260129180000_fix_linter_security_definer_and_rls.sql
-- Verified: anon can insert (signup), admins can view
-- Adding admin read policy for completeness
-- -----------------------------------------------------------------------------

-- Policy: Admins can view all newsletter subscriptions
DROP POLICY IF EXISTS "admins_select_newsletter" ON public.newsletter_subscriptions;
CREATE POLICY "admins_select_newsletter" ON public.newsletter_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Service role has full access
DROP POLICY IF EXISTS "service_all_newsletter" ON public.newsletter_subscriptions;
CREATE POLICY "service_all_newsletter" ON public.newsletter_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Note: "Allow anon insert newsletter_subscriptions" policy already exists from previous migration

-- =============================================================================
-- GRANTS - Ensure proper permissions
-- =============================================================================

-- Grant authenticated users read access where appropriate
GRANT SELECT ON public.maintenance_performance_metrics TO authenticated;

-- Grant service role full access to all tables
GRANT ALL ON public.contractor_contributions TO service_role;
GRANT ALL ON public.maintenance_performance_metrics TO service_role;
GRANT ALL ON public.ab_checkpoints TO service_role;
GRANT ALL ON public.ab_historical_validations TO service_role;
GRANT ALL ON public.ab_audit_log TO service_role;
GRANT ALL ON public.feature_extractor_ab_tests TO service_role;
GRANT ALL ON public.self_modification_events TO service_role;
GRANT ALL ON public.yolo_model_migrations TO service_role;
GRANT ALL ON public.schema_migrations TO service_role;
GRANT ALL ON public.token_cleanup_logs TO service_role;
GRANT ALL ON public.newsletter_subscriptions TO service_role;

-- Grant authenticated users appropriate access
GRANT SELECT, UPDATE ON public.contractor_contributions TO authenticated;
GRANT SELECT ON public.maintenance_performance_metrics TO authenticated;
GRANT INSERT ON public.ab_audit_log TO authenticated;
GRANT INSERT ON public.newsletter_subscriptions TO anon, authenticated;

-- =============================================================================
-- VERIFICATION QUERIES
-- Run these to verify policies are working correctly
-- =============================================================================

-- Check RLS is enabled on all tables
-- Expected: All 11 tables should show 'true'
/*
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'contractor_contributions',
    'maintenance_performance_metrics',
    'ab_checkpoints',
    'ab_historical_validations',
    'ab_audit_log',
    'feature_extractor_ab_tests',
    'self_modification_events',
    'yolo_model_migrations',
    'schema_migrations',
    'token_cleanup_logs',
    'newsletter_subscriptions'
  )
ORDER BY tablename;
*/

-- Count policies per table
-- Expected: Each table should have 2-4 policies
/*
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'contractor_contributions',
    'maintenance_performance_metrics',
    'ab_checkpoints',
    'ab_historical_validations',
    'ab_audit_log',
    'feature_extractor_ab_tests',
    'self_modification_events',
    'yolo_model_migrations',
    'schema_migrations',
    'token_cleanup_logs',
    'newsletter_subscriptions'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;
*/

-- List all policies for these tables
/*
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'contractor_contributions',
    'maintenance_performance_metrics',
    'ab_checkpoints',
    'ab_historical_validations',
    'ab_audit_log',
    'feature_extractor_ab_tests',
    'self_modification_events',
    'yolo_model_migrations',
    'schema_migrations',
    'token_cleanup_logs',
    'newsletter_subscriptions'
  )
ORDER BY tablename, policyname;
*/

-- =============================================================================
-- ROLLBACK INSTRUCTIONS
-- =============================================================================

-- To rollback this migration, run:
/*
BEGIN;

-- Drop all policies
DROP POLICY IF EXISTS "contractors_select_own_contributions" ON public.contractor_contributions;
DROP POLICY IF EXISTS "contractors_update_own_contributions" ON public.contractor_contributions;
DROP POLICY IF EXISTS "service_insert_contributions" ON public.contractor_contributions;
DROP POLICY IF EXISTS "admins_select_all_contributions" ON public.contractor_contributions;
DROP POLICY IF EXISTS "service_all_contributions" ON public.contractor_contributions;

DROP POLICY IF EXISTS "authenticated_read_metrics" ON public.maintenance_performance_metrics;
DROP POLICY IF EXISTS "admins_select_all_metrics" ON public.maintenance_performance_metrics;
DROP POLICY IF EXISTS "service_all_metrics" ON public.maintenance_performance_metrics;

DROP POLICY IF EXISTS "admins_select_ab_checkpoints" ON public.ab_checkpoints;
DROP POLICY IF EXISTS "service_all_ab_checkpoints" ON public.ab_checkpoints;

DROP POLICY IF EXISTS "admins_select_ab_historical" ON public.ab_historical_validations;
DROP POLICY IF EXISTS "service_all_ab_historical" ON public.ab_historical_validations;

DROP POLICY IF EXISTS "authenticated_insert_ab_audit" ON public.ab_audit_log;
DROP POLICY IF EXISTS "admins_select_ab_audit" ON public.ab_audit_log;
DROP POLICY IF EXISTS "service_all_ab_audit" ON public.ab_audit_log;

DROP POLICY IF EXISTS "admins_select_feature_tests" ON public.feature_extractor_ab_tests;
DROP POLICY IF EXISTS "service_all_feature_tests" ON public.feature_extractor_ab_tests;

DROP POLICY IF EXISTS "admins_select_self_mod_events" ON public.self_modification_events;
DROP POLICY IF EXISTS "service_all_self_mod_events" ON public.self_modification_events;

DROP POLICY IF EXISTS "admins_select_model_migrations" ON public.yolo_model_migrations;
DROP POLICY IF EXISTS "service_all_model_migrations" ON public.yolo_model_migrations;

DROP POLICY IF EXISTS "admins_select_schema_migrations" ON public.schema_migrations;
DROP POLICY IF EXISTS "service_all_schema_migrations" ON public.schema_migrations;

DROP POLICY IF EXISTS "admins_select_cleanup_logs" ON public.token_cleanup_logs;
DROP POLICY IF EXISTS "service_all_cleanup_logs" ON public.token_cleanup_logs;

DROP POLICY IF EXISTS "admins_select_newsletter" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "service_all_newsletter" ON public.newsletter_subscriptions;

COMMIT;
*/

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON POLICY "contractors_select_own_contributions" ON public.contractor_contributions IS
  'Contractors can view their own contribution data and statistics';

COMMENT ON POLICY "service_all_contributions" ON public.contractor_contributions IS
  'Service role has full access for backend contribution tracking operations';

COMMENT ON POLICY "authenticated_read_metrics" ON public.maintenance_performance_metrics IS
  'All authenticated users can view system performance metrics for transparency';

COMMENT ON POLICY "service_all_metrics" ON public.maintenance_performance_metrics IS
  'Service role has full access for automated metrics collection';

COMMENT ON POLICY "admins_select_ab_checkpoints" ON public.ab_checkpoints IS
  'Admins can view A/B test checkpoint data for experiment monitoring';

COMMENT ON POLICY "admins_select_ab_audit" ON public.ab_audit_log IS
  'Admins can view complete A/B test audit trail';

COMMENT ON POLICY "authenticated_insert_ab_audit" ON public.ab_audit_log IS
  'Authenticated users can append to audit log (append-only for accountability)';

COMMENT ON POLICY "service_all_self_mod_events" ON public.self_modification_events IS
  'Service role tracks AI self-modification events for safety monitoring';

COMMENT ON POLICY "service_all_schema_migrations" ON public.schema_migrations IS
  'Service role manages schema migrations; admins can view for debugging';

COMMIT;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
