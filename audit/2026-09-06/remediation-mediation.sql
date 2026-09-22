\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('fb220922-0000-4000-8000-000000000001','mediation-owner@example.invalid'),
 ('fb220922-0000-4000-8000-000000000002','mediation-contractor@example.invalid'),
 ('fb220922-0000-4000-8000-000000000003','mediation-payer@example.invalid'),
 ('fb220922-0000-4000-8000-000000000004','mediation-unrelated@example.invalid'),
 ('fb220922-0000-4000-8000-000000000005','mediation-admin@example.invalid');
UPDATE public.profiles SET role='admin' WHERE id='fb220922-0000-4000-8000-000000000005';
INSERT INTO public.jobs(id,homeowner_id,payer_user_id,contractor_id,title,description,location,status)
VALUES('fb220922-0000-4000-8000-000000000010','fb220922-0000-4000-8000-000000000001',
'fb220922-0000-4000-8000-000000000003','fb220922-0000-4000-8000-000000000002','Synthetic mediation','Synthetic fixture','Synthetic','completed');
INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status)
VALUES('fb220922-0000-4000-8000-000000000020','fb220922-0000-4000-8000-000000000010',
'fb220922-0000-4000-8000-000000000003','fb220922-0000-4000-8000-000000000002',100,'disputed');
CREATE FUNCTION public.audit_mediation_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'Synthetic mediation failure' USING ERRCODE='ZX003'; END $$;
CREATE TRIGGER audit_mediation_failure BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.audit_mediation_failure();
DO $$ BEGIN
 BEGIN
 PERFORM public.transition_dispute_mediation('fb220922-0000-4000-8000-000000000020','fb220922-0000-4000-8000-000000000001','request');
 RAISE EXCEPTION 'Expected notice failure'; EXCEPTION WHEN SQLSTATE 'ZX003' THEN NULL; END;
 IF EXISTS(SELECT FROM public.escrow_transactions WHERE id='fb220922-0000-4000-8000-000000000020' AND mediation_requested) THEN
 RAISE EXCEPTION 'Notification failure persisted request'; END IF;
END $$;
DROP TRIGGER audit_mediation_failure ON public.notifications;
CREATE TRIGGER audit_mediation_failure BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.audit_mediation_failure();
DO $$ BEGIN
 BEGIN
 PERFORM public.transition_dispute_mediation('fb220922-0000-4000-8000-000000000020','fb220922-0000-4000-8000-000000000001','request');
 RAISE EXCEPTION 'Expected audit failure'; EXCEPTION WHEN SQLSTATE 'ZX003' THEN NULL; END;
 IF EXISTS(SELECT FROM public.escrow_transactions WHERE id='fb220922-0000-4000-8000-000000000020' AND mediation_requested) OR
 EXISTS(SELECT FROM public.notifications WHERE metadata->>'escrowId'='fb220922-0000-4000-8000-000000000020') THEN
 RAISE EXCEPTION 'Audit failure persisted request/notification'; END IF;
