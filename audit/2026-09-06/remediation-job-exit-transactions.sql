\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('fa140909-0000-4000-8000-000000000201','funding-owner@example.invalid','{}'),
 ('fa140909-0000-4000-8000-000000000202','funding-contractor@example.invalid','{}'),
 ('fa140909-0000-4000-8000-000000000203','funding-unrelated@example.invalid','{}');
UPDATE public.profiles SET first_name='Synthetic',last_name='Audit' WHERE id IN('fa140909-0000-4000-8000-000000000201','fa140909-0000-4000-8000-000000000202','fa140909-0000-4000-8000-000000000203');
UPDATE public.profiles SET role='contractor',stripe_connect_account_id='acct_refund_synthetic' WHERE id='fa140909-0000-4000-8000-000000000202';
INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status)
 VALUES('fa140909-0000-4000-8000-000000000210','fa140909-0000-4000-8000-000000000201','fa140909-0000-4000-8000-000000000202','Synthetic audit','Synthetic maintenance description for funding audit','Synthetic','posted');
INSERT INTO public.bids(id,job_id,contractor_id,amount,description,status)
 VALUES('fa140909-0000-4000-8000-000000000220','fa140909-0000-4000-8000-000000000210','fa140909-0000-4000-8000-000000000202',500,'Synthetic accepted bid','accepted');
INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status)
 VALUES('fa140909-0000-4000-8000-000000000230','fa140909-0000-4000-8000-000000000210','fa140909-0000-4000-8000-000000000201','fa140909-0000-4000-8000-000000000202',500,'accepted');
INSERT INTO public.user_credits(user_id,balance_pence)
 VALUES('fa140909-0000-4000-8000-000000000201',5000);

UPDATE public.profiles SET role='admin' WHERE id='fa140909-0000-4000-8000-000000000203';

UPDATE public.profiles SET stripe_payouts_enabled=true,stripe_transfers_active=true WHERE id='fa140909-0000-4000-8000-000000000202';
CREATE FUNCTION pg_temp.fail_exit_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('audit.fail_exit_notification',true)='on' AND NEW.metadata ? 'jobExitId' THEN
  RAISE EXCEPTION 'Synthetic exit notification failure'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_fail_exit_notification BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_exit_notification();
SET LOCAL ROLE service_role;
DO $$
DECLARE f public.payment_funding_reservations; e public.escrow_transactions;
 no_funds_job uuid:=gen_random_uuid(); x public.job_exit_operations; retry public.job_exit_operations; r public.escrow_refund_operations;
 payer uuid:='fa140909-0000-4000-8000-000000000201'; contractor uuid:='fa140909-0000-4000-8000-000000000202';
 unrelated uuid:='fa140909-0000-4000-8000-000000000203'; job uuid:='fa140909-0000-4000-8000-000000000210';
