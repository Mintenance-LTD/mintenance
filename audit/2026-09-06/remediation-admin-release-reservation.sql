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

UPDATE public.profiles SET role='admin' WHERE id='fa140909-0000-4000-8000-000000000203';

UPDATE public.profiles SET stripe_payouts_enabled=true,stripe_transfers_active=true WHERE id='fa140909-0000-4000-8000-000000000202';
CREATE FUNCTION pg_temp.reject_release_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('audit.fail_release_notify',true)='on' AND NEW.metadata ? 'releaseOperationId' THEN
  RAISE EXCEPTION 'Synthetic notification failure';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_reject_release_notification BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_release_notification();
SET LOCAL ROLE service_role;
DO $$
DECLARE f public.payment_funding_reservations; e public.escrow_transactions; r public.escrow_refund_operations;
 op public.escrow_admin_release_operations; retry public.escrow_admin_release_operations;
 transfer public.escrow_transfer_attempts;
 payer uuid:='fa140909-0000-4000-8000-000000000201'; administrator uuid:='fa140909-0000-4000-8000-000000000203';
 job uuid:='fa140909-0000-4000-8000-000000000210';
BEGIN
 SELECT * INTO f FROM public.reserve_payment_funding(payer,job,'fa140909-0000-4000-8000-000000000220','fa140909-0000-4000-8000-000000000230','admin-release-funding',50000);
 SELECT * INTO e FROM public.attach_payment_funding(f.id,'pi_admin_release_fixture');
 UPDATE public.escrow_transactions SET status='held' WHERE id=e.id;
 SELECT * INTO r FROM public.reserve_admin_escrow_refund(administrator,job,e.id,'partial-first',10000,'Synthetic');
 BEGIN
  PERFORM public.reserve_admin_escrow_release(administrator,e.id,'Reviewed completion',0.12);
  RAISE EXCEPTION 'Release crossed pending refund';
 EXCEPTION WHEN check_violation THEN NULL; END;
 PERFORM public.record_escrow_refund_outcome(r.id,'re_admin_partial','succeeded');
 BEGIN
  PERFORM public.reserve_admin_escrow_release(payer,e.id,'Reviewed completion',0.12);
  RAISE EXCEPTION 'Non-admin claimed release';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 INSERT INTO public.platform_fee_transfers(escrow_transaction_id,amount,currency,net_revenue)
 VALUES(e.id,1,'gbp',NULL);
 BEGIN
  PERFORM public.reserve_admin_escrow_release(administrator,e.id,'Reviewed completion',0.12);
  RAISE EXCEPTION 'Existing fee ledger did not prevent a new payout claim';
 EXCEPTION WHEN check_violation THEN NULL; END;
 DELETE FROM public.platform_fee_transfers WHERE escrow_transaction_id=e.id;
 SELECT * INTO op FROM public.reserve_admin_escrow_release(administrator,e.id,'Reviewed completion',0.12);
 IF op.principal_minor<>40000 OR op.fee_minor<>4800 OR op.payout_minor<>35200 THEN
  RAISE EXCEPTION 'Admin release used original amount or incorrect fees'; END IF;
 SELECT * INTO retry FROM public.reserve_admin_escrow_release(administrator,e.id,'Reviewed completion',0.05);
 IF retry.id<>op.id OR retry.fee_minor<>4800 THEN RAISE EXCEPTION 'Retry changed frozen economics'; END IF;
 BEGIN
  PERFORM public.reserve_admin_escrow_release(administrator,e.id,'Changed reason',0.12);
  RAISE EXCEPTION 'Reason drift accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 SELECT * INTO transfer FROM public.reserve_escrow_transfer(e.id,op.payout_minor,op.destination);
 IF (transfer.stripe_parameters->>'amount')::integer<>35200 THEN RAISE EXCEPTION 'Provider operation amount drifted'; END IF;
 BEGIN
  UPDATE public.jobs SET contractor_id=NULL WHERE id=job;
  RAISE EXCEPTION 'Pending release allowed reassignment';
 EXCEPTION WHEN check_violation THEN
  IF SQLERRM NOT LIKE 'Admin payment release%' THEN RAISE; END IF;
 END;
 BEGIN
  PERFORM public.finalize_admin_escrow_release(op.id,'tr_missing');
  RAISE EXCEPTION 'Release finalized without recorded provider transfer';
 EXCEPTION WHEN check_violation THEN NULL; END;
 -- Synthetic provider confirmation: no external payment is made.
 UPDATE public.escrow_transfer_attempts SET transfer_id='tr_admin_fixture' WHERE escrow_id=e.id;
 PERFORM set_config('audit.fail_release_notify','on',true);
 BEGIN
  PERFORM public.finalize_admin_escrow_release(op.id,'tr_admin_fixture');
  RAISE EXCEPTION 'Notification failure did not prevent settlement';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Synthetic notification failure' THEN RAISE; END IF;
 END;
 IF (SELECT state FROM public.escrow_admin_release_operations WHERE id=op.id)<>'reserved' OR
    (SELECT status FROM public.escrow_transactions WHERE id=e.id)<>'release_pending' OR
    EXISTS(SELECT FROM public.notifications WHERE metadata->>'releaseOperationId'=op.id::text) OR
    EXISTS(SELECT FROM public.audit_logs WHERE new_values->>'operation_id'=op.id::text) OR
    EXISTS(SELECT FROM public.platform_fee_transfers WHERE escrow_transaction_id=e.id) THEN
  RAISE EXCEPTION 'Failed notification left a partial settlement'; END IF;
 PERFORM set_config('audit.fail_release_notify','off',true);
 PERFORM public.finalize_admin_escrow_release(op.id,'tr_admin_fixture');
 PERFORM public.finalize_admin_escrow_release(op.id,'tr_admin_fixture');
 IF (SELECT contractor_payout FROM public.escrow_transactions WHERE id=e.id)<>352 OR
    (SELECT platform_fee FROM public.escrow_transactions WHERE id=e.id)<>48 OR
    (SELECT count(*) FROM public.notifications WHERE metadata->>'releaseOperationId'=op.id::text)<>2 OR
    (SELECT count(*) FROM public.audit_logs WHERE new_values->>'operation_id'=op.id::text)<>1 THEN
  RAISE EXCEPTION 'Finalization amounts or exactly-once effects incorrect'; END IF;
 IF (SELECT count(*) FROM public.platform_fee_transfers WHERE escrow_transaction_id=e.id)<>1 OR
    NOT EXISTS(SELECT FROM public.platform_fee_transfers WHERE id=op.id AND amount=48 AND currency='gbp'
      AND stripe_processing_fee IS NULL AND net_revenue IS NULL AND metadata->>'processingFeeStatus'='pending') THEN
  RAISE EXCEPTION 'Atomic fee accounting missing or fabricated provider cost'; END IF;
 IF has_function_privilege('authenticated','public.reserve_admin_escrow_release(uuid,uuid,text,numeric)','EXECUTE') THEN
  RAISE EXCEPTION 'Client can reserve admin release'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
