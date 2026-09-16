\set ON_ERROR_STOP on
BEGIN;
-- All records are synthetic and the transaction always rolls back.
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('fa260906-0000-4000-8000-000000000001','audit-owner@example.invalid','{}'),
 ('fa260906-0000-4000-8000-000000000002','audit-contractor@example.invalid','{}'),
 ('fa260906-0000-4000-8000-000000000003','audit-unrelated@example.invalid','{}'),
 ('fa260906-0000-4000-8000-000000000004','audit-admin@example.invalid','{}');
UPDATE public.profiles SET role='contractor' WHERE id='fa260906-0000-4000-8000-000000000002';
UPDATE public.profiles SET role='admin' WHERE id='fa260906-0000-4000-8000-000000000004';
INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status)
 VALUES ('fa260906-0000-4000-8000-000000000010','fa260906-0000-4000-8000-000000000001','fa260906-0000-4000-8000-000000000002','Synthetic audit job','Synthetic maintenance description for rollback-only audit','Synthetic','draft');
INSERT INTO public.properties(id,owner_id,property_name,address,property_type)
 VALUES ('fa260906-0000-4000-8000-000000000020','fa260906-0000-4000-8000-000000000001','Synthetic','Synthetic','residential');
UPDATE public.profiles SET first_name='Synthetic',last_name='Signer' WHERE id IN ('fa260906-0000-4000-8000-000000000001','fa260906-0000-4000-8000-000000000002');
INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status)
VALUES ('fa260906-0000-4000-8000-000000000040','fa260906-0000-4000-8000-000000000010','fa260906-0000-4000-8000-000000000001','fa260906-0000-4000-8000-000000000002',500,'pending_contractor');


SELECT public.sign_contract_atomic('fa260906-0000-4000-8000-000000000040','fa260906-0000-4000-8000-000000000002',NULL,NULL,NULL);
SELECT public.sign_contract_atomic('fa260906-0000-4000-8000-000000000040','fa260906-0000-4000-8000-000000000001',NULL,NULL,NULL);
UPDATE public.contracts SET status='cancelled' WHERE id='fa260906-0000-4000-8000-000000000040';

CREATE TEMP TABLE original_acceptance AS SELECT jsonb_agg(to_jsonb(e) ORDER BY e.accepted_at,e.id) AS evidence FROM public.contract_acceptance_evidence e WHERE contract_id='fa260906-0000-4000-8000-000000000040';
-- Unsigned rows, including legacy NULL status, do not need a signed-contract archive.
INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status)
 VALUES ('fa260906-0000-4000-8000-000000000011','fa260906-0000-4000-8000-000000000001','fa260906-0000-4000-8000-000000000002','Synthetic unsigned','Synthetic maintenance description','Synthetic','draft');
INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status)
 VALUES ('fa260906-0000-4000-8000-000000000041','fa260906-0000-4000-8000-000000000011','fa260906-0000-4000-8000-000000000001','fa260906-0000-4000-8000-000000000002',100,NULL);
DELETE FROM public.contracts WHERE id='fa260906-0000-4000-8000-000000000041';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.retained_contract_records WHERE contract_id='fa260906-0000-4000-8000-000000000041') THEN
  RAISE EXCEPTION 'Unsigned legacy contract was unnecessarily retained'; END IF;
END $$;
-- Failure to archive must abort parent/child deletion, not lose the evidence.
CREATE FUNCTION pg_temp.reject_archive() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'injected archive write failure'; END $$;
CREATE TRIGGER audit_reject_archive BEFORE INSERT ON public.retained_contract_records FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_archive();
DO $$ BEGIN
 BEGIN
  PERFORM public.delete_user_data('fa260906-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Archive failure did not stop erasure';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'injected archive write failure' THEN RAISE; END IF; END;
 IF (SELECT count(*) FROM public.contract_acceptance_evidence WHERE contract_id='fa260906-0000-4000-8000-000000000040')<>2 THEN
  RAISE EXCEPTION 'Evidence lost after archive failure'; END IF;
END $$;
DROP TRIGGER audit_reject_archive ON public.retained_contract_records;
SELECT public.delete_user_data('fa260906-0000-4000-8000-000000000001');
DO $$ DECLARE r public.retained_contract_records%ROWTYPE; result jsonb; BEGIN
 SELECT * INTO STRICT r FROM public.retained_contract_records WHERE contract_id='fa260906-0000-4000-8000-000000000040';
 IF r.evidence->'acceptance_evidence' IS DISTINCT FROM (SELECT evidence FROM original_acceptance) OR jsonb_array_length(r.evidence->'acceptance_evidence')<>2 OR r.evidence->'contract'->>'amount'<>'500.00'
  OR jsonb_array_length(r.evidence->'parties')<>2 OR NOT r.requires_retention_review OR r.retention_until IS NOT NULL THEN
  RAISE EXCEPTION 'Incomplete or incorrectly classified retained evidence'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id='fa260906-0000-4000-8000-000000000001') THEN
  RAISE EXCEPTION 'Retained archive kept a live owner profile'; END IF;
 result:=public.read_retained_contract(r.contract_id,'fa260906-0000-4000-8000-000000000002');
 IF result->'contract'->>'id'<>r.contract_id::text OR jsonb_array_length(result->'signatures')<>2
  OR result ? 'acceptance_evidence' OR result ? 'signature_images' THEN RAISE EXCEPTION 'Invalid participant export'; END IF;
 BEGIN
  PERFORM public.read_retained_contract(r.contract_id,'fa260906-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Deleted user retained read access';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.read_retained_contract(r.contract_id,'fa260906-0000-4000-8000-000000000003');
  RAISE EXCEPTION 'Unrelated user obtained archive';
 EXCEPTION WHEN no_data_found THEN NULL; END;
 BEGIN
  PERFORM public.read_retained_contract(r.contract_id,'fa260906-0000-4000-8000-000000000004');
  RAISE EXCEPTION 'Unrelated administrator obtained archive';
 EXCEPTION WHEN no_data_found THEN NULL; END;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM * FROM public.retained_contract_records;
  RAISE EXCEPTION 'Client direct archive read allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.read_retained_contract('fa260906-0000-4000-8000-000000000040','fa260906-0000-4000-8000-000000000002');
  RAISE EXCEPTION 'Client impersonation RPC allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN
  DELETE FROM public.retained_contract_records;
  RAISE EXCEPTION 'Service role unrestricted archive deletion allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
