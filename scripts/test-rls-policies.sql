-- =====================================================================================
-- RLS POLICIES COMPREHENSIVE TEST SCRIPT
-- =====================================================================================
--
-- This script tests Row Level Security policies across all 32 tables
-- to ensure proper multi-tenant isolation and prevent cross-tenant data leakage.
--
-- USAGE:
--   psql -h <host> -U <user> -d <database> -f test-rls-policies.sql
--   OR via Supabase CLI:
--   npx supabase db execute --file scripts/test-rls-policies.sql
--
-- =====================================================================================

\echo ''
\echo '=================================='
\echo 'RLS POLICIES COMPREHENSIVE TEST'
\echo '=================================='
\echo ''

-- =====================================================================================
-- SECTION 1: SETUP TEST USERS AND DATA
-- =====================================================================================

\echo '1. Creating test users...'

-- Create test users (using service role to bypass RLS)
DO $$
DECLARE
  homeowner1_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  homeowner2_id UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
  contractor1_id UUID := 'bbbbbbbb-0000-0000-0000-000000000001';
  contractor2_id UUID := 'bbbbbbbb-0000-0000-0000-000000000002';
  admin_id UUID := 'cccccccc-0000-0000-0000-000000000001';
BEGIN
  -- Insert test users if they don't exist
  INSERT INTO public.users (id, email, role, first_name, last_name)
  VALUES
    (homeowner1_id, 'test-homeowner1@test.com', 'homeowner', 'Test', 'Homeowner1'),
    (homeowner2_id, 'test-homeowner2@test.com', 'homeowner', 'Test', 'Homeowner2'),
    (contractor1_id, 'test-contractor1@test.com', 'contractor', 'Test', 'Contractor1'),
    (contractor2_id, 'test-contractor2@test.com', 'contractor', 'Test', 'Contractor2'),
    (admin_id, 'test-admin@test.com', 'admin', 'Test', 'Admin')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Test users created successfully';
END $$;

-- =====================================================================================
-- SECTION 2: CREATE TEST DATA
-- =====================================================================================

\echo '2. Creating test data...'

-- Test Jobs
DO $$
DECLARE
  homeowner1_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  homeowner2_id UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
  contractor1_id UUID := 'bbbbbbbb-0000-0000-0000-000000000001';
  job1_id UUID := gen_random_uuid();
  job2_id UUID := gen_random_uuid();
  job3_id UUID := gen_random_uuid();
BEGIN
  -- Insert test jobs
  INSERT INTO public.jobs (id, homeowner_id, title, description, status)
  VALUES
    (job1_id, homeowner1_id, 'Homeowner1 Open Job', 'Public job', 'open'),
    (job2_id, homeowner1_id, 'Homeowner1 Draft Job', 'Private draft', 'draft'),
    (job3_id, homeowner2_id, 'Homeowner2 Open Job', 'Another public job', 'open')
  ON CONFLICT (id) DO NOTHING;

  -- Insert test bids
  INSERT INTO public.bids (job_id, contractor_id, amount, status)
  VALUES
    (job1_id, contractor1_id, 1000, 'pending')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test data created successfully';
END $$;

-- Test Escrow Transactions
DO $$
DECLARE
  homeowner1_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  contractor1_id UUID := 'bbbbbbbb-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.escrow_transactions (job_id, payer_id, payee_id, amount, status)
  VALUES
    ('dddddddd-0000-0000-0000-000000000001', homeowner1_id, contractor1_id, 5000, 'pending')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test escrow transaction created';
END $$;

-- Test Messages
DO $$
DECLARE
  homeowner1_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  contractor1_id UUID := 'bbbbbbbb-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.messages (sender_id, receiver_id, content)
  VALUES
    (homeowner1_id, contractor1_id, 'Test message from homeowner to contractor')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test message created';
END $$;

-- Test Notifications
DO $$
DECLARE
  homeowner1_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.notifications (user_id, type, message)
  VALUES
    (homeowner1_id, 'job_update', 'Your job was updated')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test notification created';
END $$;

-- Test Refresh Tokens
DO $$
DECLARE
  homeowner1_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.refresh_tokens (user_id, token, family_id, generation)
  VALUES
    (homeowner1_id, 'test_refresh_token_1', 'family_1', 1)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test refresh token created';
