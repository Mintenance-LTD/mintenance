\set ON_ERROR_STOP on
BEGIN;
-- All records are synthetic and the transaction always rolls back.
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('fa060906-0000-4000-8000-000000000001','audit-owner@example.invalid','{}'),
 ('fa060906-0000-4000-8000-000000000002','audit-contractor@example.invalid','{}'),
 ('fa060906-0000-4000-8000-000000000003','audit-unrelated@example.invalid','{}'),
 ('fa060906-0000-4000-8000-000000000004','audit-admin@example.invalid','{}');
UPDATE public.profiles SET role='contractor' WHERE id='fa060906-0000-4000-8000-000000000002';
UPDATE public.profiles SET role='admin' WHERE id='fa060906-0000-4000-8000-000000000004';
INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status)
 VALUES ('fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000001','fa060906-0000-4000-8000-000000000002','Synthetic audit job','Synthetic maintenance description for rollback-only audit','Synthetic','draft');
INSERT INTO public.properties(id,owner_id,property_name,address,property_type)
 VALUES ('fa060906-0000-4000-8000-000000000020','fa060906-0000-4000-8000-000000000001','Synthetic','Synthetic','residential');
UPDATE public.profiles SET first_name='Synthetic',last_name='Signer' WHERE id IN ('fa060906-0000-4000-8000-000000000001','fa060906-0000-4000-8000-000000000002');
INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status)
VALUES ('fa060906-0000-4000-8000-000000000040','fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000001','fa060906-0000-4000-8000-000000000002',500,'pending_contractor');

INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status)
VALUES('fa060906-0000-4000-8000-000000000050','fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000001','fa060906-0000-4000-8000-000000000002',500,'pending');
SET LOCAL ROLE authenticated;
DO $$ DECLARE actor uuid; BEGIN
 FOREACH actor IN ARRAY ARRAY['fa060906-0000-4000-8000-000000000001'::uuid,'fa060906-0000-4000-8000-000000000002'::uuid,'fa060906-0000-4000-8000-000000000003'::uuid,'fa060906-0000-4000-8000-000000000004'::uuid] LOOP
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  BEGIN
   UPDATE public.contracts SET contractor_signed_at=now(),homeowner_signed_at=now(),status='accepted'
    WHERE id='fa060906-0000-4000-8000-000000000040';
   RAISE EXCEPTION 'Client contract update did not fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   DELETE FROM public.contracts WHERE id='fa060906-0000-4000-8000-000000000040';
   RAISE EXCEPTION 'Client contract delete did not fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   UPDATE public.escrow_transactions SET status='held',amount=900
    WHERE id='fa060906-0000-4000-8000-000000000050';
   RAISE EXCEPTION 'Client escrow update did not fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   DELETE FROM public.escrow_transactions WHERE id='fa060906-0000-4000-8000-000000000050';
   RAISE EXCEPTION 'Client escrow delete did not fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END LOOP;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.contracts WHERE id='fa060906-0000-4000-8000-000000000040' AND contractor_signed_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Client forged signature'; END IF;
 IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid IN('public.contracts'::regclass,'public.escrow_transactions'::regclass)
  AND attnum>0 AND NOT attisdropped AND (has_column_privilege('authenticated',attrelid,attnum,'UPDATE') OR has_column_privilege('anon',attrelid,attnum,'UPDATE'))) THEN
  RAISE EXCEPTION 'Residual direct column update grant'; END IF;
END $$;
SET LOCAL ROLE service_role;
UPDATE public.contracts SET title='Authorized server edit' WHERE id='fa060906-0000-4000-8000-000000000040';
UPDATE public.escrow_transactions SET description='Authorized server edit' WHERE id='fa060906-0000-4000-8000-000000000050';
SELECT public.sign_contract_atomic('fa060906-0000-4000-8000-000000000040','fa060906-0000-4000-8000-000000000002',NULL,NULL,NULL)->>'status';
SELECT public.sign_contract_atomic('fa060906-0000-4000-8000-000000000040','fa060906-0000-4000-8000-000000000001',NULL,NULL,NULL)->>'status';
DO $$ BEGIN
 IF (SELECT count(*) FROM public.contract_acceptance_evidence WHERE contract_id='fa060906-0000-4000-8000-000000000040')<>2 THEN
  RAISE EXCEPTION 'Trusted signing did not retain both evidence rows'; END IF;
END $$;
ROLLBACK;
