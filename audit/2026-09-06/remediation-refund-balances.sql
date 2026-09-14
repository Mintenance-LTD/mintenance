\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('fa140909-0000-4000-8000-000000000201','funding-owner@example.invalid','{}'),
 ('fa140909-0000-4000-8000-000000000202','funding-contractor@example.invalid','{}'),
 ('fa140909-0000-4000-8000-000000000203','funding-unrelated@example.invalid','{}');
UPDATE public.profiles SET role='contractor',stripe_connect_account_id='acct_refund_synthetic' WHERE id='fa140909-0000-4000-8000-000000000202';
INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status)
 VALUES('fa140909-0000-4000-8000-000000000210','fa140909-0000-4000-8000-000000000201','fa140909-0000-4000-8000-000000000202','Synthetic audit','Synthetic maintenance description for funding audit','Synthetic','posted');
INSERT INTO public.bids(id,job_id,contractor_id,amount,description,status)
 VALUES('fa140909-0000-4000-8000-000000000220','fa140909-0000-4000-8000-000000000210','fa140909-0000-4000-8000-000000000202',500,'Synthetic accepted bid','accepted');
INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status)
 VALUES('fa140909-0000-4000-8000-000000000230','fa140909-0000-4000-8000-000000000210','fa140909-0000-4000-8000-000000000201','fa140909-0000-4000-8000-000000000202',500,'accepted');
INSERT INTO public.user_credits(user_id,balance_pence)
 VALUES('fa140909-0000-4000-8000-000000000201',5000);
CREATE FUNCTION pg_temp.fail_refund_job_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('audit.fail_refund_job',true)='on' AND NEW.status='cancelled' THEN
  RAISE EXCEPTION 'Synthetic job update failure after credit return' USING ERRCODE='ZX001'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_fail_refund_job BEFORE UPDATE ON public.jobs
 FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_refund_job_update();
SET LOCAL ROLE service_role;
DO $$
DECLARE f public.payment_funding_reservations; e public.escrow_transactions;
 r public.escrow_refund_operations; retry public.escrow_refund_operations;
 actor uuid:='fa140909-0000-4000-8000-000000000201';
 job uuid:='fa140909-0000-4000-8000-000000000210';
