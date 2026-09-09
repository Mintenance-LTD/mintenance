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
 VALUES ('fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000001','fa060906-0000-4000-8000-000000000002','Synthetic audit job','Synthetic maintenance description for rollback-only audit','Synthetic','completed');
INSERT INTO public.properties(id,owner_id,property_name,address,property_type)
 VALUES ('fa060906-0000-4000-8000-000000000020','fa060906-0000-4000-8000-000000000001','Synthetic','Synthetic','residential');
INSERT INTO public.escrow_transactions(job_id,payer_id,payee_id,amount,status,homeowner_approval,auto_release_date)
VALUES ('fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000001','fa060906-0000-4000-8000-000000000002',500,'held',true,now());
CREATE FUNCTION public.audit_rework_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  RAISE EXCEPTION 'synthetic write failure' USING ERRCODE='ZX001';
END $$;
CREATE TRIGGER audit_rework_fail BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.audit_rework_fail();
DO $$ BEGIN
  BEGIN
    PERFORM public.request_job_rework('fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000001','synthetic-rework-key','Fix the finish');
    RAISE EXCEPTION 'Failure injection did not execute';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.escrow_transactions WHERE job_id='fa060906-0000-4000-8000-000000000010' AND homeowner_approval=true AND auto_release_date IS NOT NULL) THEN
    RAISE EXCEPTION 'Escrow changed despite job failure';
  END IF;
END $$;
DROP TRIGGER audit_rework_fail ON public.jobs;
DO $$ BEGIN
  IF NOT public.request_job_rework('fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000001','synthetic-rework-key','Fix the finish') THEN RAISE EXCEPTION 'First request was not applied'; END IF;
  IF public.request_job_rework('fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000001','synthetic-rework-key','Fix the finish') THEN RAISE EXCEPTION 'Replay was not recognized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE id='fa060906-0000-4000-8000-000000000010' AND status='in_progress') THEN RAISE EXCEPTION 'Job not reopened'; END IF;
  IF EXISTS (SELECT 1 FROM public.escrow_transactions WHERE job_id='fa060906-0000-4000-8000-000000000010' AND (homeowner_approval OR auto_release_date IS NOT NULL)) THEN RAISE EXCEPTION 'Approval not reset'; END IF;
  BEGIN
    PERFORM public.request_job_rework('fa060906-0000-4000-8000-000000000010','fa060906-0000-4000-8000-000000000003','other-key','Forged request');
    RAISE EXCEPTION 'Unrelated actor allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
ROLLBACK;
