BEGIN;
CREATE FUNCTION pg_temp.reject_reconciliation_test_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id::text=current_setting('audit.reconciliation_failure_id',true) THEN
 RAISE EXCEPTION 'synthetic result write failure' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_reconciliation_failure BEFORE UPDATE OF metadata ON public.escrow_transactions
FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_reconciliation_test_write();
DO $$
DECLARE owner_id uuid:=gen_random_uuid(); contractor_id uuid:=gen_random_uuid(); job_id uuid:=gen_random_uuid();
 ids uuid[]:='{}'; eid uuid; claim jsonb; old_token uuid; i integer; answer boolean; before_meta jsonb;
BEGIN
 INSERT INTO auth.users(id,email) VALUES(owner_id,owner_id||'@example.invalid'),(contractor_id,contractor_id||'@example.invalid');
 INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status)
 VALUES(job_id,owner_id,contractor_id,'Synthetic queue','Synthetic queue fixture','Synthetic','posted');
 FOR i IN 1..105 LOOP
 eid:=gen_random_uuid(); ids:=array_append(ids,eid);
 INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status,payment_intent_id,created_at,metadata)
 VALUES(eid,job_id,owner_id,contractor_id,100,'refunded','pi_synthetic_'||eid,
 '1800-01-01'::timestamptz+make_interval(secs=>i),'{"retained":"preserve"}');
 END LOOP;
 FOR i IN 1..105 LOOP
 claim:=public.claim_payment_reconciliation();
 IF (claim->>'escrow_id')::uuid<>ids[i] THEN RAISE EXCEPTION 'Oldest backlog item skipped at %',i; END IF;
 answer:=public.finish_payment_reconciliation(ids[i],(claim->>'token')::uuid,'matched','{"stripe_status":"succeeded"}');
 IF answer IS DISTINCT FROM true THEN RAISE EXCEPTION 'Acknowledgement failed'; END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.payment_reconciliation_work WHERE escrow_id=ANY(ids) AND outcome='matched')<>105
 THEN RAISE EXCEPTION 'Backlog was truncated'; END IF;
 IF EXISTS(SELECT 1 FROM public.escrow_transactions WHERE id=ANY(ids) AND metadata->>'retained'<>'preserve')
 THEN RAISE EXCEPTION 'Unrelated metadata lost'; END IF;
 -- Expired claim cannot acknowledge; new token supersedes it.
 UPDATE public.payment_reconciliation_work SET next_check_at=now()-interval '1 day',last_checked_at=NULL WHERE escrow_id=ids[1];
 claim:=public.claim_payment_reconciliation(); old_token:=(claim->>'token')::uuid;
 UPDATE public.payment_reconciliation_work SET lease_until=clock_timestamp()-interval '1 second' WHERE escrow_id=ids[1];
 IF public.finish_payment_reconciliation(ids[1],old_token,'missing','{}') THEN RAISE EXCEPTION 'Expired claim accepted'; END IF;
 claim:=public.claim_payment_reconciliation();
 IF (claim->>'token')::uuid=old_token THEN RAISE EXCEPTION 'Claim token not rotated'; END IF;
 IF public.finish_payment_reconciliation(ids[1],old_token,'missing','{}') THEN RAISE EXCEPTION 'Stale owner accepted'; END IF;
 -- Source changed while provider lookup ran: no financial conclusion may overwrite current metadata.
 SELECT metadata INTO before_meta FROM public.escrow_transactions WHERE id=ids[1];
 UPDATE public.escrow_transactions SET amount=101 WHERE id=ids[1];
 IF public.finish_payment_reconciliation(ids[1],(claim->>'token')::uuid,'missing','{}') THEN RAISE EXCEPTION 'Stale snapshot accepted'; END IF;
 IF (SELECT metadata FROM public.escrow_transactions WHERE id=ids[1]) IS DISTINCT FROM before_meta
 THEN RAISE EXCEPTION 'Stale observation changed metadata'; END IF;
 IF (SELECT outcome FROM public.payment_reconciliation_work WHERE escrow_id=ids[1])<>'stale'
 THEN RAISE EXCEPTION 'Stale observation not requeued'; END IF;
 -- A metadata write failure rolls back the work acknowledgement too.
 UPDATE public.payment_reconciliation_work SET next_check_at=now()-interval '1 day',last_checked_at=NULL WHERE escrow_id=ids[2];
 claim:=public.claim_payment_reconciliation();
 PERFORM set_config('audit.reconciliation_failure_id',ids[2]::text,true);
 BEGIN
 PERFORM public.finish_payment_reconciliation(ids[2],(claim->>'token')::uuid,'missing','{}');
 RAISE EXCEPTION 'Injected write failure did not run';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF (SELECT claim_token FROM public.payment_reconciliation_work WHERE escrow_id=ids[2]) IS DISTINCT FROM (claim->>'token')::uuid
 THEN RAISE EXCEPTION 'Failed write consumed claim'; END IF;
 IF has_function_privilege('anon' ,'public.claim_payment_reconciliation()','EXECUTE')
 OR has_function_privilege('authenticated','public.finish_payment_reconciliation(uuid,uuid,text,jsonb)','EXECUTE')
 OR has_table_privilege('authenticated','public.payment_reconciliation_runs','SELECT')
 OR has_table_privilege('service_role','public.payment_reconciliation_work','UPDATE')
 THEN RAISE EXCEPTION 'Unexpected reconciliation privilege'; END IF;
 RAISE NOTICE 'PASS: 105 oldest records, fenced expiry/reclaim, source-change retry, metadata preservation and grants';
END $$;
ROLLBACK;