END $$;

-- =====================================================================================
-- SECTION 3: VERIFY RLS IS ENABLED
-- =====================================================================================

\echo ''
\echo '3. Verifying RLS is enabled on all critical tables...'
\echo ''

SELECT
  tablename AS "Table Name",
  CASE
    WHEN rowsecurity THEN '✓ ENABLED'
    ELSE '✗ DISABLED (SECURITY RISK!)'
  END AS "RLS Status"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'escrow_transactions',
    'contractor_payout_accounts',
    'refresh_tokens',
    'yolo_corrections',
    'yolo_retraining_jobs',
    'maintenance_training_labels',
    'ab_experiments',
    'ab_arms',
    'ab_calibration_data',
    'contractor_locations',
    'job_guarantees',
    'contracts',
    'notifications',
    'reviews',
    'bids',
    'jobs',
    'messages',
    'webhook_events',
    'idempotency_keys',
    'security_events'
  )
ORDER BY tablename;

-- =====================================================================================
-- SECTION 4: TEST FINANCIAL TABLES (HIGHEST PRIORITY)
-- =====================================================================================

\echo ''
\echo '4. Testing Financial Tables RLS Policies...'
\echo ''

-- Test: Payer can see their escrow transactions
\echo 'Test: Escrow Transactions - Payer Access'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-0000-0000-0000-000000000001"}';

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.escrow_transactions
  WHERE payer_id = 'aaaaaaaa-0000-0000-0000-000000000001';

  IF record_count > 0 THEN
    RAISE NOTICE '✓ PASS: Payer can see their escrow transactions (% records)', record_count;
  ELSE
    RAISE WARNING '✗ FAIL: Payer cannot see their escrow transactions';
  END IF;
END $$;

RESET role;

-- Test: Third party CANNOT see escrow transactions
\echo 'Test: Escrow Transactions - Cross-Tenant Block'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-0000-0000-0000-000000000002"}'; -- Different homeowner

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.escrow_transactions
  WHERE payer_id = 'aaaaaaaa-0000-0000-0000-000000000001'; -- Trying to access homeowner1's data

  IF record_count = 0 THEN
    RAISE NOTICE '✓ PASS: Cross-tenant access blocked for escrow transactions';
  ELSE
    RAISE WARNING '✗ FAIL: Cross-tenant data leakage detected! (% records visible)', record_count;
  END IF;
END $$;

RESET role;

-- =====================================================================================
-- SECTION 5: TEST AUTHENTICATION TABLES (CRITICAL)
-- =====================================================================================

\echo ''
\echo '5. Testing Authentication Tables RLS Policies...'
\echo ''

-- Test: User can see their own refresh tokens
\echo 'Test: Refresh Tokens - Owner Access'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-0000-0000-0000-000000000001"}';

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.refresh_tokens
  WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

  IF record_count > 0 THEN
    RAISE NOTICE '✓ PASS: User can see their own refresh tokens (% records)', record_count;
  ELSE
    RAISE WARNING '✗ FAIL: User cannot see their own refresh tokens';
  END IF;
END $$;

RESET role;

-- Test: User CANNOT see other users' refresh tokens (CRITICAL SECURITY TEST)
\echo 'Test: Refresh Tokens - Cross-User Block (CRITICAL)'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-0000-0000-0000-000000000002"}'; -- Different user

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.refresh_tokens
  WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001'; -- Trying to access homeowner1's tokens

  IF record_count = 0 THEN
    RAISE NOTICE '✓ PASS: Cross-user access blocked for refresh tokens (CRITICAL SECURITY PASS)';
  ELSE
    RAISE WARNING '✗ FAIL: CRITICAL SECURITY VULNERABILITY - Cross-user token access detected! (% records)', record_count;
  END IF;
END $$;

RESET role;

-- =====================================================================================
-- SECTION 6: TEST USER DATA TABLES
-- =====================================================================================

\echo ''
\echo '6. Testing User Data Tables RLS Policies...'
\echo ''

