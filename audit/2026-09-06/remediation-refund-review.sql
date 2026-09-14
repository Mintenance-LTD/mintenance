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
 job uuid:='fa140909-0000-4000-8000-000000000210';
BEGIN
 IF has_function_privilege('anon','public.flag_escrow_refund_review(uuid)','EXECUTE') OR
    has_function_privilege('authenticated','public.flag_escrow_refund_review(uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Client can mutate refund reconciliation status'; END IF;
 SELECT * INTO f FROM public.reserve_payment_funding(actor,job,'fa140909-0000-4000-8000-000000000220','fa140909-0000-4000-8000-000000000230','review-funding',50000);
 SELECT * INTO e FROM public.attach_payment_funding(f.id,'pi_review_fixture');
 UPDATE public.escrow_transactions SET status='held' WHERE id=e.id;
 SELECT * INTO r FROM public.reserve_escrow_refund(actor,job,e.id,'review-refund',10000,'Synthetic');
 PERFORM public.record_escrow_refund_outcome(r.id,'re_review_fixture','failed');
 PERFORM public.flag_escrow_refund_review(e.id);
 PERFORM public.flag_escrow_refund_review(e.id);
 IF NOT EXISTS(SELECT FROM public.escrow_refund_balances WHERE escrow_id=e.id AND needs_review
   AND cash_refunded_minor=0 AND credit_returned_minor=0 AND remaining_minor=50000) THEN
  RAISE EXCEPTION 'Review flag altered principal or was lost'; END IF;
 BEGIN
  PERFORM public.reserve_escrow_refund(actor,job,e.id,'review-new-refund',10000,'Synthetic');
  RAISE EXCEPTION 'Reconciliation account refunded again';
 EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE public.escrow_transactions SET status='release_pending',release_reason='auto_release' WHERE id=e.id;
 BEGIN
  PERFORM public.reserve_escrow_transfer(e.id,35000,'acct_refund_synthetic');
  RAISE EXCEPTION 'Reconciliation account transferred';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM public.credit_payout_balance('fa140909-0000-4000-8000-000000000202',35000,'GBP',job);
  RAISE EXCEPTION 'Reconciliation account credited to payout';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
