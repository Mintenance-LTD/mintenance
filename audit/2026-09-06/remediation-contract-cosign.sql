\set ON_ERROR_STOP on
BEGIN;
-- All records are synthetic and the transaction always rolls back.
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('fa160906-0000-4000-8000-000000000001','audit-owner@example.invalid','{}'),
 ('fa160906-0000-4000-8000-000000000002','audit-contractor@example.invalid','{}'),
 ('fa160906-0000-4000-8000-000000000003','audit-unrelated@example.invalid','{}'),
 ('fa160906-0000-4000-8000-000000000004','audit-admin@example.invalid','{}');
UPDATE public.profiles SET role='contractor' WHERE id='fa160906-0000-4000-8000-000000000002';
UPDATE public.profiles SET role='admin' WHERE id='fa160906-0000-4000-8000-000000000004';
INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status)
 VALUES ('fa160906-0000-4000-8000-000000000010','fa160906-0000-4000-8000-000000000001','fa160906-0000-4000-8000-000000000002','Synthetic audit job','Synthetic maintenance description for rollback-only audit','Synthetic','draft');
INSERT INTO public.properties(id,owner_id,property_name,address,property_type)
 VALUES ('fa160906-0000-4000-8000-000000000020','fa160906-0000-4000-8000-000000000001','Synthetic','Synthetic','residential');
UPDATE public.profiles SET first_name='Synthetic',last_name='Signer' WHERE id IN ('fa160906-0000-4000-8000-000000000001','fa160906-0000-4000-8000-000000000002');
INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status)
VALUES ('fa160906-0000-4000-8000-000000000040','fa160906-0000-4000-8000-000000000010','fa160906-0000-4000-8000-000000000001','fa160906-0000-4000-8000-000000000002',500,'pending_contractor');


INSERT INTO public.contract_signatories(contract_id,user_id,role,invited_email)
 VALUES ('fa160906-0000-4000-8000-000000000040','fa160906-0000-4000-8000-000000000003','second_homeowner','audit-unrelated@example.invalid');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.sign_contract_cosigner_atomic('fa160906-0000-4000-8000-000000000040','fa160906-0000-4000-8000-000000000003');
  RAISE EXCEPTION 'Client RPC must be denied';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.contract_signatories SET signed_at=now();
  RAISE EXCEPTION 'Client signature write must be denied';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN
  PERFORM public.sign_contract_cosigner_atomic('fa160906-0000-4000-8000-000000000040','fa160906-0000-4000-8000-000000000004');
  RAISE EXCEPTION 'Uninvited admin must be denied';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.delete_unsigned_contract_atomic('fa160906-0000-4000-8000-000000000040','fa160906-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Non-contractor deletion must be denied';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT public.sign_contract_atomic('fa160906-0000-4000-8000-000000000040','fa160906-0000-4000-8000-000000000002',NULL,NULL,NULL)->>'status';
SELECT public.sign_contract_atomic('fa160906-0000-4000-8000-000000000040','fa160906-0000-4000-8000-000000000001',NULL,NULL,NULL)->>'status';
RESET ROLE;
-- Inject failure after the signature and status writes. The whole function must roll back.
CREATE FUNCTION pg_temp.fail_cosign_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.metadata->>'contractId'='fa160906-0000-4000-8000-000000000040' THEN RAISE EXCEPTION 'injected notification failure'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_cosign_failure BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_cosign_notification();
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN
  PERFORM public.sign_contract_cosigner_atomic('fa160906-0000-4000-8000-000000000040','fa160906-0000-4000-8000-000000000003');
  RAISE EXCEPTION 'Expected injected failure';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'injected notification failure' THEN RAISE; END IF;
 END;
 IF EXISTS(SELECT 1 FROM public.contract_cosignature_evidence WHERE contract_id='fa160906-0000-4000-8000-000000000040')
 OR EXISTS(SELECT 1 FROM public.contract_signatories WHERE contract_id='fa160906-0000-4000-8000-000000000040' AND signed_at IS NOT NULL)
 OR EXISTS(SELECT 1 FROM public.contracts WHERE id='fa160906-0000-4000-8000-000000000040' AND status='accepted') THEN
  RAISE EXCEPTION 'Partial signing persisted after failure'; END IF;
END $$;
RESET ROLE;
DROP TRIGGER audit_cosign_failure ON public.notifications;
SET LOCAL ROLE service_role;
DO $$ DECLARE a jsonb; b jsonb; BEGIN
 a:=public.sign_contract_cosigner_atomic('fa160906-0000-4000-8000-000000000040','fa160906-0000-4000-8000-000000000003');
 b:=public.sign_contract_cosigner_atomic('fa160906-0000-4000-8000-000000000040','fa160906-0000-4000-8000-000000000003');
 IF a->>'contract_promoted'<>'true' OR b->>'already_signed'<>'true' OR b->>'contract_promoted'<>'false' OR a->>'signed_at'<>b->>'signed_at' THEN
  RAISE EXCEPTION 'Invalid sign/replay responses'; END IF;
 IF (SELECT count(*) FROM public.contract_cosignature_evidence WHERE contract_id='fa160906-0000-4000-8000-000000000040')<>1
 OR (SELECT count(*) FROM public.notifications WHERE metadata->>'contractId'='fa160906-0000-4000-8000-000000000040')<>2 THEN
  RAISE EXCEPTION 'Evidence or notifications duplicated'; END IF;
 BEGIN
  PERFORM public.delete_unsigned_contract_atomic('fa160906-0000-4000-8000-000000000040','fa160906-0000-4000-8000-000000000002');
  RAISE EXCEPTION 'Signed contract deleted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.contract_signatories(contract_id,user_id,role) VALUES('fa160906-0000-4000-8000-000000000040','fa160906-0000-4000-8000-000000000004','second_homeowner');
  RAISE EXCEPTION 'Accepted contract admitted invitation';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;
-- An unsigned contract can still be deleted; cancelled contracts cannot be signed.
INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status)
 VALUES ('fa160906-0000-4000-8000-000000000011','fa160906-0000-4000-8000-000000000001','fa160906-0000-4000-8000-000000000002','Synthetic unsigned job','Synthetic maintenance description','Synthetic','draft');
INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status)
 VALUES('fa160906-0000-4000-8000-000000000041','fa160906-0000-4000-8000-000000000011','fa160906-0000-4000-8000-000000000001','fa160906-0000-4000-8000-000000000002',500,'draft');
SET LOCAL ROLE service_role;
SELECT public.delete_unsigned_contract_atomic('fa160906-0000-4000-8000-000000000041','fa160906-0000-4000-8000-000000000002');
RESET ROLE;
UPDATE public.contracts SET status='cancelled' WHERE id='fa160906-0000-4000-8000-000000000040';
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN
  PERFORM public.sign_contract_cosigner_atomic('fa160906-0000-4000-8000-000000000040','fa160906-0000-4000-8000-000000000003');
  RAISE EXCEPTION 'Cancelled contract resurrected';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