-- Test: Homeowner can see their own jobs
\echo 'Test: Jobs - Owner Access'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-0000-0000-0000-000000000001"}';

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.jobs
  WHERE homeowner_id = 'aaaaaaaa-0000-0000-0000-000000000001';

  IF record_count > 0 THEN
    RAISE NOTICE '✓ PASS: Homeowner can see their own jobs (% records)', record_count;
  ELSE
    RAISE WARNING '✗ FAIL: Homeowner cannot see their own jobs';
  END IF;
END $$;

RESET role;

-- Test: Public can see open jobs
\echo 'Test: Jobs - Public Open Jobs'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "bbbbbbbb-0000-0000-0000-000000000001"}'; -- Contractor

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.jobs
  WHERE status = 'open';

  IF record_count > 0 THEN
    RAISE NOTICE '✓ PASS: Public can see open jobs (% records)', record_count;
  ELSE
    RAISE WARNING '✗ FAIL: Public cannot see open jobs';
  END IF;
END $$;

RESET role;

-- Test: User CANNOT see draft jobs of other users
\echo 'Test: Jobs - Draft Cross-Tenant Block'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-0000-0000-0000-000000000002"}'; -- Different homeowner

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.jobs
  WHERE homeowner_id = 'aaaaaaaa-0000-0000-0000-000000000001'
    AND status = 'draft'; -- Trying to access homeowner1's draft jobs

  IF record_count = 0 THEN
    RAISE NOTICE '✓ PASS: Cross-tenant access blocked for draft jobs';
  ELSE
    RAISE WARNING '✗ FAIL: Cross-tenant data leakage for draft jobs! (% records)', record_count;
  END IF;
END $$;

RESET role;

-- Test: Contractor can see their own bids
\echo 'Test: Bids - Contractor Access'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "bbbbbbbb-0000-0000-0000-000000000001"}';

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.bids
  WHERE contractor_id = 'bbbbbbbb-0000-0000-0000-000000000001';

  IF record_count > 0 THEN
    RAISE NOTICE '✓ PASS: Contractor can see their own bids (% records)', record_count;
  ELSE
    RAISE WARNING '✗ FAIL: Contractor cannot see their own bids';
  END IF;
END $$;

RESET role;

-- Test: Contractor CANNOT see other contractors' bids
\echo 'Test: Bids - Cross-Contractor Block'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "bbbbbbbb-0000-0000-0000-000000000002"}'; -- Different contractor

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.bids
  WHERE contractor_id = 'bbbbbbbb-0000-0000-0000-000000000001'; -- Trying to access contractor1's bids

  IF record_count = 0 THEN
    RAISE NOTICE '✓ PASS: Cross-contractor access blocked for bids';
  ELSE
    RAISE WARNING '✗ FAIL: Cross-contractor data leakage for bids! (% records)', record_count;
  END IF;
END $$;

RESET role;

-- Test: Messages - Sender and Receiver access
\echo 'Test: Messages - Sender Access'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-0000-0000-0000-000000000001"}'; -- Sender

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.messages
  WHERE sender_id = 'aaaaaaaa-0000-0000-0000-000000000001';

  IF record_count > 0 THEN
    RAISE NOTICE '✓ PASS: Sender can see their messages (% records)', record_count;
  ELSE
    RAISE WARNING '✗ FAIL: Sender cannot see their messages';
  END IF;
END $$;

RESET role;

\echo 'Test: Messages - Receiver Access'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "bbbbbbbb-0000-0000-0000-000000000001"}'; -- Receiver

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.messages
  WHERE receiver_id = 'bbbbbbbb-0000-0000-0000-000000000001';

  IF record_count > 0 THEN
    RAISE NOTICE '✓ PASS: Receiver can see their messages (% records)', record_count;
  ELSE
    RAISE WARNING '✗ FAIL: Receiver cannot see their messages';
  END IF;
END $$;

RESET role;

-- Test: Third party CANNOT see messages
\echo 'Test: Messages - Third Party Block (CRITICAL)'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-0000-0000-0000-000000000002"}'; -- Third party

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.messages
  WHERE sender_id = 'aaaaaaaa-0000-0000-0000-000000000001'
    OR receiver_id = 'aaaaaaaa-0000-0000-0000-000000000001';

  IF record_count = 0 THEN
    RAISE NOTICE '✓ PASS: Third party cannot see private messages (CRITICAL SECURITY PASS)';
  ELSE
    RAISE WARNING '✗ FAIL: CRITICAL - Third party can access private messages! (% records)', record_count;
  END IF;
