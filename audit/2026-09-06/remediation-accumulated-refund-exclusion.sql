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
 BEGIN
  PERFORM public.credit_payout_balance(contractor,40000,'GBP',job);
  RAISE EXCEPTION 'Unclaimed escrow credited';
 EXCEPTION WHEN check_violation THEN NULL; END;
 SELECT * INTO r FROM public.reserve_escrow_refund(actor,job,e.id,'payout-refund',10000,'Synthetic');
 BEGIN
  PERFORM public.credit_payout_balance(contractor,40000,'GBP',job);
  RAISE EXCEPTION 'Pending refund credited';
 EXCEPTION WHEN check_violation THEN NULL; END;
 PERFORM public.record_escrow_refund_outcome(r.id,'re_payout_fixture','succeeded');
 UPDATE public.escrow_transactions SET status='release_pending',release_reason='auto_release' WHERE id=e.id;
 BEGIN
  PERFORM public.credit_payout_balance(actor,35000,'GBP',job);
  RAISE EXCEPTION 'Wrong recipient credited';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM public.credit_payout_balance(contractor,35000,'USD',job);
  RAISE EXCEPTION 'Wrong currency credited';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM public.credit_payout_balance(contractor,45000,'GBP',job);
  RAISE EXCEPTION 'Refunded principal credited';
 EXCEPTION WHEN check_violation THEN NULL; END;
 -- A direct transfer claim prevents switching payout modes.
 BEGIN
  PERFORM public.reserve_escrow_transfer(e.id,35000,'acct_refund_synthetic');
  PERFORM public.credit_payout_balance(contractor,35000,'GBP',job);
  RAISE EXCEPTION 'Direct and accumulated payout both reserved';
 EXCEPTION WHEN check_violation THEN NULL; END;
 PERFORM public.credit_payout_balance(contractor,35000,'GBP',job);
 PERFORM public.credit_payout_balance(contractor,35000,'gbp',job);
 IF (SELECT pending_amount_minor FROM public.contractor_payout_balances WHERE contractor_id=contractor AND currency='GBP')<>35000 THEN
  RAISE EXCEPTION 'Retry duplicated payout credit'; END IF;
 BEGIN
  PERFORM public.credit_payout_balance(contractor,34000,'GBP',job);
  RAISE EXCEPTION 'Changed payout payload accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM public.reserve_escrow_transfer(e.id,35000,'acct_refund_synthetic');
  RAISE EXCEPTION 'Accumulated earnings also transferred directly';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE public.escrow_transactions SET status='release_pending',release_reason='refund_pending' WHERE id=e.id;
  RAISE EXCEPTION 'Legacy refund claim consumed accumulated earnings';
 EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE public.escrow_transactions SET status='held',release_reason=NULL WHERE id=e.id;
 BEGIN
  PERFORM public.reserve_escrow_refund(actor,job,e.id,'after-credit',10000,'Synthetic');
  RAISE EXCEPTION 'Credited earnings refunded';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
