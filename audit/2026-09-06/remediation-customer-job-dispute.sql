\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('fa220922-0000-4000-8000-000000000001','job-owner@example.invalid'),
 ('fa220922-0000-4000-8000-000000000002','job-contractor@example.invalid'),
 ('fa220922-0000-4000-8000-000000000003','job-payer@example.invalid'),
 ('fa220922-0000-4000-8000-000000000004','job-unrelated@example.invalid');
INSERT INTO public.jobs(id,homeowner_id,payer_user_id,contractor_id,title,description,location,status,completed_at)
VALUES('fa220922-0000-4000-8000-000000000010','fa220922-0000-4000-8000-000000000001',
'fa220922-0000-4000-8000-000000000003','fa220922-0000-4000-8000-000000000002',
'Synthetic job dispute','Synthetic fixture','Synthetic','completed',now());
INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status)
VALUES('fa220922-0000-4000-8000-000000000020','fa220922-0000-4000-8000-000000000010',
'fa220922-0000-4000-8000-000000000003','fa220922-0000-4000-8000-000000000002',100,'held');
CREATE FUNCTION public.audit_job_dispute_notice_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Synthetic notice failure' USING ERRCODE='ZX001'; END $$;
CREATE TRIGGER audit_job_dispute_notice_failure BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.audit_job_dispute_notice_failure();
DO $$ BEGIN
 BEGIN
 PERFORM public.create_customer_job_dispute('fa220922-0000-4000-8000-000000000010','fa220922-0000-4000-8000-000000000001','The completed repair is incomplete','incomplete');
 RAISE EXCEPTION 'Expected notification failure';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
 IF EXISTS(SELECT FROM public.disputes WHERE job_id='fa220922-0000-4000-8000-000000000010') OR
 NOT EXISTS(SELECT FROM public.jobs WHERE id='fa220922-0000-4000-8000-000000000010' AND status='completed') OR
 NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id='fa220922-0000-4000-8000-000000000020' AND status='held') THEN
 RAISE EXCEPTION 'Failed notification did not roll back entire dispute'; END IF;
END $$;
DROP TRIGGER audit_job_dispute_notice_failure ON public.notifications;
DO $$ DECLARE actor uuid; first_result record; second_result record; BEGIN
 IF has_function_privilege('anon','public.create_customer_job_dispute(uuid,uuid,text,text)','EXECUTE') OR
 has_function_privilege('authenticated','public.create_customer_job_dispute(uuid,uuid,text,text)','EXECUTE') THEN
 RAISE EXCEPTION 'Client callable dispute mutation'; END IF;
 BEGIN
 PERFORM public.create_customer_job_dispute('fa220922-0000-4000-8000-000000000010','fa220922-0000-4000-8000-000000000004','The completed repair is incomplete','incomplete');
 RAISE EXCEPTION 'Unrelated user allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 FOREACH actor IN ARRAY ARRAY['fa220922-0000-4000-8000-000000000001','fa220922-0000-4000-8000-000000000003']::uuid[] LOOP
 BEGIN
 SELECT * INTO first_result FROM public.create_customer_job_dispute('fa220922-0000-4000-8000-000000000010',actor,'The completed repair is incomplete','incomplete');
 SELECT * INTO second_result FROM public.create_customer_job_dispute('fa220922-0000-4000-8000-000000000010',actor,'The completed repair is incomplete','incomplete');
 IF first_result.dispute_id IS DISTINCT FROM second_result.dispute_id OR
 NOT EXISTS(SELECT FROM public.disputes WHERE id=first_result.dispute_id AND raised_by=actor) OR
 (SELECT count(*) FROM public.disputes WHERE job_id=first_result.job_id)<>1 OR
 (SELECT count(*) FROM public.notifications WHERE metadata->>'disputeId'=first_result.dispute_id::text)<>3 OR
 NOT EXISTS(SELECT FROM public.dispute_escrow_links WHERE dispute_id=first_result.dispute_id AND escrow_id=first_result.escrow_id) OR
 NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id=first_result.escrow_id AND status='disputed' AND admin_hold_status='pending_review') OR
 NOT EXISTS(SELECT FROM public.jobs WHERE id=first_result.job_id AND status='disputed') THEN
 RAISE EXCEPTION 'Dispute transaction or replay failed'; END IF;
 IF EXISTS(SELECT FROM public.notifications WHERE metadata->>'disputeId'=first_result.dispute_id::text AND action_url <> '/disputes/'||first_result.escrow_id::text) THEN
 RAISE EXCEPTION 'Dispute notification used wrong route identity'; END IF;
 BEGIN
 PERFORM public.create_customer_job_dispute(first_result.job_id,actor,'A changed description must not replay','quality');
 RAISE EXCEPTION 'Changed payload allowed'; EXCEPTION WHEN check_violation THEN NULL; END;
 RAISE EXCEPTION 'Rollback successful actor case' USING ERRCODE='ZX002';
 EXCEPTION WHEN SQLSTATE 'ZX002' THEN NULL; END;
 END LOOP;
END $$;
UPDATE public.escrow_transactions SET status='release_pending' WHERE id='fa220922-0000-4000-8000-000000000020';
DO $$ BEGIN
 BEGIN
 PERFORM public.create_customer_job_dispute('fa220922-0000-4000-8000-000000000010','fa220922-0000-4000-8000-000000000001','The completed repair is incomplete','incomplete');
 RAISE EXCEPTION 'Dispute overtook transfer'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
UPDATE public.escrow_transactions SET status='held' WHERE id='fa220922-0000-4000-8000-000000000020';
DO $$ BEGIN
 BEGIN
 INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status)
 VALUES('fa220922-0000-4000-8000-000000000021','fa220922-0000-4000-8000-000000000010',
 'fa220922-0000-4000-8000-000000000003','fa220922-0000-4000-8000-000000000002',100,'held');
 RAISE EXCEPTION 'Multiple active payments allowed'; EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
ROLLBACK;