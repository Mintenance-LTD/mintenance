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
CREATE FUNCTION public.audit_signature_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic evidence failure' USING ERRCODE='ZX001'; END $$;
CREATE TRIGGER audit_signature_fail BEFORE INSERT ON public.contract_signatures FOR EACH ROW EXECUTE FUNCTION public.audit_signature_fail();
DO $$ BEGIN
  BEGIN
    PERFORM public.sign_contract_atomic('fa060906-0000-4000-8000-000000000040','fa060906-0000-4000-8000-000000000002','{"signatureImage":"<svg/>","signatureFormat":"svg","platform":"web"}',NULL,NULL);
    RAISE EXCEPTION 'Expected injected failure';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
  IF EXISTS(SELECT 1 FROM public.contract_acceptance_evidence WHERE contract_id='fa060906-0000-4000-8000-000000000040') OR
     EXISTS(SELECT 1 FROM public.contracts WHERE id='fa060906-0000-4000-8000-000000000040' AND contractor_signed_at IS NOT NULL) THEN RAISE EXCEPTION 'Partial signing committed'; END IF;
END $$;
DROP TRIGGER audit_signature_fail ON public.contract_signatures;
SELECT public.sign_contract_atomic('fa060906-0000-4000-8000-000000000040','fa060906-0000-4000-8000-000000000002',NULL,NULL,NULL)->>'status' AS contractor_status;
SELECT public.sign_contract_atomic('fa060906-0000-4000-8000-000000000040','fa060906-0000-4000-8000-000000000001',NULL,NULL,NULL)->>'status' AS homeowner_status;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.contract_acceptance_evidence WHERE contract_id='fa060906-0000-4000-8000-000000000040') <> 2 THEN RAISE EXCEPTION 'Missing click evidence'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.contracts WHERE id='fa060906-0000-4000-8000-000000000040' AND status='accepted') THEN RAISE EXCEPTION 'Contract not accepted'; END IF;
END $$;
DO $$ BEGIN
  BEGIN
    UPDATE public.contracts SET amount=900 WHERE id='fa060906-0000-4000-8000-000000000040';
    RAISE EXCEPTION 'Signed amount changed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE public.contracts SET contractor_signed_at=NULL WHERE id='fa060906-0000-4000-8000-000000000040';
    RAISE EXCEPTION 'Signature erased';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
ROLLBACK;