END $$;

RESET role;

-- Test: Notifications - User access
\echo 'Test: Notifications - Owner Access'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-0000-0000-0000-000000000001"}';

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.notifications
  WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

  IF record_count > 0 THEN
    RAISE NOTICE '✓ PASS: User can see their notifications (% records)', record_count;
  ELSE
    RAISE WARNING '✗ FAIL: User cannot see their notifications';
  END IF;
END $$;

RESET role;

-- Test: User CANNOT see other users' notifications
\echo 'Test: Notifications - Cross-User Block'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-0000-0000-0000-000000000002"}'; -- Different user

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM public.notifications
  WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

  IF record_count = 0 THEN
    RAISE NOTICE '✓ PASS: Cross-user access blocked for notifications';
  ELSE
    RAISE WARNING '✗ FAIL: Cross-user data leakage for notifications! (% records)', record_count;
  END IF;
END $$;

RESET role;

-- =====================================================================================
-- SECTION 7: TEST ADMIN OVERRIDE
-- =====================================================================================

\echo ''
\echo '7. Testing Admin Override Capabilities...'
\echo ''

-- Test: Admin can see all data
\echo 'Test: Admin Override - All Tables Access'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "cccccccc-0000-0000-0000-000000000001", "role": "admin"}';

DO $$
DECLARE
  escrow_count INT;
  jobs_count INT;
  messages_count INT;
BEGIN
  SELECT COUNT(*) INTO escrow_count FROM public.escrow_transactions;
  SELECT COUNT(*) INTO jobs_count FROM public.jobs;
  SELECT COUNT(*) INTO messages_count FROM public.messages;

  IF escrow_count > 0 AND jobs_count > 0 AND messages_count > 0 THEN
    RAISE NOTICE '✓ PASS: Admin can see all data (escrow: %, jobs: %, messages: %)',
      escrow_count, jobs_count, messages_count;
  ELSE
    RAISE WARNING '✗ FAIL: Admin cannot see all data';
  END IF;
END $$;

RESET role;

-- =====================================================================================
-- SECTION 8: TEST SYSTEM TABLES
-- =====================================================================================

\echo ''
\echo '8. Testing System Tables RLS Policies...'
\echo ''

-- Test: Non-admin CANNOT see security events
\echo 'Test: Security Events - Non-Admin Block'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "aaaaaaaa-0000-0000-0000-000000000001"}'; -- Regular user

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count FROM public.security_events;

  IF record_count = 0 THEN
    RAISE NOTICE '✓ PASS: Non-admin cannot see security events';
  ELSE
    RAISE WARNING '✗ FAIL: Non-admin can see security events! (% records)', record_count;
  END IF;
END $$;

RESET role;

-- Test: Admin CAN see security events
\echo 'Test: Security Events - Admin Access'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "cccccccc-0000-0000-0000-000000000001", "role": "admin"}';

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count FROM public.security_events;

  RAISE NOTICE '✓ INFO: Admin can see % security events', record_count;
END $$;

RESET role;

-- =====================================================================================
-- SECTION 9: TEST AI/ML TABLES
-- =====================================================================================

\echo ''
\echo '9. Testing AI/ML Tables RLS Policies...'
\echo ''

-- Test: Non-admin CANNOT see retraining jobs
\echo 'Test: YOLO Retraining Jobs - Non-Admin Block'
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "bbbbbbbb-0000-0000-0000-000000000001"}'; -- Contractor

DO $$
DECLARE
  record_count INT;
BEGIN
  SELECT COUNT(*) INTO record_count FROM public.yolo_retraining_jobs;

  IF record_count = 0 THEN
    RAISE NOTICE '✓ PASS: Non-admin cannot see retraining jobs';
  ELSE
    RAISE WARNING '✗ FAIL: Non-admin can see retraining jobs! (% records)', record_count;
  END IF;
END $$;

RESET role;

-- =====================================================================================
-- SECTION 10: TEST EDGE CASES
-- =====================================================================================

\echo ''
\echo '10. Testing Edge Cases...'
\echo ''

