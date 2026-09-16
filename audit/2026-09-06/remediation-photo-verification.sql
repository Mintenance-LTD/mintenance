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
UPDATE public.escrow_transactions SET photo_verification_status='manual_review' WHERE id='fc160906-0000-4000-8000-000000000020';
CREATE FUNCTION public.audit_photo_notice_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Synthetic notice failure' USING ERRCODE='ZX001'; END $$;
CREATE TRIGGER audit_photo_notice_failure BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.audit_photo_notice_failure();
DO $$ DECLARE ids uuid[]; BEGIN
 SELECT array_agg(id) INTO ids FROM public.job_photos_metadata WHERE job_id='fc160906-0000-4000-8000-000000000010';
 BEGIN
 PERFORM public.record_completion_photo_verification('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
 'fc160906-0000-4000-8000-000000000002','2026-09-15T10:00:00Z',ids,true,true,true,0.9,true);
 RAISE EXCEPTION 'Expected notification failure';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
 IF NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id='fc160906-0000-4000-8000-000000000020'
 AND status='held' AND photo_verification_status='manual_review' AND auto_approval_date IS NULL) THEN
 RAISE EXCEPTION 'Verification survived failed durable notification'; END IF;
END $$;
DROP TRIGGER audit_photo_notice_failure ON public.notifications;
DO $$ DECLARE ids uuid[]; BEGIN
 SELECT array_agg(id) INTO ids FROM public.job_photos_metadata WHERE job_id='fc160906-0000-4000-8000-000000000010';
 IF has_function_privilege('authenticated','public.record_completion_photo_verification(uuid,uuid,uuid,timestamptz,uuid[],boolean,boolean,boolean,double precision,boolean)','execute') THEN
 RAISE EXCEPTION 'Private verification RPC exposed'; END IF;
 BEGIN
 PERFORM public.record_completion_photo_verification('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
 'fc160906-0000-4000-8000-000000000001','2026-09-15T10:00:00Z',ids,true,true,true,0.9,true);
 RAISE EXCEPTION 'Owner impersonated analyzer contractor';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
 PERFORM public.record_completion_photo_verification('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
 'fc160906-0000-4000-8000-000000000002','2026-09-14T10:00:00Z',ids,true,true,true,0.9,true);
 RAISE EXCEPTION 'Stale completion accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
 PERFORM public.record_completion_photo_verification('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
 'fc160906-0000-4000-8000-000000000002','2026-09-15T10:00:00Z',ARRAY[gen_random_uuid()],true,true,true,0.9,true);
 RAISE EXCEPTION 'Unbound evidence accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 PERFORM public.record_completion_photo_verification('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000020',
 'fc160906-0000-4000-8000-000000000002','2026-09-15T10:00:00Z',ids,true,true,true,0.9,true);
 IF NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id='fc160906-0000-4000-8000-000000000020' AND status='awaiting_homeowner_approval' AND photo_verification_status='verified') OR
 (SELECT count(*) FROM public.notifications WHERE metadata->>'escrowId'='fc160906-0000-4000-8000-000000000020')<>1 THEN
 RAISE EXCEPTION 'Verification did not atomically request review'; END IF;
END $$;
ROLLBACK;
