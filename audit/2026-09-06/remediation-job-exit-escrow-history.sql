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
SET LOCAL ROLE service_role;
DO $$
DECLARE f public.payment_funding_reservations; e public.escrow_transactions; second_escrow uuid;
 x public.job_exit_operations; r public.escrow_refund_operations;
 payer uuid:='fa140909-0000-4000-8000-000000000201'; contractor uuid:='fa140909-0000-4000-8000-000000000202';
 job uuid:='fa140909-0000-4000-8000-000000000210';
BEGIN
 SELECT * INTO f FROM public.reserve_payment_funding(payer,job,'fa140909-0000-4000-8000-000000000220','fa140909-0000-4000-8000-000000000230','exit-multi',50000);
 SELECT * INTO e FROM public.attach_payment_funding(f.id,'pi_exit_first');
 UPDATE public.escrow_transactions SET status='held' WHERE id=e.id;
 UPDATE public.jobs SET status='assigned' WHERE id=job;
 BEGIN
  INSERT INTO public.escrow_transactions(job_id,payer_id,payee_id,amount,status,payment_intent_id)
  VALUES(job,payer,contractor,50,'held','pi_exit_competing');
  RAISE EXCEPTION 'More than one active escrow allowed';
 EXCEPTION WHEN unique_violation THEN
  IF SQLERRM NOT LIKE '%uq_escrow_active_per_job%' THEN RAISE; END IF;
 END;
 INSERT INTO public.escrow_transactions(job_id,payer_id,payee_id,amount,status,payment_intent_id)
 VALUES(job,payer,contractor,50,'refunded','pi_exit_historical') RETURNING id INTO second_escrow;
 SELECT * INTO x FROM public.reserve_job_exit(payer,job,'terminate','The appointment cannot proceed','exit-multi');
 IF (SELECT count(*) FROM public.escrow_refund_operations WHERE job_exit_id=x.id)<>1 THEN RAISE EXCEPTION 'Historical escrow was refunded again'; END IF;
 SELECT * INTO r FROM public.escrow_refund_operations WHERE job_exit_id=x.id AND escrow_id=e.id;
 PERFORM public.record_escrow_refund_outcome(r.id,'re_active_only','succeeded');
 IF (SELECT status FROM public.jobs WHERE id=job)<>'posted' OR
    (SELECT state FROM public.job_exit_operations WHERE id=x.id)<>'completed' OR
    (SELECT count(*) FROM public.notifications WHERE metadata->>'jobExitId'=x.id::text)<>2 THEN RAISE EXCEPTION 'Current refund and historical escrow did not finalize once'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
