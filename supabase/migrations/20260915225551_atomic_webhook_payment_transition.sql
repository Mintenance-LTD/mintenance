-- Match the implemented dispute lifecycle; keep escrow cancellation spelled cancelled.
ALTER TABLE public.escrow_transactions DROP CONSTRAINT escrow_transactions_status_check;
ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_transactions_status_check CHECK
 (status IN('pending','held','released','release_pending','refunded','awaiting_homeowner_approval','pending_review','failed','cancelled','completed','disputed'));
ALTER TABLE public.jobs DROP CONSTRAINT jobs_payment_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_payment_status_check CHECK
 (payment_status IN('pending','paid','refunded','failed','canceled','disputed'));

-- Internal webhook persistence: serialize with refund/release/job-exit operations.
CREATE OR REPLACE FUNCTION public.apply_payment_intent_state(
 p_intent_id text, p_outcome text, p_cash_minor integer DEFAULT NULL, p_currency text DEFAULT NULL
) RETURNS SETOF public.escrow_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.escrow_transactions; j public.jobs; funding public.payment_funding_reservations;
 initial_job uuid; expected_cash integer; next_status text;
BEGIN
 IF p_outcome IS NULL OR p_outcome NOT IN('succeeded','failed','canceled') THEN
  RAISE EXCEPTION 'Invalid payment outcome' USING ERRCODE='23514'; END IF;
 SELECT job_id INTO initial_job FROM public.escrow_transactions WHERE payment_intent_id=p_intent_id;
 IF NOT FOUND THEN RETURN; END IF;
 SELECT * INTO j FROM public.jobs WHERE id=initial_job FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Payment job missing' USING ERRCODE='23514'; END IF;
 SELECT * INTO e FROM public.escrow_transactions WHERE payment_intent_id=p_intent_id FOR UPDATE;
 IF NOT FOUND OR e.job_id IS DISTINCT FROM j.id THEN
  RAISE EXCEPTION 'Payment assignment changed' USING ERRCODE='23514'; END IF;
 -- Post-funding review/release/refund/dispute states are never reopened by payment events.
 IF (p_outcome='succeeded' AND e.status NOT IN('pending','failed','canceled','cancelled','held'))
  OR (p_outcome<>'succeeded' AND e.status NOT IN('pending','failed','canceled','cancelled')) THEN RETURN; END IF;
 SELECT * INTO funding FROM public.payment_funding_reservations WHERE escrow_id=e.id;
 IF FOUND THEN
  IF funding.state='cancelled' THEN RETURN; END IF;
  IF funding.state<>'attached' OR funding.payment_intent_id IS DISTINCT FROM p_intent_id
   OR funding.job_id<>j.id OR funding.payer_id<>e.payer_id OR funding.payee_id<>e.payee_id
   OR funding.gross_minor<>round(e.amount*100) THEN
   RAISE EXCEPTION 'Payment funding requires reconciliation' USING ERRCODE='23514'; END IF;
  expected_cash:=funding.cash_minor;
 ELSE
  IF coalesce(e.metadata->>'credit_applied_pence','0')<>'0' THEN
   RAISE EXCEPTION 'Legacy credit payment requires reconciliation' USING ERRCODE='23514'; END IF;
  expected_cash:=round(e.amount*100);
 END IF;
 -- An obsolete intent must not change the job's newer payment attempt.
 IF EXISTS(SELECT FROM public.payment_funding_reservations r WHERE r.job_id=j.id
   AND r.state IN('reserved','attached') AND r.escrow_id IS DISTINCT FROM e.id)
  OR EXISTS(SELECT FROM public.escrow_transactions other WHERE other.job_id=j.id AND other.id<>e.id
   AND (other.created_at,other.id)>(e.created_at,e.id)) THEN RETURN; END IF;
 IF p_outcome='succeeded' AND (p_currency IS DISTINCT FROM 'gbp' OR p_cash_minor IS NULL
  OR p_cash_minor<>expected_cash OR expected_cash<=0) THEN
  RAISE EXCEPTION 'Payment amount or currency mismatch' USING ERRCODE='23514'; END IF;
 next_status:=CASE WHEN p_outcome='succeeded' THEN 'held' WHEN p_outcome='canceled' THEN 'cancelled' ELSE p_outcome END;
 UPDATE public.escrow_transactions SET status=next_status,updated_at=clock_timestamp()
  WHERE id=e.id RETURNING * INTO e;
 UPDATE public.jobs SET payment_status=CASE WHEN p_outcome='succeeded' THEN 'paid' ELSE p_outcome END,
  updated_at=clock_timestamp() WHERE id=j.id;
 RETURN NEXT e;