END $$;
DROP TRIGGER audit_mediation_failure ON public.audit_logs;
DO $$ DECLARE a jsonb; b jsonb; notice_count integer; scheduled timestamptz:=now()+interval '1 hour'; BEGIN
 IF has_function_privilege('authenticated','public.transition_dispute_mediation(uuid,uuid,text,timestamptz,uuid,text)','EXECUTE') OR
 has_function_privilege('anon','public.transition_dispute_mediation(uuid,uuid,text,timestamptz,uuid,text)','EXECUTE') THEN
 RAISE EXCEPTION 'Mediation RPC exposed to clients'; END IF;
 BEGIN
 PERFORM public.transition_dispute_mediation('fb220922-0000-4000-8000-000000000020','fb220922-0000-4000-8000-000000000004','request');
 RAISE EXCEPTION 'Unrelated requester allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 a:=public.transition_dispute_mediation('fb220922-0000-4000-8000-000000000020','fb220922-0000-4000-8000-000000000001','request');
 SELECT count(*) INTO notice_count FROM public.notifications WHERE metadata->>'escrowId'='fb220922-0000-4000-8000-000000000020';
 b:=public.transition_dispute_mediation('fb220922-0000-4000-8000-000000000020','fb220922-0000-4000-8000-000000000002','request');
 IF a IS DISTINCT FROM b OR a->>'status'<>'pending' OR
 (SELECT count(*) FROM public.notifications WHERE metadata->>'escrowId'='fb220922-0000-4000-8000-000000000020')<>notice_count OR
 NOT EXISTS(SELECT FROM public.notifications WHERE user_id='fb220922-0000-4000-8000-000000000005' AND metadata->>'escrowId'='fb220922-0000-4000-8000-000000000020') THEN
 RAISE EXCEPTION 'Request replay or real admin notice failed'; END IF;
 BEGIN
 PERFORM public.transition_dispute_mediation('fb220922-0000-4000-8000-000000000020','fb220922-0000-4000-8000-000000000003','schedule',scheduled,'fb220922-0000-4000-8000-000000000005');
 RAISE EXCEPTION 'Customer scheduled mediation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 a:=public.transition_dispute_mediation('fb220922-0000-4000-8000-000000000020','fb220922-0000-4000-8000-000000000005','schedule',scheduled,'fb220922-0000-4000-8000-000000000005');
 b:=public.transition_dispute_mediation('fb220922-0000-4000-8000-000000000020','fb220922-0000-4000-8000-000000000005','schedule',scheduled,'fb220922-0000-4000-8000-000000000005');
 IF a IS DISTINCT FROM b OR a->>'status'<>'scheduled' THEN RAISE EXCEPTION 'Schedule replay failed'; END IF;
 BEGIN
 PERFORM public.transition_dispute_mediation('fb220922-0000-4000-8000-000000000020','fb220922-0000-4000-8000-000000000005','complete',NULL,NULL,'Synthetic recorded outcome');
 RAISE EXCEPTION 'Future mediation completed'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
UPDATE public.escrow_transactions SET mediation_scheduled_at=now()-interval '1 hour' WHERE id='fb220922-0000-4000-8000-000000000020';
UPDATE public.profiles SET role='homeowner' WHERE id='fb220922-0000-4000-8000-000000000005';
DO $$ BEGIN
 BEGIN
 PERFORM public.transition_dispute_mediation('fb220922-0000-4000-8000-000000000020','fb220922-0000-4000-8000-000000000005','complete',NULL,NULL,'Synthetic recorded outcome');
 RAISE EXCEPTION 'Revoked administrator completed mediation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
UPDATE public.profiles SET role='admin' WHERE id='fb220922-0000-4000-8000-000000000005';
DO $$ DECLARE a jsonb; b jsonb; BEGIN
 a:=public.transition_dispute_mediation('fb220922-0000-4000-8000-000000000020','fb220922-0000-4000-8000-000000000005','complete',NULL,NULL,'Synthetic recorded outcome');
 b:=public.transition_dispute_mediation('fb220922-0000-4000-8000-000000000020','fb220922-0000-4000-8000-000000000005','complete',NULL,NULL,'Synthetic recorded outcome');
 IF a IS DISTINCT FROM b OR a->>'status'<>'completed' THEN RAISE EXCEPTION 'Completion replay failed'; END IF;
 IF (SELECT count(*) FROM public.audit_logs WHERE record_id='fb220922-0000-4000-8000-000000000020' AND new_values->>'event' LIKE 'MEDIATION_%')<>3 THEN
 RAISE EXCEPTION 'Mediation audit events duplicated/missing'; END IF;
 IF NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id='fb220922-0000-4000-8000-000000000020' AND status='disputed' AND amount=100) THEN
 RAISE EXCEPTION 'Mediation unexpectedly settled money'; END IF;
 BEGIN
 PERFORM public.transition_dispute_mediation('fb220922-0000-4000-8000-000000000020','fb220922-0000-4000-8000-000000000005','complete',NULL,NULL,'Changed resolution outcome');
 RAISE EXCEPTION 'Completed outcome silently overwritten'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