BEGIN
 SELECT * INTO f FROM public.reserve_payment_funding(payer,job,'fa140909-0000-4000-8000-000000000220','fa140909-0000-4000-8000-000000000230','exit-funding',50000);
 SELECT * INTO e FROM public.attach_payment_funding(f.id,'pi_exit_fixture');
 UPDATE public.escrow_transactions SET status='held' WHERE id=e.id;
 UPDATE public.jobs SET status='assigned' WHERE id=job;
 BEGIN
  PERFORM public.reserve_job_exit(unrelated,job,'terminate','The appointment cannot proceed','unrelated-exit');
  RAISE EXCEPTION 'Unrelated actor reserved exit';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 SELECT * INTO x FROM public.reserve_job_exit(contractor,job,'withdraw','The appointment cannot proceed','exit-fixture');
 SELECT * INTO retry FROM public.reserve_job_exit(contractor,job,'withdraw','The appointment cannot proceed','exit-fixture');
 IF x.state<>'reserved' OR retry.id<>x.id THEN RAISE EXCEPTION 'Exit reservation not stable'; END IF;
 BEGIN
  PERFORM public.reserve_job_exit(contractor,job,'withdraw','A different withdrawal reason','exit-fixture');
  RAISE EXCEPTION 'Exit payload drift accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 SELECT * INTO r FROM public.escrow_refund_operations WHERE job_exit_id=x.id;
 IF r.actor_id<>payer OR r.cash_minor<>45000 OR r.credit_minor<>5000 THEN RAISE EXCEPTION 'Refund funding not owned by original payer'; END IF;
 PERFORM public.record_escrow_refund_outcome(r.id,'re_exit_fixture','pending');
 IF (SELECT status FROM public.jobs WHERE id=job)<>'assigned' THEN RAISE EXCEPTION 'Pending refund reopened job'; END IF;
 PERFORM public.record_escrow_refund_outcome(r.id,'re_exit_fixture','failed');
 BEGIN
  PERFORM public.reserve_admin_escrow_refund(unrelated,job,e.id,'competing-admin-refund',50000,'Synthetic');
  RAISE EXCEPTION 'Competing refund crossed a pending job exit';
 EXCEPTION WHEN check_violation THEN
  IF SQLERRM NOT LIKE 'Job exit must reconcile%' THEN RAISE; END IF;
 END;

 BEGIN
  PERFORM public.reserve_admin_escrow_release(unrelated,e.id,'Synthetic payout',0.12);
  RAISE EXCEPTION 'Competing payout crossed a pending job exit';
 EXCEPTION WHEN check_violation THEN
  IF SQLERRM NOT LIKE 'Job exit must reconcile%' THEN RAISE; END IF;
 END;
 SELECT * INTO retry FROM public.reserve_job_exit(contractor,job,'withdraw','The appointment cannot proceed','exit-fixture');
 IF retry.id<>x.id OR (SELECT count(*) FROM public.escrow_refund_operations WHERE job_exit_id=x.id)<>2 THEN
  RAISE EXCEPTION 'Terminal failure did not reserve one replacement attempt'; END IF;
 SELECT * INTO r FROM public.escrow_refund_operations WHERE job_exit_id=x.id AND state='reserved';
 IF r.id IS NULL THEN RAISE EXCEPTION 'Replacement refund missing'; END IF;

 BEGIN
  UPDATE public.jobs SET status='posted',contractor_id=NULL WHERE id=job;
  RAISE EXCEPTION 'Pending exit permitted job mutation';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.contracts(job_id,homeowner_id,contractor_id,amount,status)
  VALUES(job,payer,contractor,500,'draft');
  RAISE EXCEPTION 'Pending exit allowed a new contract';
 EXCEPTION WHEN check_violation THEN
  IF SQLERRM NOT LIKE 'Job exit must reconcile%' THEN RAISE; END IF;
 END;
 BEGIN
  INSERT INTO public.bids(job_id,contractor_id,amount,description,status)
  VALUES(job,contractor,500,'Synthetic competing bid','pending');
  RAISE EXCEPTION 'Pending exit allowed a new bid';
 EXCEPTION WHEN check_violation THEN
  IF SQLERRM NOT LIKE 'Job exit must reconcile%' THEN RAISE; END IF;
 END;
 PERFORM set_config('audit.fail_exit_notification','on',true);
 BEGIN
  PERFORM public.record_escrow_refund_outcome(r.id,'re_exit_retry','succeeded');
  RAISE EXCEPTION 'Notification failure ignored';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'Synthetic exit notification failure' THEN RAISE; END IF;
 END;
 IF (SELECT balance_pence FROM public.user_credits WHERE user_id=payer)<>0 OR
    (SELECT state FROM public.job_exit_operations WHERE id=x.id)<>'reserved' OR
    (SELECT status FROM public.bids WHERE job_id=job)<>'accepted' THEN RAISE EXCEPTION 'Exit settlement partially committed'; END IF;
 PERFORM set_config('audit.fail_exit_notification','off',true);
 PERFORM public.record_escrow_refund_outcome(r.id,'re_exit_retry','succeeded');
 PERFORM public.record_escrow_refund_outcome(r.id,'re_exit_retry','succeeded');
 IF (SELECT state FROM public.payment_funding_reservations WHERE id=f.id)<>'cancelled' THEN
  RAISE EXCEPTION 'Completed exit left an active funding reservation blocking the next contractor'; END IF;
 IF (SELECT balance_pence FROM public.user_credits WHERE user_id=payer)<>5000 OR
    (SELECT state FROM public.job_exit_operations WHERE id=x.id)<>'completed' OR
    (SELECT status FROM public.jobs WHERE id=job)<>'posted' OR
    (SELECT contractor_id FROM public.jobs WHERE id=job) IS NOT NULL OR
    (SELECT status FROM public.contracts WHERE job_id=job)<>'cancelled' OR
    (SELECT status FROM public.bids WHERE job_id=job)<>'withdrawn' OR
    (SELECT count(*) FROM public.notifications WHERE metadata->>'jobExitId'=x.id::text)<>2 THEN
  RAISE EXCEPTION 'Exit settlement failed to complete exactly once'; END IF;
 SELECT * INTO retry FROM public.reserve_job_exit(contractor,job,'withdraw','The appointment cannot proceed','exit-fixture');
 IF retry.state<>'completed' THEN RAISE EXCEPTION 'Former contractor cannot recover their completed operation'; END IF;
 IF has_function_privilege('authenticated','public.reserve_job_exit(uuid,uuid,text,text,text)','EXECUTE') OR
    has_function_privilege('service_role','public.finalize_job_exit(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Internal exit privileges exposed'; END IF;
 INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status)
 VALUES(no_funds_job,payer,contractor,'Synthetic unfunded job','Synthetic maintenance description','Synthetic','assigned');
 SELECT * INTO retry FROM public.reserve_job_exit(payer,no_funds_job,'terminate','The appointment cannot proceed','unfunded-termination');
 IF retry.state<>'completed' OR (SELECT status FROM public.jobs WHERE id=no_funds_job)<>'posted' OR
    EXISTS(SELECT FROM public.escrow_refund_operations WHERE job_exit_id=retry.id) THEN RAISE EXCEPTION 'Unfunded termination did not complete atomically'; END IF;
 UPDATE public.profiles SET role='homeowner' WHERE id=unrelated;
 UPDATE public.jobs SET status='assigned',contractor_id=contractor,payer_user_id=unrelated WHERE id=no_funds_job;
 SELECT * INTO retry FROM public.reserve_job_exit(unrelated,no_funds_job,'terminate','The appointment cannot proceed','payer-termination');
 IF retry.state<>'completed' THEN RAISE EXCEPTION 'Designated payer termination was not preserved'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
