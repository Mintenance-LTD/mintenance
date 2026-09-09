\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('fa060907-0000-4000-8000-000000000010','milestone-test@example.invalid','{}');
SELECT * FROM public.increment_contractor_contribution_stats('fa060907-0000-4000-8000-000000000010',100,500);
DO $$
DECLARE r record;
BEGIN
  -- Simulate a transaction failure after the function returns: both the claim
  -- and its credited balance must roll back, allowing a genuine retry.
  BEGIN
    PERFORM public.claim_contractor_contribution_milestone('fa060907-0000-4000-8000-000000000010');
    RAISE EXCEPTION USING ERRCODE='ZX001', MESSAGE='synthetic transaction failure';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.contractor_milestone_claims WHERE contractor_id='fa060907-0000-4000-8000-000000000010') THEN
    RAISE EXCEPTION 'Claim survived failed transaction';
  END IF;
  SELECT * INTO r FROM public.claim_contractor_contribution_milestone('fa060907-0000-4000-8000-000000000010');
  IF r.bonus <> 100 OR r.premium_months <> 3 THEN RAISE EXCEPTION 'First award incorrect'; END IF;
  SELECT * INTO r FROM public.claim_contractor_contribution_milestone('fa060907-0000-4000-8000-000000000010');
  IF r.bonus <> 0 OR r.premium_months <> 0 THEN RAISE EXCEPTION 'Duplicate reward issued'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.contractor_contributions WHERE contractor_id='fa060907-0000-4000-8000-000000000010' AND credits_earned=600 AND premium_months_earned=3) THEN
    RAISE EXCEPTION 'Balance/premium invariant failed';
  END IF;
END $$;
ROLLBACK;
