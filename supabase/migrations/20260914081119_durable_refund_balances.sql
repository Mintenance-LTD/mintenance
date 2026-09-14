-- Original funding and cumulative refunds stay separate from each operation.
-- Cash-first refunds never convert promotional credit into provider cash.
CREATE TABLE public.escrow_refund_balances (
 escrow_id uuid PRIMARY KEY REFERENCES public.escrow_transactions(id),
 gross_minor integer NOT NULL CHECK(gross_minor>0),
 cash_minor integer NOT NULL CHECK(cash_minor>0),
 credit_minor integer NOT NULL CHECK(credit_minor>=0),
 cash_refunded_minor integer NOT NULL DEFAULT 0 CHECK(cash_refunded_minor>=0),
 credit_returned_minor integer NOT NULL DEFAULT 0 CHECK(credit_returned_minor>=0),
 needs_review boolean NOT NULL DEFAULT false,
 remaining_minor integer GENERATED ALWAYS AS (gross_minor-cash_refunded_minor-credit_returned_minor) STORED,
 CHECK(gross_minor=cash_minor+credit_minor),
 CHECK(cash_refunded_minor<=cash_minor AND credit_returned_minor<=credit_minor)
);
CREATE TABLE public.escrow_refund_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 escrow_id uuid NOT NULL REFERENCES public.escrow_refund_balances(escrow_id),
 actor_id uuid NOT NULL REFERENCES public.profiles(id),
 request_key text NOT NULL UNIQUE CHECK(length(request_key) BETWEEN 1 AND 255),
 gross_minor integer NOT NULL CHECK(gross_minor>0),
 cash_minor integer NOT NULL CHECK(cash_minor>=0),
 credit_minor integer NOT NULL CHECK(credit_minor>=0),
 reason text NOT NULL,
 payment_intent_id text NOT NULL,
 stripe_parameters jsonb NOT NULL,
 provider_refund_id text UNIQUE,
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN('reserved','pending','requires_action','succeeded','failed','canceled','reconciliation_required')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(gross_minor=cash_minor+credit_minor)
);
CREATE UNIQUE INDEX escrow_refund_one_inflight ON public.escrow_refund_operations(escrow_id)
 WHERE state IN('reserved','pending','requires_action');
ALTER TABLE public.escrow_refund_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_refund_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.escrow_refund_balances,public.escrow_refund_operations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.escrow_refund_balances,public.escrow_refund_operations TO service_role;

CREATE FUNCTION public.reserve_escrow_refund(p_actor_id uuid,p_job_id uuid,p_escrow_id uuid,
 p_request_key text,p_gross_minor integer,p_reason text)
RETURNS SETOF public.escrow_refund_operations LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE j public.jobs; e public.escrow_transactions; b public.escrow_refund_balances;
 r public.escrow_refund_operations; funding public.payment_funding_reservations;
 cash integer; credit integer; operation_id uuid:=gen_random_uuid();
