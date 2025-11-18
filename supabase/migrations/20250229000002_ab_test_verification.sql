-- ============================================================================
-- Verification Queries for A/B Testing Schema
-- ============================================================================

-- 1. Verify all tables exist (should return 10 rows)
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'ab_%'
ORDER BY tablename;

-- 2. Verify all views exist (should return 2 rows)
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' AND viewname LIKE 'ab_%'
ORDER BY viewname;

-- 3. Verify Wilson score function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'wilson_score_ci';

-- 4. Test Wilson score function
SELECT 
  wilson_score_ci(0, 1000, 0.95) as zero_sfn_upper_bound,
  wilson_score_ci(5, 1000, 0.95) as five_sfn_upper_bound;

-- 5. Check experiment status view (should return empty but not error)
SELECT * FROM ab_experiment_status;

-- 6. Test insert with cascade
DO $$
DECLARE
  test_exp_id UUID;
BEGIN
  INSERT INTO ab_experiments (name, description, status, target_sample_size)
  VALUES ('Test Experiment', 'Verification test', 'draft', 10000)
  RETURNING id INTO test_exp_id;
  
  -- Check audit log was created
  IF EXISTS (
    SELECT 1 FROM ab_audit_log 
    WHERE table_name = 'ab_experiments' 
    AND record_id = test_exp_id
  ) THEN
    RAISE NOTICE 'Audit log created successfully';
  ELSE
    RAISE EXCEPTION 'Audit log not created';
  END IF;
  
  -- Cleanup
  DELETE FROM ab_experiments WHERE id = test_exp_id;
END $$;

-- 7. Verify indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' AND tablename LIKE 'ab_%' 
ORDER BY tablename, indexname;

-- 8. Verify RLS policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'ab_%'
ORDER BY tablename, policyname;