BEGIN
 SELECT * INTO f FROM public.reserve_payment_funding(actor,job,'fa140909-0000-4000-8000-000000000220','fa140909-0000-4000-8000-000000000230','refund-funding',50000);
 SELECT * INTO e FROM public.attach_payment_funding(f.id,'pi_refund_fixture');
 UPDATE public.escrow_transactions SET status='held' WHERE id=e.id;
 BEGIN
  PERFORM public.reserve_escrow_refund('fa140909-0000-4000-8000-000000000203',job,e.id,'unrelated',10000,'Synthetic');
  RAISE EXCEPTION 'Unrelated user reserved refund';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 SELECT * INTO r FROM public.reserve_escrow_refund(actor,job,e.id,'first',10000,'Synthetic');
 SELECT * INTO retry FROM public.reserve_escrow_refund(actor,job,e.id,'first',10000,'Synthetic');
 IF r.id<>retry.id OR r.cash_minor<>10000 OR r.credit_minor<>0 THEN RAISE EXCEPTION 'Refund retry or allocation changed'; END IF;
 BEGIN
  PERFORM public.reserve_escrow_refund(actor,job,e.id,'first',10001,'Synthetic');
  RAISE EXCEPTION 'Payload changed on same key';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM public.reserve_escrow_refund(actor,job,e.id,'competing',10000,'Synthetic');
  RAISE EXCEPTION 'Competing refund reserved';
 EXCEPTION WHEN check_violation THEN NULL; END;
 PERFORM public.record_escrow_refund_outcome(r.id,'re_first','pending');
 IF (SELECT status FROM public.escrow_transactions WHERE id=e.id)<>'release_pending' OR
    (SELECT remaining_minor FROM public.escrow_refund_balances WHERE escrow_id=e.id)<>50000 THEN
  RAISE EXCEPTION 'Pending refund incorrectly settled'; END IF;
 PERFORM public.record_escrow_refund_outcome(r.id,'re_first','succeeded');
 PERFORM public.record_escrow_refund_outcome(r.id,'re_first','succeeded');
 IF (SELECT remaining_minor FROM public.escrow_refund_balances WHERE escrow_id=e.id)<>40000 OR
    (SELECT status FROM public.jobs WHERE id=job)<>'posted' OR
    (SELECT balance_pence FROM public.user_credits WHERE user_id=actor)<>0 THEN
  RAISE EXCEPTION '500 minus 100 must retain 400 without credit return or job cancellation'; END IF;
 BEGIN
  PERFORM public.reserve_escrow_refund(actor,job,e.id,'excess',40001,'Synthetic');
  RAISE EXCEPTION 'Refund exceeded remaining principal';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE public.escrow_transactions SET status='release_pending',release_reason='manual' WHERE id=e.id;
  PERFORM public.reserve_escrow_transfer(e.id,43000,'acct_refund_synthetic');
  RAISE EXCEPTION 'Payout used original principal after partial refund';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE public.escrow_transactions SET status='release_pending',release_reason='manual' WHERE id=e.id;
  PERFORM public.reserve_escrow_transfer(e.id,35000,'acct_refund_synthetic');
  RAISE EXCEPTION 'Rollback valid transfer diagnostic' USING ERRCODE='ZX002';
 EXCEPTION WHEN SQLSTATE 'ZX002' THEN NULL; END;
 BEGIN
  INSERT INTO public.contractor_payout_credit_events(contractor_id,job_id,currency,amount_minor)
   VALUES(e.payee_id,job,'GBP',35000);
  PERFORM public.reserve_escrow_refund(actor,job,e.id,'already-credited',10000,'Synthetic');
  RAISE EXCEPTION 'Refund claimed contractor earnings already in the payout ledger';
 EXCEPTION WHEN check_violation THEN NULL; END;
 -- Two equal-sized user actions with different keys are distinct operations.
 SELECT * INTO retry FROM public.reserve_escrow_refund(actor,job,e.id,'second',10000,'Synthetic');
 IF retry.id=r.id THEN RAISE EXCEPTION 'Second refund collapsed into first'; END IF;
 BEGIN
  PERFORM public.record_escrow_refund_outcome(r.id,'re_first','failed');
  IF NOT (SELECT needs_review FROM public.escrow_refund_balances WHERE escrow_id=e.id) OR
     (SELECT state FROM public.escrow_refund_operations WHERE id=retry.id)<>'reserved' THEN
   RAISE EXCEPTION 'Late return was not preserved alongside a newer in-flight refund'; END IF;
  RAISE EXCEPTION 'Rollback late-return diagnostic' USING ERRCODE='ZX003';
 EXCEPTION WHEN SQLSTATE 'ZX003' THEN NULL; END;
 PERFORM public.record_escrow_refund_outcome(retry.id,'re_failed','failed');
 IF (SELECT remaining_minor FROM public.escrow_refund_balances WHERE escrow_id=e.id)<>40000 THEN
  RAISE EXCEPTION 'Failed refund consumed principal'; END IF;
 SELECT * INTO r FROM public.reserve_escrow_refund(actor,job,e.id,'rest',40000,'Synthetic');
 IF r.cash_minor<>35000 OR r.credit_minor<>5000 THEN RAISE EXCEPTION 'Credit-funded remainder allocated incorrectly'; END IF;
 PERFORM set_config('audit.fail_refund_job','on',true);
 BEGIN
  PERFORM public.record_escrow_refund_outcome(r.id,'re_rest','succeeded');
  RAISE EXCEPTION 'Injected finalization failure was not reached';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
 PERFORM set_config('audit.fail_refund_job','off',true);
 IF (SELECT remaining_minor FROM public.escrow_refund_balances WHERE escrow_id=e.id)<>40000 OR
    (SELECT balance_pence FROM public.user_credits WHERE user_id=actor)<>0 OR
    (SELECT state FROM public.escrow_refund_operations WHERE id=r.id)<>'reserved' OR
    (SELECT status FROM public.escrow_transactions WHERE id=e.id)<>'release_pending' THEN
  RAISE EXCEPTION 'Finalization failure did not roll back all accounting writes'; END IF;
 PERFORM public.record_escrow_refund_outcome(r.id,'re_rest','succeeded');
 PERFORM public.record_escrow_refund_outcome(r.id,'re_rest','succeeded');
 IF (SELECT remaining_minor FROM public.escrow_refund_balances WHERE escrow_id=e.id)<>0 OR
    (SELECT status FROM public.escrow_transactions WHERE id=e.id)<>'refunded' OR
    (SELECT status FROM public.jobs WHERE id=job)<>'cancelled' OR
    (SELECT balance_pence FROM public.user_credits WHERE user_id=actor)<>5000 OR
    (SELECT count(*) FROM public.user_credit_ledger WHERE reference_id=r.id AND delta_pence=5000)<>1 THEN
  RAISE EXCEPTION 'Full refund did not settle cash and credit exactly once'; END IF;
 -- A later returned refund is an exception needing reconciliation, never an
 -- invitation to restore available principal and issue a second payout.
 PERFORM public.record_escrow_refund_outcome(r.id,'re_rest','failed');
 IF NOT (SELECT needs_review FROM public.escrow_refund_balances WHERE escrow_id=e.id) OR
    (SELECT remaining_minor FROM public.escrow_refund_balances WHERE escrow_id=e.id)<>0 THEN
  RAISE EXCEPTION 'Late bank failure revived settled principal'; END IF;
 RAISE NOTICE 'PASS: partial/cumulative refunds, cash-credit allocation, replay, pending/failure handling, payer isolation';
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.reserve_escrow_refund('fa140909-0000-4000-8000-000000000201','fa140909-0000-4000-8000-000000000210','fa140909-0000-4000-8000-000000000299','forged',100,'Synthetic');
  RAISE EXCEPTION 'Client called refund reservation';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM * FROM public.escrow_refund_balances;
  RAISE EXCEPTION 'Client read internal balances';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
