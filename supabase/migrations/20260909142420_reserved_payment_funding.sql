CREATE TABLE public.payment_funding_reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key text NOT NULL UNIQUE,
 job_id uuid NOT NULL REFERENCES public.jobs(id),
 bid_id uuid NOT NULL REFERENCES public.bids(id),
 contract_id uuid NOT NULL REFERENCES public.contracts(id),
 payer_id uuid NOT NULL REFERENCES public.profiles(id),
 payee_id uuid NOT NULL REFERENCES public.profiles(id),
 gross_minor integer NOT NULL CHECK(gross_minor>0),
 cash_minor integer NOT NULL CHECK(cash_minor>0),
 credit_minor integer NOT NULL CHECK(credit_minor>=0),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','attached','cancelled')),
 payment_intent_id text UNIQUE,
 escrow_id uuid UNIQUE REFERENCES public.escrow_transactions(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 cancelled_at timestamptz,
 CHECK(gross_minor=cash_minor+credit_minor)
);
CREATE UNIQUE INDEX payment_funding_one_active_job ON public.payment_funding_reservations(job_id)
 WHERE state IN ('reserved','attached');
ALTER TABLE public.payment_funding_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_funding_reservations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.payment_funding_reservations TO service_role;

CREATE FUNCTION public.reserve_payment_funding(p_actor_id uuid,p_job_id uuid,p_bid_id uuid,
 p_contract_id uuid,p_request_key text,p_gross_minor integer)
RETURNS SETOF public.payment_funding_reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE j public.jobs; b public.bids; r public.payment_funding_reservations;
 new_id uuid:=gen_random_uuid(); credit integer;
BEGIN
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND OR p_actor_id IS NULL OR coalesce(j.payer_user_id,j.homeowner_id)<>p_actor_id THEN
  RAISE EXCEPTION 'Payment payer is not authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO b FROM public.bids WHERE id=p_bid_id AND job_id=j.id
  AND contractor_id=j.contractor_id AND status='accepted';
 IF NOT FOUND OR p_gross_minor IS NULL OR p_gross_minor<=0 OR round(b.amount*100)<>p_gross_minor
  OR b.amount*100<>round(b.amount*100) OR NOT EXISTS(
   SELECT FROM public.contracts WHERE id=p_contract_id AND job_id=j.id AND status='accepted') THEN
  RAISE EXCEPTION 'Payment terms do not match accepted records' USING ERRCODE='23514'; END IF;
 IF p_request_key IS NULL OR length(p_request_key)=0 THEN
  RAISE EXCEPTION 'Payment request identity required' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM public.payment_funding_reservations WHERE request_key=p_request_key FOR UPDATE;
 IF NOT FOUND THEN
  SELECT * INTO r FROM public.payment_funding_reservations WHERE job_id=j.id AND state IN('reserved','attached') FOR UPDATE;
 END IF;
 IF FOUND THEN
  IF r.job_id<>j.id OR r.bid_id<>b.id OR r.contract_id<>p_contract_id OR r.payer_id<>p_actor_id
    OR r.payee_id<>j.contractor_id OR r.gross_minor<>p_gross_minor OR r.state='cancelled' THEN
   RAISE EXCEPTION 'Payment reservation changed or was cancelled' USING ERRCODE='23514'; END IF;
  RETURN NEXT r; RETURN;
 END IF;
 IF EXISTS(SELECT FROM public.escrow_transactions WHERE job_id=j.id
  AND status IN('pending','held','release_pending','completed')) THEN
  RAISE EXCEPTION 'Job already has an active escrow' USING ERRCODE='23514'; END IF;
 credit:=public.spend_user_credit(p_actor_id,greatest(0,p_gross_minor-100),'escrow_funding_reservation',new_id);
 INSERT INTO public.payment_funding_reservations(id,request_key,job_id,bid_id,contract_id,payer_id,payee_id,
  gross_minor,cash_minor,credit_minor)
 VALUES(new_id,p_request_key,j.id,b.id,p_contract_id,p_actor_id,j.contractor_id,
  p_gross_minor,p_gross_minor-credit,credit) RETURNING * INTO r;
 RETURN NEXT r;
END $$;

CREATE FUNCTION public.attach_payment_funding(p_reservation_id uuid,p_payment_intent_id text)
RETURNS SETOF public.escrow_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.payment_funding_reservations; e public.escrow_transactions;
BEGIN
 SELECT * INTO r FROM public.payment_funding_reservations WHERE id=p_reservation_id FOR UPDATE;
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

-- The service calls this only after the provider confirms cancellation. An unknown
-- provider outcome retains the reservation for retry/reconciliation, never a new debit.
CREATE FUNCTION public.cancel_payment_funding(p_reservation_id uuid,p_actor_id uuid,p_cancelled_intent_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.payment_funding_reservations; e public.escrow_transactions;
BEGIN
 SELECT * INTO r FROM public.payment_funding_reservations WHERE id=p_reservation_id FOR UPDATE;
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
REVOKE ALL ON FUNCTION public.reserve_payment_funding(uuid,uuid,uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.attach_payment_funding(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cancel_payment_funding(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_payment_funding(uuid,uuid,uuid,uuid,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_payment_funding(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_payment_funding(uuid,uuid,text) TO service_role;