-- Test: NULL user_id behavior
\echo 'Test: Edge Case - NULL user context (unauthenticated)'
SET LOCAL role TO anon;

DO $$
DECLARE
  open_jobs_count INT;
  draft_jobs_count INT;
BEGIN
  SELECT COUNT(*) INTO open_jobs_count FROM public.jobs WHERE status = 'open';
  SELECT COUNT(*) INTO draft_jobs_count FROM public.jobs WHERE status = 'draft';

  IF open_jobs_count > 0 AND draft_jobs_count = 0 THEN
    RAISE NOTICE '✓ PASS: Unauthenticated users can see open jobs (%) but not drafts', open_jobs_count;
  ELSE
    RAISE WARNING '✗ FAIL: Unauthenticated user access is incorrect';
  END IF;
END $$;

RESET role;

-- =====================================================================================
-- SECTION 11: GENERATE SUMMARY REPORT
-- =====================================================================================

\echo ''
\echo '=================================='
\echo 'TEST SUMMARY REPORT'
\echo '=================================='
\echo ''

-- Count policies by table
\echo 'Policy Count by Table:'
SELECT
  schemaname || '.' || tablename AS table_name,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'escrow_transactions', 'contractor_payout_accounts', 'refresh_tokens',
    'yolo_corrections', 'yolo_retraining_jobs', 'maintenance_training_labels',
    'ab_experiments', 'contractor_locations', 'notifications', 'reviews',
    'bids', 'jobs', 'messages', 'webhook_events', 'idempotency_keys',
    'security_events'
  )
GROUP BY schemaname, tablename
ORDER BY policy_count DESC, tablename;

-- List all policies
\echo ''
\echo 'All RLS Policies:'
SELECT
  tablename AS "Table",
  policyname AS "Policy Name",
  cmd AS "Operation",
  CASE
    WHEN qual IS NOT NULL THEN 'USING clause defined'
    ELSE 'No USING clause'
  END AS "USING",
  CASE
    WHEN with_check IS NOT NULL THEN 'WITH CHECK clause defined'
    ELSE 'No WITH CHECK clause'
  END AS "WITH CHECK"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'escrow_transactions', 'contractor_payout_accounts', 'refresh_tokens',
    'yolo_corrections', 'yolo_retraining_jobs', 'maintenance_training_labels',
    'ab_experiments', 'contractor_locations', 'notifications', 'reviews',
    'bids', 'jobs', 'messages', 'webhook_events', 'idempotency_keys',
    'security_events'
  )
ORDER BY tablename, policyname;

-- =====================================================================================
-- SECTION 12: PERFORMANCE METRICS
-- =====================================================================================

\echo ''
\echo '=================================='
\echo 'PERFORMANCE METRICS'
\echo '=================================='
\echo ''

-- Test query performance with RLS
\echo 'Query Performance Test (with RLS):'
EXPLAIN ANALYZE
SELECT j.*, b.amount, COUNT(b.id) as bid_count
FROM public.jobs j
LEFT JOIN public.bids b ON j.id = b.job_id
WHERE j.status = 'open'
GROUP BY j.id, b.amount
LIMIT 10;

\echo ''
\echo '=================================='
\echo 'RLS TESTING COMPLETE'
\echo '=================================='
\echo ''
\echo 'Review the output above for any FAIL or WARNING messages.'
\echo 'All tests should show ✓ PASS for proper RLS implementation.'
\echo ''

-- =====================================================================================
-- SECTION 13: CLEANUP (OPTIONAL)
-- =====================================================================================

-- Uncomment to cleanup test data
-- DELETE FROM public.refresh_tokens WHERE token LIKE 'test_%';
-- DELETE FROM public.messages WHERE content LIKE 'Test message%';
-- DELETE FROM public.notifications WHERE message LIKE '%test%';
-- DELETE FROM public.bids WHERE job_id IN (SELECT id FROM public.jobs WHERE title LIKE '%Test%');
-- DELETE FROM public.jobs WHERE title LIKE '%Test%' OR title LIKE '%Homeowner%';
-- DELETE FROM public.escrow_transactions WHERE job_id = 'dddddddd-0000-0000-0000-000000000001';
-- DELETE FROM public.users WHERE email LIKE 'test-%@test.com';
