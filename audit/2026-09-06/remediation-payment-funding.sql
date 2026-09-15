\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('fa060909-0000-4000-8000-000000000201','funding-owner@example.invalid','{}'),
 ('fa060909-0000-4000-8000-000000000202','funding-contractor@example.invalid','{}'),
 ('fa060909-0000-4000-8000-000000000203','funding-unrelated@example.invalid','{}');
UPDATE public.profiles SET role='contractor' WHERE id='fa060909-0000-4000-8000-000000000202';
INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status)
 VALUES('fa060909-0000-4000-8000-000000000210','fa060909-0000-4000-8000-000000000201','fa060909-0000-4000-8000-000000000202','Synthetic audit','Synthetic maintenance description for funding audit','Synthetic','draft');
INSERT INTO public.bids(id,job_id,contractor_id,amount,description,status)
 VALUES('fa060909-0000-4000-8000-000000000220','fa060909-0000-4000-8000-000000000210','fa060909-0000-4000-8000-000000000202',500,'Synthetic accepted bid','accepted');
INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status)
 VALUES('fa060909-0000-4000-8000-000000000230','fa060909-0000-4000-8000-000000000210','fa060909-0000-4000-8000-000000000201','fa060909-0000-4000-8000-000000000202',500,'accepted');
INSERT INTO public.user_credits(user_id,balance_pence)
 VALUES('fa060909-0000-4000-8000-000000000201',5000);
SET LOCAL ROLE service_role;
DO $$
DECLARE r public.payment_funding_reservations; retry public.payment_funding_reservations;
 e public.escrow_transactions; e2 public.escrow_transactions;
 actor uuid:='fa060909-0000-4000-8000-000000000201';
 job uuid:='fa060909-0000-4000-8000-000000000210';
 bid uuid:='fa060909-0000-4000-8000-000000000220';
 contract uuid:='fa060909-0000-4000-8000-000000000230';
BEGIN
 SELECT * INTO r FROM public.reserve_payment_funding(actor,job,bid,contract,'synthetic-funding',50000);
 SELECT * INTO retry FROM public.reserve_payment_funding(actor,job,bid,contract,'synthetic-other-key',50000);
 IF r.id<>retry.id OR r.gross_minor<>50000 OR r.cash_minor<>45000 OR r.credit_minor<>5000 THEN
  RAISE EXCEPTION 'Gross/cash/credit or cross-request reservation invariant failed'; END IF;
 IF (SELECT balance_pence FROM public.user_credits WHERE user_id=actor)<>0 OR
  (SELECT count(*) FROM public.user_credit_ledger WHERE reference_id=r.id AND delta_pence=-5000)<>1 THEN
  RAISE EXCEPTION 'Credit reservation was not deducted exactly once'; END IF;
 BEGIN
  PERFORM public.reserve_payment_funding('fa060909-0000-4000-8000-000000000203',job,bid,contract,'forged-payer',50000);
  RAISE EXCEPTION 'Unrelated payer reserved funding';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.reserve_payment_funding(actor,job,bid,contract,'synthetic-funding',100);
  RAISE EXCEPTION 'Caller changed accepted amount';
 EXCEPTION WHEN check_violation THEN NULL; END;
 SELECT * INTO e FROM public.attach_payment_funding(r.id,'pi_synthetic_funding');
 SELECT * INTO e2 FROM public.attach_payment_funding(r.id,'pi_synthetic_funding');
 IF e.id<>e2.id OR e.amount<>500 OR (e.metadata->>'cash_amount_pence')::int<>45000 THEN
  RAISE EXCEPTION 'Attachment duplicated escrow or discounted contractor principal'; END IF;
 BEGIN
  PERFORM public.attach_payment_funding(r.id,'pi_different');
  RAISE EXCEPTION 'Existing reservation attached to different provider payment';
 EXCEPTION WHEN check_violation THEN NULL; END;
 -- Provider gross amount cannot masquerade as the cash leg of a subsidised payment.
 BEGIN
  PERFORM public.apply_payment_intent_state('pi_synthetic_funding','succeeded',50000,'gbp');
  RAISE EXCEPTION 'Gross principal accepted instead of cash requirement';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  SELECT * INTO e2 FROM public.apply_payment_intent_state('pi_synthetic_funding','succeeded',45000,'gbp');
  IF e2.status<>'held' OR e2.amount<>500 OR (SELECT payment_status FROM public.jobs WHERE id=job)<>'paid' THEN
   RAISE EXCEPTION 'Subsidised webhook did not preserve principal and paid job'; END IF;
  -- Restore pending fixture state through a subtransaction rollback, not a production reset.
  RAISE EXCEPTION 'synthetic rollback after cash verification' USING ERRCODE='ZX002';
 EXCEPTION WHEN SQLSTATE 'ZX002' THEN NULL; END;
 -- Synthetic stand-in for service-side confirmed provider cancellation.
 PERFORM public.cancel_payment_funding(r.id,actor,'pi_synthetic_funding');
 PERFORM public.cancel_payment_funding(r.id,actor,'pi_synthetic_funding');
 IF (SELECT balance_pence FROM public.user_credits WHERE user_id=actor)<>5000 OR
  (SELECT count(*) FROM public.user_credit_ledger WHERE reference_id=r.id AND delta_pence=5000)<>1 OR
  NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id=e.id AND status='cancelled') THEN
  RAISE EXCEPTION 'Cancellation did not restore credit exactly once'; END IF;
 IF EXISTS(SELECT FROM public.apply_payment_intent_state('pi_synthetic_funding','succeeded',45000,'gbp'))
  OR (SELECT payment_status FROM public.jobs WHERE id=job)<>'canceled' THEN
  RAISE EXCEPTION 'Late success revived cancelled credit funding'; END IF;
 BEGIN
  PERFORM public.reserve_payment_funding(actor,job,bid,contract,'synthetic-funding',50000);
  RAISE EXCEPTION 'Cancelled request was revived';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;
CREATE FUNCTION pg_temp.reject_credit_entry() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Synthetic ledger outage' USING ERRCODE='ZX001'; END $$;
CREATE TRIGGER audit_credit_failure BEFORE INSERT ON public.user_credit_ledger
 FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_credit_entry();
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN
  PERFORM public.reserve_payment_funding('fa060909-0000-4000-8000-000000000201','fa060909-0000-4000-8000-000000000210',
   'fa060909-0000-4000-8000-000000000220','fa060909-0000-4000-8000-000000000230','synthetic-failure',50000);
  RAISE EXCEPTION 'Ledger failure injection was not reached';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
 IF (SELECT balance_pence FROM public.user_credits WHERE user_id='fa060909-0000-4000-8000-000000000201')<>5000 OR
  EXISTS(SELECT FROM public.payment_funding_reservations WHERE request_key='synthetic-failure') THEN
  RAISE EXCEPTION 'Ledger failure partially committed a debit/reservation'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.reserve_payment_funding('fa060909-0000-4000-8000-000000000201','fa060909-0000-4000-8000-000000000210',
   'fa060909-0000-4000-8000-000000000220','fa060909-0000-4000-8000-000000000230','forged-service',50000);
  RAISE EXCEPTION 'Client invoked trusted funding RPC';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
