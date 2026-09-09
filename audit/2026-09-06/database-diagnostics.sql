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
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','fa060906-0000-4000-8000-000000000003',true) IS NOT NULL AS unrelated_context;
SELECT count(*)=0 AS unrelated_cannot_read_property FROM public.properties WHERE id='fa060906-0000-4000-8000-000000000020';
SELECT count(*)=0 AS unrelated_cannot_read_draft FROM public.jobs WHERE id='fa060906-0000-4000-8000-000000000010';
SELECT set_config('request.jwt.claim.sub','fa060906-0000-4000-8000-000000000001',true) IS NOT NULL AS owner_context;
SELECT count(*)=1 AS owner_can_read_property FROM public.properties WHERE id='fa060906-0000-4000-8000-000000000020';
SELECT has_column_privilege('authenticated','public.profiles','role','UPDATE') AS can_edit_profile_role;
INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status)
 VALUES ('fa060906-0000-4000-8000-000000000030','fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000001','fa060906-0000-4000-8000-000000000002',500,'held');
SELECT status, payment_intent_id IS NULL AS no_provider_payment FROM public.escrow_transactions WHERE id='fa060906-0000-4000-8000-000000000030';
INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status,homeowner_signed_at,contractor_signed_at)
 VALUES ('fa060906-0000-4000-8000-000000000040','fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000001','fa060906-0000-4000-8000-000000000002',500,'accepted',now(),now());
SELECT status,contractor_signed_at IS NOT NULL AS other_party_signature_forged FROM public.contracts WHERE id='fa060906-0000-4000-8000-000000000040';
SELECT set_config('request.jwt.claim.sub','fa060906-0000-4000-8000-000000000002',true) IS NOT NULL AS contractor_context;
INSERT INTO public.bids(id,job_id,contractor_id,amount,description,status)
 VALUES ('fa060906-0000-4000-8000-000000000050','fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000002',500,'Synthetic bid description for rollback-only diagnostic','accepted');
UPDATE public.bids SET amount=900 WHERE id='fa060906-0000-4000-8000-000000000050';
SELECT status,amount FROM public.bids WHERE id='fa060906-0000-4000-8000-000000000050';
SELECT set_config('request.jwt.claim.sub','fa060906-0000-4000-8000-000000000004',true) IS NOT NULL AS admin_context;
SELECT count(*)=1 AS admin_can_read_property FROM public.properties WHERE id='fa060906-0000-4000-8000-000000000020';
SELECT set_config('request.jwt.claim.sub','fa060906-0000-4000-8000-000000000003',true) IS NOT NULL AS unrelated_context;
UPDATE public.profiles SET role='admin' WHERE id='fa060906-0000-4000-8000-000000000003';
SELECT role AS self_escalated_role FROM public.profiles WHERE id='fa060906-0000-4000-8000-000000000003';
SELECT count(*)=1 AS escalated_user_reads_other_property FROM public.properties WHERE id='fa060906-0000-4000-8000-000000000020';
RESET ROLE;
INSERT INTO public.jobs(id,homeowner_id,title,description,location,status)
 VALUES ('fa060906-0000-4000-8000-000000000011','fa060906-0000-4000-8000-000000000001','Synthetic completed job','Synthetic maintenance description for rollback-only audit','Synthetic','completed');
DO $$ BEGIN
  BEGIN
    UPDATE public.jobs SET status='in_progress' WHERE id='fa060906-0000-4000-8000-000000000011';
    RAISE NOTICE 'REWORK ALLOWED';
  EXCEPTION WHEN raise_exception THEN
    RAISE NOTICE 'REWORK BLOCKED: %', SQLERRM;
  END;
END $$;
-- Simulate the production webhook's UPDATE after a concurrent release claim.
UPDATE public.escrow_transactions SET status='release_pending' WHERE id='fa060906-0000-4000-8000-000000000030';
UPDATE public.escrow_transactions SET status='held' WHERE id='fa060906-0000-4000-8000-000000000030';
SELECT status AS webhook_can_reopen_claimed_escrow FROM public.escrow_transactions WHERE id='fa060906-0000-4000-8000-000000000030';
ROLLBACK;