BEGIN
 -- Same job-before-escrow order as rework/sign-off workflows.
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND OR coalesce(j.payer_user_id,j.homeowner_id) IS DISTINCT FROM p_actor_id THEN
  RAISE EXCEPTION 'Refund payer is not authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR e.job_id<>j.id OR e.payer_id IS DISTINCT FROM p_actor_id THEN
  RAISE EXCEPTION 'Escrow does not belong to this payer and job' USING ERRCODE='42501'; END IF;
 IF p_request_key IS NULL OR length(p_request_key) NOT BETWEEN 1 AND 255 OR
    p_gross_minor IS NULL OR p_gross_minor<=0 OR p_reason IS NULL THEN
  RAISE EXCEPTION 'Invalid refund request' USING ERRCODE='23514'; END IF;
 SELECT * INTO r FROM public.escrow_refund_operations WHERE request_key=p_request_key;
 IF FOUND THEN
  IF r.actor_id<>p_actor_id OR r.escrow_id<>p_escrow_id OR r.gross_minor<>p_gross_minor OR r.reason<>p_reason THEN
   RAISE EXCEPTION 'Refund request identity changed' USING ERRCODE='23514'; END IF;
  RETURN NEXT r; RETURN;
 END IF;
 IF e.status<>'held' OR j.status NOT IN('cancelled','disputed','pending','posted') OR
    e.payment_intent_id IS NULL OR EXISTS(SELECT FROM public.escrow_transfer_attempts WHERE escrow_id=e.id) OR
    EXISTS(SELECT FROM public.contractor_payout_credit_events WHERE job_id=j.id) THEN
  RAISE EXCEPTION 'Escrow cannot be claimed for refund' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT FROM public.escrow_refund_operations WHERE escrow_id=e.id AND
  state IN('reserved','pending','requires_action','reconciliation_required')) THEN
  RAISE EXCEPTION 'Another refund requires recovery' USING ERRCODE='23514'; END IF;
 SELECT * INTO b FROM public.escrow_refund_balances WHERE escrow_id=e.id;
 IF NOT FOUND THEN
  SELECT * INTO funding FROM public.payment_funding_reservations WHERE escrow_id=e.id;
  IF FOUND THEN
   IF funding.state<>'attached' OR funding.payer_id<>p_actor_id OR funding.payment_intent_id<>e.payment_intent_id
     OR funding.gross_minor<>round(e.amount*100) THEN
    RAISE EXCEPTION 'Funding requires reconciliation' USING ERRCODE='23514'; END IF;
   cash:=funding.cash_minor; credit:=funding.credit_minor;
  ELSE
   IF coalesce(e.metadata->>'credit_applied_pence','0')<>'0' THEN
    RAISE EXCEPTION 'Legacy credit funding requires reconciliation' USING ERRCODE='23514'; END IF;
   cash:=round(e.amount*100); credit:=0;
  END IF;
  INSERT INTO public.escrow_refund_balances(escrow_id,gross_minor,cash_minor,credit_minor)
   VALUES(e.id,cash+credit,cash,credit) RETURNING * INTO b;
 END IF;
 IF b.needs_review OR p_gross_minor>b.remaining_minor THEN
  RAISE EXCEPTION 'Refund exceeds available balance or requires reconciliation' USING ERRCODE='23514'; END IF;
 cash:=least(p_gross_minor,b.cash_minor-b.cash_refunded_minor);
 credit:=p_gross_minor-cash;
 INSERT INTO public.escrow_refund_operations(id,escrow_id,actor_id,request_key,gross_minor,cash_minor,
  credit_minor,reason,payment_intent_id,stripe_parameters)
 VALUES(operation_id,e.id,p_actor_id,p_request_key,p_gross_minor,cash,credit,p_reason,e.payment_intent_id,
  jsonb_build_object('payment_intent',e.payment_intent_id,'amount',cash,'reason','requested_by_customer',
   'metadata',jsonb_build_object('refundOperationId',operation_id::text,'escrowTransactionId',e.id::text,
    'jobId',j.id::text,'requestedBy',p_actor_id::text))) RETURNING * INTO r;
 UPDATE public.escrow_transactions SET status='release_pending',release_reason='refund_pending',updated_at=now() WHERE id=e.id;
 RETURN NEXT r;
END $$;

-- Called only after the service retrieves the current provider refund. Event
-- payload order is not an authority for moving money back into an available balance.
CREATE FUNCTION public.record_escrow_refund_outcome(p_operation_id uuid,p_refund_id text,p_state text)
RETURNS SETOF public.escrow_refund_operations LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE r public.escrow_refund_operations; e public.escrow_transactions; b public.escrow_refund_balances;
 job_id uuid;
