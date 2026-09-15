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
CREATE FUNCTION pg_temp.fail_settlement_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('audit.fail_settlement',true)='on' THEN
  RAISE EXCEPTION 'Synthetic notification failure' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_fail_settlement_notification BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_settlement_notification();
SET LOCAL ROLE service_role;
DO $$
DECLARE f public.payment_funding_reservations; e public.escrow_transactions; r public.escrow_refund_operations;
 actor uuid:='fa140909-0000-4000-8000-000000000201';
 contractor uuid:='fa140909-0000-4000-8000-000000000202';
 job uuid:='fa140909-0000-4000-8000-000000000210';
BEGIN
 SELECT * INTO f FROM public.reserve_payment_funding(actor,job,'fa140909-0000-4000-8000-000000000220','fa140909-0000-4000-8000-000000000230','payout-funding',50000);
 SELECT * INTO e FROM public.attach_payment_funding(f.id,'pi_payout_fixture');
 UPDATE public.escrow_transactions SET status='held' WHERE id=e.id;


 SELECT * INTO r FROM public.reserve_escrow_refund(actor,job,e.id,'tiny-refund',49975,'Synthetic');
 PERFORM public.record_escrow_refund_outcome(r.id,'re_tiny_fixture','succeeded');
 UPDATE public.jobs SET status='assigned' WHERE id=job;
 UPDATE public.jobs SET status='in_progress' WHERE id=job;
 UPDATE public.jobs SET status='completed' WHERE id=job;
 PERFORM public.claim_escrow_release(e.id,'manual_release',gen_random_uuid());
 BEGIN
  PERFORM public.settle_fee_only_escrow(e.id,50,actor);
  RAISE EXCEPTION 'Changed amount settled';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM public.settle_fee_only_escrow(e.id,25,'fa140909-0000-4000-8000-000000000203');
  RAISE EXCEPTION 'Unrelated actor settled';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;

 BEGIN
  PERFORM public.reserve_escrow_transfer(e.id,1,'acct_refund_synthetic');
  PERFORM public.settle_fee_only_escrow(e.id,25,actor);
  RAISE EXCEPTION 'Existing direct payout was settled as fee-only';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM public.credit_payout_balance(contractor,1,'GBP',job);
  PERFORM public.settle_fee_only_escrow(e.id,25,actor);
  RAISE EXCEPTION 'Existing accumulated payout was settled as fee-only';
 EXCEPTION WHEN check_violation THEN NULL; END;
 PERFORM set_config('audit.fail_settlement','on',true);
 BEGIN
  PERFORM public.settle_fee_only_escrow(e.id,25,actor);
  RAISE EXCEPTION 'Expected notification failure';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.escrow_fee_only_settlements WHERE escrow_id=e.id) OR
    (SELECT status FROM public.escrow_transactions WHERE id=e.id)<>'release_pending' THEN
  RAISE EXCEPTION 'Failed transaction partially settled'; END IF;
 PERFORM set_config('audit.fail_settlement','off',true);
 PERFORM public.settle_fee_only_escrow(e.id,25,actor);
 PERFORM public.settle_fee_only_escrow(e.id,25,actor);
 IF (SELECT count(*) FROM public.escrow_fee_only_settlements WHERE escrow_id=e.id)<>1 OR
    (SELECT count(*) FROM public.notifications WHERE metadata->>'escrowTransactionId'=e.id::text)<>2 OR
    (SELECT count(*) FROM public.escrow_audit_log WHERE escrow_transaction_id=e.id)<>1 THEN
  RAISE EXCEPTION 'Retry duplicated accounting or notifications'; END IF;
 IF (SELECT actor_role FROM public.escrow_audit_log WHERE escrow_transaction_id=e.id) IS DISTINCT FROM 'homeowner' THEN
  RAISE EXCEPTION 'Audit lost actor role'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.escrow_transactions WHERE id=e.id AND status='completed'
   AND platform_fee=0.25 AND contractor_payout=0 AND transfer_id IS NULL) THEN
  RAISE EXCEPTION 'Settlement fabricated payout or allocated excess fee'; END IF;
 IF EXISTS(SELECT 1 FROM public.escrow_transfer_attempts WHERE escrow_id=e.id) OR
    EXISTS(SELECT 1 FROM public.contractor_payout_credit_events WHERE job_id=job) THEN
  RAISE EXCEPTION 'Settlement created a payout'; END IF;
 BEGIN
  UPDATE public.escrow_transactions SET status='held' WHERE id=e.id;
  RAISE EXCEPTION 'Settled principal was reopened';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('anon','public.settle_fee_only_escrow(uuid,integer,uuid)','EXECUTE') OR
    has_function_privilege('authenticated','public.settle_fee_only_escrow(uuid,integer,uuid)','EXECUTE') OR
    has_table_privilege('authenticated','public.escrow_fee_only_settlements','SELECT') THEN
  RAISE EXCEPTION 'Untrusted client may access settlements'; END IF;
END $$;
ROLLBACK;
