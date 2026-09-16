\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('fb160906-0000-4000-8000-000000000001','approval-owner@example.invalid'),
 ('fb160906-0000-4000-8000-000000000002','approval-contractor@example.invalid'),
 ('fb160906-0000-4000-8000-000000000003','approval-payer@example.invalid');
INSERT INTO public.jobs(id,homeowner_id,payer_user_id,contractor_id,title,description,location,status,completed_at)
 VALUES('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000001',
 'fb160906-0000-4000-8000-000000000003','fb160906-0000-4000-8000-000000000002',
 'Synthetic approval','Synthetic maintenance approval fixture','Synthetic','completed','2026-09-15T10:00:00Z');
INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status)
 VALUES('fb160906-0000-4000-8000-000000000020','fb160906-0000-4000-8000-000000000010',
 'fb160906-0000-4000-8000-000000000003','fb160906-0000-4000-8000-000000000002',500,'awaiting_homeowner_approval');
INSERT INTO public.job_photos_metadata(job_id,photo_url,photo_type,verified)
 VALUES('fb160906-0000-4000-8000-000000000010','https://example.invalid/synthetic-after','after',null);

DO $$ BEGIN
 IF has_function_privilege('anon','public.approve_job_completion(uuid,uuid,timestamptz,uuid,text,boolean,boolean)','execute') OR
    has_function_privilege('authenticated','public.approve_job_completion(uuid,uuid,timestamptz,uuid,text,boolean,boolean)','execute') THEN
  RAISE EXCEPTION 'Approval function exposed to client roles'; END IF;
 BEGIN
  PERFORM public.approve_job_completion('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000001','2026-09-15T10:00:00Z');
  RAISE EXCEPTION 'Nonpayer owner was permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.approve_job_completion('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z');
  RAISE EXCEPTION 'Null verified photo accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
UPDATE public.job_photos_metadata SET verified=true WHERE job_id='fb160906-0000-4000-8000-000000000010';
DO $$ DECLARE blocked_state text; result jsonb; BEGIN
 FOREACH blocked_state IN ARRAY ARRAY['pending','release_pending','released','refunded','disputed','cancelled','failed'] LOOP
  UPDATE public.escrow_transactions SET status=blocked_state WHERE id='fb160906-0000-4000-8000-000000000020';
  BEGIN
   PERFORM public.approve_job_completion('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z');
   RAISE EXCEPTION 'Approval accepted protected payment state %',blocked_state;
  EXCEPTION WHEN check_violation THEN NULL; END;
 END LOOP;
 UPDATE public.escrow_transactions SET status='awaiting_homeowner_approval' WHERE id='fb160906-0000-4000-8000-000000000020';
 BEGIN
  UPDATE public.escrow_transactions SET auto_approval_date=now()-interval '1 day',auto_release_enabled=true,
   photo_verification_status='verified',photo_verification_score=0.8 WHERE id='fb160906-0000-4000-8000-000000000020';
  result:=public.approve_job_completion('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z',NULL,'automatic fixture',true);
  IF result->>'applied'<>'true' OR EXISTS(SELECT FROM public.escrow_transactions WHERE id='fb160906-0000-4000-8000-000000000020' AND homeowner_inspection_completed) THEN
   RAISE EXCEPTION 'Automatic decision was missing or recorded as human inspection'; END IF;
  RAISE EXCEPTION 'Rollback automatic fixture subtransaction' USING ERRCODE='ZX002';
 EXCEPTION WHEN SQLSTATE 'ZX002' THEN NULL; END;
END $$;
CREATE FUNCTION public.audit_approval_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Synthetic approval evidence failure' USING ERRCODE='ZX001'; END $$;
CREATE TRIGGER audit_approval_failure BEFORE INSERT ON public.homeowner_approval_history FOR EACH ROW EXECUTE FUNCTION public.audit_approval_failure();
DO $$ BEGIN
 BEGIN
  PERFORM public.approve_job_completion('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z');
  RAISE EXCEPTION 'Failure injection was not reached';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
 IF EXISTS(SELECT FROM public.jobs WHERE id='fb160906-0000-4000-8000-000000000010' AND completion_confirmed_by_homeowner)
  OR EXISTS(SELECT FROM public.escrow_transactions WHERE id='fb160906-0000-4000-8000-000000000020' AND homeowner_approval) THEN
  RAISE EXCEPTION 'State survived failed evidence write'; END IF;
