-- =============================================================================
-- RLS POLICIES VERIFICATION SCRIPT
-- Run this after applying 20260131210000_rls_policies_unprotected_tables.sql
-- =============================================================================

-- =============================================================================
-- 1. VERIFY RLS IS ENABLED ON ALL TABLES
-- Expected: All 11 tables should show rowsecurity = true
-- =============================================================================

SELECT
  tablename,
  rowsecurity,
  CASE
    WHEN rowsecurity THEN '✓ RLS Enabled'
    ELSE '✗ RLS NOT Enabled'
  END as status
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

-- =============================================================================
-- 2. COUNT POLICIES PER TABLE
-- Expected: contractor_contributions (5), maintenance_performance_metrics (3),
--           ab_audit_log (3), newsletter_subscriptions (2+1 from previous),
--           all others (2)
-- =============================================================================

SELECT
  tablename,
  COUNT(*) as policy_count,
  CASE
    WHEN tablename = 'contractor_contributions' AND COUNT(*) = 5 THEN '✓ Correct (5)'
    WHEN tablename = 'maintenance_performance_metrics' AND COUNT(*) = 3 THEN '✓ Correct (3)'
    WHEN tablename = 'ab_audit_log' AND COUNT(*) = 3 THEN '✓ Correct (3)'
    WHEN tablename = 'newsletter_subscriptions' AND COUNT(*) >= 3 THEN '✓ Correct (3+)'
    WHEN COUNT(*) = 2 THEN '✓ Correct (2)'
    ELSE '✗ Unexpected count'
  END as status
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
GROUP BY tablename
ORDER BY tablename;

-- =============================================================================
-- 3. VERIFY TOTAL POLICY COUNT
-- Expected: At least 27 policies (3 for newsletter from previous migration)
-- =============================================================================

SELECT
  COUNT(*) as total_policies,
  CASE
    WHEN COUNT(*) >= 27 THEN '✓ Correct (27+ policies)'
    ELSE '✗ Missing policies'
  END as status
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
  );

-- =============================================================================
-- 4. LIST ALL POLICIES WITH DETAILS
-- Review to ensure policies match security requirements
-- =============================================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text[] as roles,
  cmd,
  LEFT(qual, 50) as using_clause,
  LEFT(with_check, 50) as with_check_clause
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

-- =============================================================================
-- 5. CHECK FOR MISSING SERVICE_ROLE POLICIES
-- Every table should have a service_role policy for full access
-- =============================================================================

SELECT
  tablename,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = t.tablename
        AND p.roles::text[] @> ARRAY['service_role']
    ) THEN '✓ Has service_role policy'
    ELSE '✗ Missing service_role policy'
  END as status
FROM (
  SELECT DISTINCT tablename
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
) t
ORDER BY tablename;

-- =============================================================================
-- 6. CHECK FOR ADMIN POLICIES
-- Tables should have admin read access (except newsletter_subscriptions)
-- =============================================================================

SELECT
  tablename,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = t.tablename
        AND p.policyname LIKE '%admin%'
    ) THEN '✓ Has admin policy'
    ELSE '✗ Missing admin policy'
  END as status
FROM (
  SELECT DISTINCT tablename
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
) t
ORDER BY tablename;

-- =============================================================================
-- 7. VERIFY GRANTS
-- Check that service_role and authenticated have appropriate grants
-- =============================================================================

-- Service role should have ALL on all tables
SELECT
  tablename,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges,
  CASE
    WHEN string_agg(privilege_type, ', ' ORDER BY privilege_type) LIKE '%DELETE%INSERT%SELECT%UPDATE%'
    THEN '✓ Full access granted'
    ELSE '✗ Missing privileges'
  END as status
FROM information_schema.table_privileges
WHERE grantee = 'service_role'
  AND table_schema = 'public'
  AND table_name IN (
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
GROUP BY tablename
ORDER BY tablename;

-- Authenticated role should have appropriate grants
SELECT
  tablename,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.table_privileges
WHERE grantee = 'authenticated'
  AND table_schema = 'public'
  AND table_name IN (
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
GROUP BY tablename
ORDER BY tablename;

-- =============================================================================
-- 8. SECURITY AUDIT SUMMARY
-- =============================================================================

SELECT
  'RLS Policies Security Audit' as audit_section,
  (
    SELECT COUNT(*)
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = true
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
  ) as tables_with_rls_enabled,
  (
    SELECT COUNT(DISTINCT tablename)
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
  ) as tables_with_policies,
  (
    SELECT COUNT(*)
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
  ) as total_policies,
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM pg_tables
      WHERE schemaname = 'public'
        AND rowsecurity = true
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
    ) = 11
    AND (
      SELECT COUNT(DISTINCT tablename)
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
    ) = 11
    AND (
      SELECT COUNT(*)
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
    ) >= 27
    THEN '✓✓✓ VULN-003 RESOLVED - All tables protected'
    ELSE '✗✗✗ VULN-003 NOT FULLY RESOLVED - Issues detected'
  END as vulnerability_status;

-- =============================================================================
-- EXPECTED RESULTS SUMMARY
-- =============================================================================

-- Query 1: All 11 tables should have RLS enabled
-- Query 2: Policy counts: contractor_contributions (5), maintenance_performance_metrics (3),
--          ab_audit_log (3), newsletter_subscriptions (3+), others (2 each)
-- Query 3: Total policies >= 27
-- Query 4: All policies listed with details
-- Query 5: All tables have service_role policy
-- Query 6: All tables have admin policy
-- Query 7: Service role has ALL on all tables, authenticated has appropriate grants
-- Query 8: VULN-003 RESOLVED status

-- =============================================================================
-- END OF VERIFICATION SCRIPT
-- =============================================================================
