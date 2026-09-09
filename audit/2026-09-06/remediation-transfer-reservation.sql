\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('fa060906-0000-4000-8000-000000000001','audit-owner@example.invalid'),
 ('fa060906-0000-4000-8000-000000000002','audit-contractor@example.invalid');
UPDATE public.profiles SET role='contractor',stripe_connect_account_id='acct_synthetic' WHERE id='fa060906-0000-4000-8000-000000000002';
INSERT INTO public.jobs(id,homeowner_id,title,description,location,status)
 VALUES ('fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000001','Synthetic','Synthetic maintenance description','Synthetic','draft');
INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status)
 VALUES ('fa060906-0000-4000-8000-000000000030','fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000001','fa060906-0000-4000-8000-000000000002',500,'release_pending');
SET LOCAL ROLE service_role;
DO $$ DECLARE a record; b record; BEGIN
 SELECT * INTO a FROM public.reserve_escrow_transfer('fa060906-0000-4000-8000-000000000030',43000,'acct_synthetic');
 SELECT * INTO b FROM public.reserve_escrow_transfer('fa060906-0000-4000-8000-000000000030',43000,'acct_synthetic');
 IF a.stripe_parameters <> b.stripe_parameters OR a.idempotency_key <> b.idempotency_key THEN
   RAISE EXCEPTION 'Retry changed provider request'; END IF;
 BEGIN
   PERFORM public.reserve_escrow_transfer('fa060906-0000-4000-8000-000000000030',44000,'acct_synthetic');
   RAISE EXCEPTION 'Changed payout accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
   PERFORM public.reserve_escrow_transfer('fa060906-0000-4000-8000-000000000030',43000,'acct_other');
   RAISE EXCEPTION 'Changed recipient accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 RAISE NOTICE 'PASS: retries retain transfer identity and parameters; changed amount/recipient rejected';
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.reserve_escrow_transfer('fa060906-0000-4000-8000-000000000030',43000,'acct_synthetic');
  RAISE EXCEPTION 'Client reserved payout';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
