BEGIN;
CREATE FUNCTION public.audit_fail_webhook_job() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.title='Synthetic webhook rollback' AND NEW.payment_status='paid' THEN
  RAISE EXCEPTION 'synthetic job write failure'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_fail_webhook_job BEFORE UPDATE ON public.jobs
 FOR EACH ROW EXECUTE FUNCTION public.audit_fail_webhook_job();
DO $$
DECLARE owner_id uuid:=gen_random_uuid(); contractor_id uuid:=gen_random_uuid();
 job_id_value uuid:=gen_random_uuid(); escrow_id_value uuid:=gen_random_uuid();
 pi text:='pi_synthetic_'||gen_random_uuid()::text; stage text; n integer;
BEGIN
 INSERT INTO auth.users(id,email) VALUES(owner_id,owner_id::text||'@example.invalid'),(contractor_id,contractor_id::text||'@example.invalid');
 INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status,payment_status)
 VALUES(job_id_value,owner_id,contractor_id,'Synthetic webhook rollback','Synthetic maintenance test fixture','Synthetic','posted','pending');
 INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status,payment_intent_id)
 VALUES(escrow_id_value,job_id_value,owner_id,contractor_id,500,'pending',pi);
 BEGIN
  PERFORM public.apply_payment_intent_state(pi,'succeeded',50000,'gbp');
  RAISE EXCEPTION 'Expected injected job write failure';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'synthetic job write failure' THEN RAISE; END IF;
 END;
 IF (SELECT status FROM public.escrow_transactions WHERE id=escrow_id_value)<>'pending'
  OR (SELECT payment_status FROM public.jobs WHERE id=job_id_value)<>'pending' THEN
  RAISE EXCEPTION 'Partial webhook funding committed'; END IF;
 UPDATE public.jobs SET title='Synthetic webhook transitions' WHERE id=job_id_value;
 SELECT count(*) INTO n FROM public.apply_payment_intent_state(pi,'succeeded',50000,'gbp');
 IF n<>1 OR (SELECT status FROM public.escrow_transactions WHERE id=escrow_id_value)<>'held'
  OR (SELECT payment_status FROM public.jobs WHERE id=job_id_value)<>'paid' THEN
  RAISE EXCEPTION 'Funding did not persist both records'; END IF;
 SELECT count(*) INTO n FROM public.apply_payment_intent_state(pi,'failed');
 IF n<>0 OR (SELECT payment_status FROM public.jobs WHERE id=job_id_value)<>'paid' THEN
  RAISE EXCEPTION 'Late failure overwrote funding'; END IF;
 FOREACH stage IN ARRAY ARRAY['pending_review','awaiting_homeowner_approval','release_pending','released','completed','refunded','disputed'] LOOP
  UPDATE public.escrow_transactions SET status=stage WHERE id=escrow_id_value;
  UPDATE public.jobs SET payment_status='refunded' WHERE id=job_id_value;
  SELECT count(*) INTO n FROM public.apply_payment_intent_state(pi,'succeeded',50000,'gbp');
  IF n<>0 OR (SELECT status FROM public.escrow_transactions WHERE id=escrow_id_value)<>stage
   OR (SELECT payment_status FROM public.jobs WHERE id=job_id_value)<>'refunded' THEN
   RAISE EXCEPTION 'Post-funding stage overwritten: %',stage; END IF;
 END LOOP;
 UPDATE public.escrow_transactions SET status='pending' WHERE id=escrow_id_value;
 BEGIN
  PERFORM public.apply_payment_intent_state(pi,'succeeded',49999,'gbp');
  RAISE EXCEPTION 'Mismatched principal accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 SELECT count(*) INTO n FROM public.apply_payment_intent_state(pi,'canceled');
 IF n<>1 OR (SELECT payment_status FROM public.jobs WHERE id=job_id_value)<>'canceled' THEN
  RAISE EXCEPTION 'Cancellation did not persist both records'; END IF;
 IF has_function_privilege('anon','public.apply_payment_intent_state(text,text,integer,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.apply_payment_intent_state(text,text,integer,text)','EXECUTE') THEN
  RAISE EXCEPTION 'Client can execute webhook transition'; END IF;
 RAISE NOTICE 'PASS: atomic rollback, funding, late failure, seven post-funding states, amount validation, cancellation, client grants';
END $$;
ROLLBACK;