END $$;
REVOKE ALL ON FUNCTION public.apply_payment_intent_state(text,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_intent_state(text,text,integer,text) TO service_role;


-- Keep funding attachment/cancellation in the same job-first lock order.
CREATE OR REPLACE FUNCTION public.attach_payment_funding(p_reservation_id uuid,p_payment_intent_id text)
RETURNS SETOF public.escrow_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.payment_funding_reservations; e public.escrow_transactions; initial_job uuid;
BEGIN
 SELECT job_id INTO initial_job FROM public.payment_funding_reservations WHERE id=p_reservation_id;
 PERFORM 1 FROM public.jobs WHERE id=initial_job FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Funding job missing' USING ERRCODE='23514'; END IF;
 SELECT * INTO r FROM public.payment_funding_reservations WHERE id=p_reservation_id FOR UPDATE;
 IF r.job_id IS DISTINCT FROM initial_job THEN RAISE EXCEPTION 'Funding job changed' USING ERRCODE='23514'; END IF;
 IF NOT FOUND OR r.state='cancelled' OR p_payment_intent_id IS NULL OR p_payment_intent_id NOT LIKE 'pi_%' THEN
  RAISE EXCEPTION 'Invalid funding attachment' USING ERRCODE='23514'; END IF;
 IF r.payment_intent_id IS NOT NULL AND r.payment_intent_id<>p_payment_intent_id THEN
  RAISE EXCEPTION 'Funding intent changed' USING ERRCODE='23514'; END IF;
 IF r.escrow_id IS NOT NULL THEN
  SELECT * INTO e FROM public.escrow_transactions WHERE id=r.escrow_id;
  RETURN NEXT e; RETURN;
 END IF;
 INSERT INTO public.escrow_transactions(job_id,payer_id,payee_id,amount,status,payment_intent_id,metadata)
 VALUES(r.job_id,r.payer_id,r.payee_id,r.gross_minor/100.0,'pending',p_payment_intent_id,
  jsonb_build_object('bid_id',r.bid_id,'contract_id',r.contract_id,'funding_reservation_id',r.id,
   'credit_applied_pence',r.credit_minor,'cash_amount_pence',r.cash_minor,'source','create-intent'))
 RETURNING * INTO e;
 UPDATE public.payment_funding_reservations SET state='attached',escrow_id=e.id,payment_intent_id=p_payment_intent_id
 WHERE id=r.id;
 RETURN NEXT e;
END $$;


-- Keep funding attachment/cancellation in the same job-first lock order.
CREATE OR REPLACE FUNCTION public.cancel_payment_funding(p_reservation_id uuid,p_actor_id uuid,p_cancelled_intent_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.payment_funding_reservations; e public.escrow_transactions; initial_job uuid;
BEGIN
 SELECT job_id INTO initial_job FROM public.payment_funding_reservations WHERE id=p_reservation_id;
 PERFORM 1 FROM public.jobs WHERE id=initial_job FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Funding job missing' USING ERRCODE='23514'; END IF;
 SELECT * INTO r FROM public.payment_funding_reservations WHERE id=p_reservation_id FOR UPDATE;
 IF r.job_id IS DISTINCT FROM initial_job THEN RAISE EXCEPTION 'Funding job changed' USING ERRCODE='23514'; END IF;
 IF NOT FOUND OR r.payer_id IS DISTINCT FROM p_actor_id THEN
  RAISE EXCEPTION 'Funding cancellation not authorized' USING ERRCODE='42501'; END IF;
 IF p_cancelled_intent_id IS NULL OR p_cancelled_intent_id NOT LIKE 'pi_%' OR
  (r.payment_intent_id IS NOT NULL AND r.payment_intent_id<>p_cancelled_intent_id) THEN
  RAISE EXCEPTION 'Cancelled intent does not match reservation' USING ERRCODE='23514'; END IF;
 IF r.state='cancelled' THEN RETURN true; END IF;
 IF r.escrow_id IS NOT NULL THEN
  SELECT * INTO e FROM public.escrow_transactions WHERE id=r.escrow_id FOR UPDATE;
  IF NOT FOUND OR e.status NOT IN('pending','failed','cancelled') THEN
   RAISE EXCEPTION 'Funded escrow cannot be cancelled here' USING ERRCODE='23514'; END IF;
  UPDATE public.escrow_transactions SET status='cancelled',updated_at=now() WHERE id=e.id;
 END IF;
 IF r.credit_minor>0 AND NOT public.restore_user_credit(r.payer_id,r.credit_minor,r.id) THEN
  RAISE EXCEPTION 'Credit restoration failed' USING ERRCODE='23514'; END IF;
 UPDATE public.payment_funding_reservations SET state='cancelled',cancelled_at=now(),payment_intent_id=p_cancelled_intent_id WHERE id=r.id;
 UPDATE public.jobs SET payment_status='canceled',updated_at=now() WHERE id=r.job_id;
 RETURN true;
END $$;
