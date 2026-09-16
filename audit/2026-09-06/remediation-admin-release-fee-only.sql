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
 VALUES('fa140909-0000-4000-8000-000000000220','fa140909-0000-4000-8000-000000000210','fa140909-0000-4000-8000-000000000202',0.30,'Synthetic accepted bid','accepted');
INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status)
 VALUES('fa140909-0000-4000-8000-000000000230','fa140909-0000-4000-8000-000000000210','fa140909-0000-4000-8000-000000000201','fa140909-0000-4000-8000-000000000202',0.30,'accepted');
INSERT INTO public.user_credits(user_id,balance_pence)
 VALUES('fa140909-0000-4000-8000-000000000201',0);

UPDATE public.profiles SET role='admin' WHERE id='fa140909-0000-4000-8000-000000000203';

UPDATE public.profiles SET stripe_payouts_enabled=true,stripe_transfers_active=true WHERE id='fa140909-0000-4000-8000-000000000202';
SET LOCAL ROLE service_role;
DO $$
DECLARE f public.payment_funding_reservations; e public.escrow_transactions; op public.escrow_admin_release_operations;
BEGIN
 SELECT * INTO f FROM public.reserve_payment_funding('fa140909-0000-4000-8000-000000000201','fa140909-0000-4000-8000-000000000210','fa140909-0000-4000-8000-000000000220','fa140909-0000-4000-8000-000000000230','fee-only-admin-release',30);
 SELECT * INTO e FROM public.attach_payment_funding(f.id,'pi_admin_fee_only_fixture');
 UPDATE public.escrow_transactions SET status='held' WHERE id=e.id;
 SELECT * INTO op FROM public.reserve_admin_escrow_release('fa140909-0000-4000-8000-000000000203',e.id,'Reviewed completion',0.12);
 IF op.principal_minor<>30 OR op.fee_minor<>30 OR op.payout_minor<>0 THEN RAISE EXCEPTION 'Fee-only economics incorrect'; END IF;
 BEGIN
  PERFORM public.finalize_admin_escrow_release(op.id,'tr_not_allowed');
  RAISE EXCEPTION 'Fee-only settlement accepted a transfer';
 EXCEPTION WHEN check_violation THEN NULL; END;
 PERFORM public.finalize_admin_escrow_release(op.id,NULL);
 PERFORM public.finalize_admin_escrow_release(op.id,NULL);
 IF (SELECT status FROM public.escrow_transactions WHERE id=e.id)<>'completed' OR
    (SELECT contractor_payout FROM public.escrow_transactions WHERE id=e.id)<>0 OR
    (SELECT platform_fee FROM public.escrow_transactions WHERE id=e.id)<>0.30 OR
    EXISTS(SELECT FROM public.escrow_transfer_attempts WHERE escrow_id=e.id) OR
    (SELECT count(*) FROM public.notifications WHERE metadata->>'releaseOperationId'=op.id::text)<>2 THEN
  RAISE EXCEPTION 'Fee-only settlement effects incorrect'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