END $$;
DROP TRIGGER audit_approval_failure ON public.homeowner_approval_history;
CREATE TRIGGER audit_approval_failure BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.audit_approval_failure();
DO $$ BEGIN
 BEGIN
  PERFORM public.approve_job_completion('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z');
  RAISE EXCEPTION 'Notification injection was not reached';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
 IF EXISTS(SELECT FROM public.homeowner_approval_history WHERE escrow_transaction_id='fb160906-0000-4000-8000-000000000020') THEN
  RAISE EXCEPTION 'History survived failed notification'; END IF;
END $$;
DROP TRIGGER audit_approval_failure ON public.notifications;

DO $$ DECLARE first_result jsonb; replay jsonb; BEGIN
 first_result:=public.approve_job_completion('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z');
 replay:=public.approve_job_completion('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z');
 IF first_result->>'applied'<>'true' OR replay->>'applied'<>'false' OR
  (first_result->>'coolingOffEndsAt')::timestamptz<>now()+interval '48 hours' OR
  first_result->>'coolingOffEndsAt'<>replay->>'coolingOffEndsAt' THEN RAISE EXCEPTION 'Invalid replay or cooling-off'; END IF;
 IF (SELECT count(*) FROM public.homeowner_approval_history WHERE escrow_transaction_id='fb160906-0000-4000-8000-000000000020')<>1 OR
  (SELECT count(*) FROM public.notifications WHERE metadata->>'jobId'='fb160906-0000-4000-8000-000000000010')<>1 THEN
  RAISE EXCEPTION 'Duplicate approval history or notice'; END IF;
 BEGIN
  PERFORM public.claim_escrow_release('fb160906-0000-4000-8000-000000000020','homeowner_approved',gen_random_uuid());
  RAISE EXCEPTION 'Release bypassed cooling-off';
 EXCEPTION WHEN check_violation THEN NULL; END;
 PERFORM public.request_job_rework('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000003','synthetic-rework-approval','Repair the seal');
 BEGIN
  PERFORM public.approve_job_completion('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z');
  RAISE EXCEPTION 'Stale approval undid rework';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
UPDATE public.jobs SET status='completed',completed_at='2026-09-16T10:00:00Z' WHERE id='fb160906-0000-4000-8000-000000000010';
DO $$ BEGIN
 BEGIN
  PERFORM public.claim_escrow_release('fb160906-0000-4000-8000-000000000020','homeowner_approved',gen_random_uuid());
  RAISE EXCEPTION 'Release bypassed fresh approval after rework';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM public.approve_job_completion('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z');
  RAISE EXCEPTION 'Old completion version accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM public.approve_job_completion('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000003','2026-09-16T10:00:00Z');
  RAISE EXCEPTION 'Old photos approved a new rework cycle';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
INSERT INTO public.job_photos_metadata(job_id,photo_url,photo_type,verified,created_at)
 VALUES('fb160906-0000-4000-8000-000000000010','https://example.invalid/synthetic-rework-after','after',true,clock_timestamp()+interval '1 second');
DO $$ DECLARE result jsonb; BEGIN
 BEGIN
  PERFORM public.approve_job_completion('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000003','2026-09-16T10:00:00Z',NULL,NULL,true);
  RAISE EXCEPTION 'Auto approval accepted without deadline/score';
 EXCEPTION WHEN check_violation THEN NULL; END;
 result:=public.approve_job_completion('fb160906-0000-4000-8000-000000000010','fb160906-0000-4000-8000-000000000003','2026-09-16T10:00:00Z',NULL,NULL,false,true);
 IF result->>'applied'<>'true' OR result->>'coolingOffEndsAt' IS NOT NULL THEN RAISE EXCEPTION 'New cycle waiver failed'; END IF;
 IF NOT EXISTS(SELECT FROM public.jobs WHERE id='fb160906-0000-4000-8000-000000000010' AND completion_confirmed_by_homeowner) THEN RAISE EXCEPTION 'Job approval missing'; END IF;
 IF (SELECT count(*) FROM public.claim_escrow_release('fb160906-0000-4000-8000-000000000020','homeowner_approved',gen_random_uuid()))<>1 THEN RAISE EXCEPTION 'Valid release claim failed'; END IF;
END $$;
ROLLBACK;
