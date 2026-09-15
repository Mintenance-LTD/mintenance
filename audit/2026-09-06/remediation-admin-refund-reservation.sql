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
SET LOCAL ROLE service_role;
DO $$
DECLARE f public.payment_funding_reservations; e public.escrow_transactions;
 r public.escrow_refund_operations; retry public.escrow_refund_operations;
 payer uuid:='fa140909-0000-4000-8000-000000000201';
 administrator uuid:='fa140909-0000-4000-8000-000000000203';
 job uuid:='fa140909-0000-4000-8000-000000000210';
BEGIN
 SELECT * INTO f FROM public.reserve_payment_funding(payer,job,'fa140909-0000-4000-8000-000000000220','fa140909-0000-4000-8000-000000000230','admin-refund-funding',50000);
 SELECT * INTO e FROM public.attach_payment_funding(f.id,'pi_admin_refund_fixture');
 UPDATE public.escrow_transactions SET status='held' WHERE id=e.id;
 BEGIN
  PERFORM public.reserve_admin_escrow_refund(payer,job,e.id,'denied',10000,'Synthetic');
  RAISE EXCEPTION 'Non-admin reserved an admin refund';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 SELECT * INTO r FROM public.reserve_admin_escrow_refund(administrator,job,e.id,'first-admin',10000,'Synthetic');
 IF r.actor_id<>payer OR r.initiated_by<>administrator OR r.cash_minor<>10000 OR r.credit_minor<>0 THEN
  RAISE EXCEPTION 'Admin reservation lost payer/initiator identity or allocation'; END IF;
 SELECT * INTO retry FROM public.reserve_admin_escrow_refund(administrator,job,e.id,'first-admin',10000,'Synthetic');
 IF retry.id<>r.id THEN RAISE EXCEPTION 'Retry created another refund'; END IF;
 BEGIN
  PERFORM public.reserve_admin_escrow_refund(administrator,job,e.id,'first-admin',10001,'Synthetic');
  RAISE EXCEPTION 'Changed payload accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  PERFORM public.reserve_admin_escrow_refund(administrator,job,e.id,'competing',10000,'Synthetic');
  RAISE EXCEPTION 'Competing operation accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 PERFORM public.record_escrow_refund_outcome(r.id,'re_admin_fixture','pending');
 IF (SELECT status FROM public.escrow_transactions WHERE id=e.id)<>'release_pending' THEN
  RAISE EXCEPTION 'Pending refund lost claim'; END IF;
 PERFORM public.record_escrow_refund_outcome(r.id,'re_admin_fixture','succeeded');
 PERFORM public.record_escrow_refund_outcome(r.id,'re_admin_fixture','succeeded');
 IF (SELECT remaining_minor FROM public.escrow_refund_balances WHERE escrow_id=e.id)<>40000 THEN
  RAISE EXCEPTION 'Partial refund settled incorrectly'; END IF;
 SELECT * INTO r FROM public.reserve_admin_escrow_refund(administrator,job,e.id,'remaining-admin',40000,'Synthetic remaining');
 IF r.cash_minor<>35000 OR r.credit_minor<>5000 THEN RAISE EXCEPTION 'Remaining cash/credit allocation incorrect'; END IF;
 PERFORM public.record_escrow_refund_outcome(r.id,'re_admin_remaining','succeeded');
 IF (SELECT balance_pence FROM public.user_credits WHERE user_id=payer)<>5000 OR
    EXISTS(SELECT FROM public.user_credits WHERE user_id=administrator AND balance_pence>0) OR
    (SELECT remaining_minor FROM public.escrow_refund_balances WHERE escrow_id=e.id)<>0 THEN
  RAISE EXCEPTION 'Credit was not returned to original payer exactly'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.reserve_admin_escrow_refund('fa140909-0000-4000-8000-000000000203','fa140909-0000-4000-8000-000000000210','fa140909-0000-4000-8000-000000000299','forged',100,'Synthetic');
  RAISE EXCEPTION 'Client executed admin reservation';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
