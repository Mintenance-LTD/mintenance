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
CREATE FUNCTION public.audit_dispute_insert_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Synthetic insert failure' USING ERRCODE='ZX001'; END $$;
CREATE TRIGGER audit_dispute_insert_failure BEFORE INSERT ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.audit_dispute_insert_failure();
DO $$ BEGIN
 BEGIN
 PERFORM public.create_dispute_atomic('fc160906-0000-4000-8000-000000000020','fc160906-0000-4000-8000-000000000003','fc160906-0000-4000-8000-000000000002','Incomplete repair','Synthetic dispute');
 RAISE EXCEPTION 'Insert failure not reached';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
 IF NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id='fc160906-0000-4000-8000-000000000020' AND status='held') THEN
 RAISE EXCEPTION 'Failed dispute left escrow disputed'; END IF;
END $$;
DROP TRIGGER audit_dispute_insert_failure ON public.disputes;
DO $$ DECLARE first_id uuid; second_id uuid; BEGIN
 UPDATE public.escrow_transactions SET status='release_pending' WHERE id='fc160906-0000-4000-8000-000000000020';
 BEGIN
 PERFORM public.create_dispute_atomic('fc160906-0000-4000-8000-000000000020','fc160906-0000-4000-8000-000000000003','fc160906-0000-4000-8000-000000000002','Incomplete repair','Synthetic dispute');
 RAISE EXCEPTION 'Dispute overwrote claimed release';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id='fc160906-0000-4000-8000-000000000020' AND status='release_pending') THEN RAISE EXCEPTION 'Release state changed'; END IF;
 UPDATE public.escrow_transactions SET status='held' WHERE id='fc160906-0000-4000-8000-000000000020';
 SELECT dispute_id INTO first_id FROM public.create_dispute_atomic('fc160906-0000-4000-8000-000000000020','fc160906-0000-4000-8000-000000000003','fc160906-0000-4000-8000-000000000002','Incomplete repair','Synthetic dispute');
 SELECT dispute_id INTO second_id FROM public.create_dispute_atomic('fc160906-0000-4000-8000-000000000020','fc160906-0000-4000-8000-000000000003','fc160906-0000-4000-8000-000000000002','Incomplete repair','Synthetic dispute');
 IF NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id='fc160906-0000-4000-8000-000000000020'
  AND status='disputed' AND admin_hold_status='pending_review' AND auto_approval_date IS NULL AND auto_release_date IS NULL) THEN
 RAISE EXCEPTION 'Dispute missing durable admin review hold'; END IF;
 IF first_id IS DISTINCT FROM second_id OR (SELECT count(*) FROM public.disputes WHERE job_id='fc160906-0000-4000-8000-000000000010')<>1 THEN RAISE EXCEPTION 'Lost-response replay duplicated dispute'; END IF;
END $$;
DO $$ DECLARE deadline timestamptz; BEGIN
 PERFORM public.create_dispute_with_priority('fc160906-0000-4000-8000-000000000020','fc160906-0000-4000-8000-000000000003','fc160906-0000-4000-8000-000000000002','Incomplete repair','Synthetic dispute','high');
 SELECT sla_deadline INTO deadline FROM public.escrow_transactions WHERE id='fc160906-0000-4000-8000-000000000020';
 IF deadline IS NULL OR deadline<>now()+interval '72 hours' THEN RAISE EXCEPTION 'Priority deadline not committed'; END IF;
 UPDATE public.escrow_transactions SET escalation_level=2 WHERE id='fc160906-0000-4000-8000-000000000020';
 PERFORM public.create_dispute_with_priority('fc160906-0000-4000-8000-000000000020','fc160906-0000-4000-8000-000000000003','fc160906-0000-4000-8000-000000000002','Incomplete repair','Synthetic dispute','low');
 IF NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id='fc160906-0000-4000-8000-000000000020' AND sla_deadline=deadline AND escalation_level=2 AND dispute_priority='high') THEN RAISE EXCEPTION 'Replay reset deadline or escalation'; END IF;
END $$;
-- A separately resolved dispute must not donate its expired SLA to a new one.
DO $$ BEGIN
 UPDATE public.disputes SET status='resolved' WHERE job_id='fc160906-0000-4000-8000-000000000010';
 UPDATE public.escrow_transactions SET status='held',sla_deadline=now()-interval '1 day',escalation_level=2
 WHERE id='fc160906-0000-4000-8000-000000000020';
 PERFORM public.create_dispute_with_priority('fc160906-0000-4000-8000-000000000020','fc160906-0000-4000-8000-000000000003','fc160906-0000-4000-8000-000000000002','New issue','Another synthetic dispute','critical');
 IF NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id='fc160906-0000-4000-8000-000000000020'
  AND sla_deadline=now()+interval '24 hours' AND escalation_level=0 AND dispute_priority='critical') THEN
 RAISE EXCEPTION 'New dispute inherited prior deadline or escalation'; END IF;
END $$;
ROLLBACK;
