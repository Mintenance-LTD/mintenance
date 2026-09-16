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
DO $$ BEGIN
 BEGIN
  PERFORM public.request_job_rework_for_completion('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000003','version-test','Repair seal','2026-09-14T10:00:00Z');
  RAISE EXCEPTION 'Stale screen reopened newer completion';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF NOT public.request_job_rework_for_completion('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000003','version-test','Repair seal','2026-09-15T10:00:00Z') THEN
  RAISE EXCEPTION 'Current rework not applied'; END IF;
 IF public.request_job_rework_for_completion('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000003','version-test','Repair seal','2026-09-15T10:00:00Z') THEN
  RAISE EXCEPTION 'Replay was reapplied'; END IF;
 IF public.request_job_rework_for_completion('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000003','restart-new-key','Repair seal','2026-09-15T10:00:00Z') THEN RAISE EXCEPTION 'Restart repeated rework'; END IF;
 IF (SELECT count(*) FROM public.job_rework_requests WHERE job_id='fc160906-0000-4000-8000-000000000010' AND completion_version='2026-09-15T10:00:00Z')<>1 THEN
  RAISE EXCEPTION 'Completion version not persisted'; END IF;
END $$;
ROLLBACK;