BEGIN
 SELECT et.job_id INTO job_id FROM public.escrow_refund_operations op JOIN public.escrow_transactions et ON et.id=op.escrow_id WHERE op.id=p_operation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Refund operation missing' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM public.jobs WHERE id=job_id FOR UPDATE;
 SELECT et.* INTO e FROM public.escrow_transactions et JOIN public.escrow_refund_operations op ON op.escrow_id=et.id WHERE op.id=p_operation_id FOR UPDATE OF et;
 SELECT * INTO r FROM public.escrow_refund_operations WHERE id=p_operation_id FOR UPDATE;
 SELECT * INTO b FROM public.escrow_refund_balances WHERE escrow_id=e.id FOR UPDATE;
 IF p_state IS NULL OR p_state NOT IN('pending','requires_action','succeeded','failed','canceled') OR
    (r.cash_minor>0 AND (p_refund_id IS NULL OR length(trim(p_refund_id))=0)) OR
    (r.cash_minor=0 AND (p_refund_id IS NOT NULL OR p_state<>'succeeded')) OR
    (r.provider_refund_id IS NOT NULL AND r.provider_refund_id IS DISTINCT FROM p_refund_id) THEN
  RAISE EXCEPTION 'Refund outcome does not match its operation' USING ERRCODE='23514'; END IF;
 IF r.state=p_state THEN RETURN NEXT r; RETURN; END IF;
 IF r.state IN('succeeded','failed','canceled','reconciliation_required') THEN
  -- A late bank return or contradictory result cannot silently restore money
  -- already credited/spent by the user. Freeze the account for reconciliation.
  UPDATE public.escrow_refund_balances SET needs_review=true WHERE escrow_id=e.id;
  UPDATE public.escrow_refund_operations SET state='reconciliation_required',updated_at=now() WHERE id=r.id RETURNING * INTO r;
  RETURN NEXT r; RETURN;
 END IF;
 IF e.status<>'release_pending' OR e.release_reason IS DISTINCT FROM 'refund_pending' THEN
  RAISE EXCEPTION 'Refund escrow claim was lost; reconciliation required' USING ERRCODE='23514'; END IF;
 IF p_state='succeeded' THEN
  IF r.credit_minor>0 AND NOT public.restore_user_credit(r.actor_id,r.credit_minor,r.id) THEN
   RAISE EXCEPTION 'Refund credit restoration failed' USING ERRCODE='23514'; END IF;
  UPDATE public.escrow_refund_balances SET cash_refunded_minor=cash_refunded_minor+r.cash_minor,
   credit_returned_minor=credit_returned_minor+r.credit_minor WHERE escrow_id=e.id RETURNING * INTO b;
  UPDATE public.escrow_transactions SET status=CASE WHEN b.remaining_minor=0 THEN 'refunded' ELSE 'held' END,
   refunded_at=CASE WHEN b.remaining_minor=0 THEN now() ELSE NULL END,release_reason=NULL,updated_at=now() WHERE id=e.id;
  IF b.remaining_minor=0 THEN
   UPDATE public.jobs SET status='cancelled',payment_status='refunded',updated_at=now() WHERE id=e.job_id;
  END IF;
 ELSIF p_state IN('failed','canceled') THEN
  UPDATE public.escrow_transactions SET status='held',release_reason=NULL,updated_at=now() WHERE id=e.id;
 END IF;
 UPDATE public.escrow_refund_operations SET provider_refund_id=p_refund_id,state=p_state,updated_at=now() WHERE id=r.id RETURNING * INTO r;
 RETURN NEXT r;
END $$;
REVOKE ALL ON FUNCTION public.reserve_escrow_refund(uuid,uuid,uuid,text,integer,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.record_escrow_refund_outcome(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_escrow_refund(uuid,uuid,uuid,text,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_escrow_refund_outcome(uuid,text,text) TO service_role;

-- Payout reservations must use the remaining principal, even if a stale worker
-- computed its transfer from the original amount before a partial refund.
CREATE FUNCTION public.guard_refund_balance_transfer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE b public.escrow_refund_balances;
BEGIN
 SELECT * INTO b FROM public.escrow_refund_balances WHERE escrow_id=NEW.escrow_id;
 IF FOUND AND (b.needs_review OR (NEW.stripe_parameters->>'amount')::integer>b.remaining_minor OR
   EXISTS(SELECT FROM public.escrow_refund_operations WHERE escrow_id=NEW.escrow_id AND
     state IN('reserved','pending','requires_action','reconciliation_required'))) THEN
  RAISE EXCEPTION 'Refund balance does not permit this payout' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_refund_balance_transfer() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_refund_balance_transfer BEFORE INSERT ON public.escrow_transfer_attempts
FOR EACH ROW EXECUTE FUNCTION public.guard_refund_balance_transfer();
