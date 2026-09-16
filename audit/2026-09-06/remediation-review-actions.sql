\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('fc160906-0000-4000-8000-000000000001','review-owner@example.invalid'),
 ('fc160906-0000-4000-8000-000000000002','review-contractor@example.invalid'),
 ('fc160906-0000-4000-8000-000000000003','review-payer@example.invalid');
INSERT INTO public.jobs(id,homeowner_id,payer_user_id,contractor_id,title,description,location,status,completed_at)
 VALUES('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000001',
 'fc160906-0000-4000-8000-000000000003','fc160906-0000-4000-8000-000000000002',
 'Synthetic review','Synthetic maintenance review fixture','Synthetic','completed','2026-09-15T10:00:00Z');
INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status,photo_verification_status)
 VALUES('fc160906-0000-4000-8000-000000000020','fc160906-0000-4000-8000-000000000010',
 'fc160906-0000-4000-8000-000000000003','fc160906-0000-4000-8000-000000000002',500,'held','verified');
INSERT INTO public.job_photos_metadata(job_id,photo_url,photo_type,verified)
 VALUES('fc160906-0000-4000-8000-000000000010','https://example.invalid/synthetic-review-after','after',true);
DO $$ DECLARE action text; BEGIN
 IF has_function_privilege('anon','public.record_completion_review(uuid,uuid,uuid,timestamptz,text,text)','execute') OR
    has_function_privilege('authenticated','public.record_completion_review(uuid,uuid,uuid,timestamptz,text,text)','execute') THEN
  RAISE EXCEPTION 'Review function exposed to client roles'; END IF;
 FOREACH action IN ARRAY ARRAY['request','inspect','reject'] LOOP
  BEGIN
   PERFORM public.record_completion_review('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
    'fc160906-0000-4000-8000-000000000001','2026-09-15T10:00:00Z',action,'Synthetic rejection');
   RAISE EXCEPTION 'Nonpayer owner could %',action;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END LOOP;
END $$;
CREATE FUNCTION public.audit_review_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Synthetic review evidence failure' USING ERRCODE='ZX001'; END $$;
CREATE TRIGGER audit_review_failure BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.audit_review_failure();
DO $$ BEGIN
 BEGIN
  PERFORM public.record_completion_review('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
   'fc160906-0000-4000-8000-000000000002','2026-09-15T10:00:00Z','request');
  RAISE EXCEPTION 'Notification fault not reached';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
 IF EXISTS(SELECT FROM public.escrow_transactions WHERE id='fc160906-0000-4000-8000-000000000020' AND (status<>'held' OR auto_approval_date IS NOT NULL)) THEN
  RAISE EXCEPTION 'Review request survived missing notification'; END IF;
END $$;
DROP TRIGGER audit_review_failure ON public.notifications;
DO $$ DECLARE first_deadline timestamptz; BEGIN
 IF NOT public.record_completion_review('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
   'fc160906-0000-4000-8000-000000000002','2026-09-15T10:00:00Z','request') THEN RAISE EXCEPTION 'Review not opened'; END IF;
 SELECT auto_approval_date INTO first_deadline FROM public.escrow_transactions WHERE id='fc160906-0000-4000-8000-000000000020';
 IF public.record_completion_review('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
   'fc160906-0000-4000-8000-000000000002','2026-09-15T10:00:00Z','request') THEN RAISE EXCEPTION 'Review replay not recognized'; END IF;
 IF (SELECT auto_approval_date FROM public.escrow_transactions WHERE id='fc160906-0000-4000-8000-000000000020')<>first_deadline OR
   (SELECT count(*) FROM public.notifications WHERE metadata->>'jobId'='fc160906-0000-4000-8000-000000000010')<>1 OR
   NOT EXISTS(SELECT FROM public.notifications WHERE metadata->>'jobId'='fc160906-0000-4000-8000-000000000010' AND user_id='fc160906-0000-4000-8000-000000000003') THEN
  RAISE EXCEPTION 'Review replay moved deadline or duplicated/misaddressed notice'; END IF;
 IF NOT public.record_completion_review('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
   'fc160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z','inspect') THEN RAISE EXCEPTION 'Inspection missing'; END IF;
 IF public.record_completion_review('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
   'fc160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z','inspect') THEN RAISE EXCEPTION 'Inspection replay repeated'; END IF;
END $$;
CREATE TRIGGER audit_review_failure BEFORE INSERT ON public.homeowner_approval_history FOR EACH ROW EXECUTE FUNCTION public.audit_review_failure();
DO $$ BEGIN
 BEGIN
  PERFORM public.record_completion_review('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
   'fc160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z','reject','Please repair the seal');
  RAISE EXCEPTION 'History fault not reached';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
 IF EXISTS(SELECT FROM public.escrow_transactions WHERE id='fc160906-0000-4000-8000-000000000020' AND (admin_hold_status='pending_review' OR auto_approval_date IS NULL)) THEN
  RAISE EXCEPTION 'Rejection survived history failure'; END IF;
END $$;
DROP TRIGGER audit_review_failure ON public.homeowner_approval_history;
DO $$ BEGIN
 IF NOT public.record_completion_review('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
   'fc160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z','reject','Please repair the seal') THEN RAISE EXCEPTION 'Rejection missing'; END IF;
 IF public.record_completion_review('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
   'fc160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z','reject','Please repair the seal') THEN RAISE EXCEPTION 'Rejection replay repeated'; END IF;
 IF (SELECT count(*) FROM public.homeowner_approval_history WHERE escrow_transaction_id='fc160906-0000-4000-8000-000000000020')<>1 THEN RAISE EXCEPTION 'Duplicate rejection evidence'; END IF;
 BEGIN
  PERFORM public.approve_job_completion('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z');
  RAISE EXCEPTION 'Approval overwrote pending rejection';
 EXCEPTION WHEN check_violation THEN NULL; END;
 PERFORM public.request_job_rework('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000003','review-rework','Repair the seal');
 BEGIN
  PERFORM public.record_completion_review('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
   'fc160906-0000-4000-8000-000000000003','2026-09-15T10:00:00Z','inspect');
  RAISE EXCEPTION 'Stale inspection restored rework flags';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
