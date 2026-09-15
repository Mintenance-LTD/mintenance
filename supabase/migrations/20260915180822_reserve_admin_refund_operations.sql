-- Keep the payer as financial owner; record the initiating administrator separately.
ALTER TABLE public.escrow_refund_operations ADD COLUMN initiated_by uuid REFERENCES public.profiles(id);

CREATE FUNCTION public.reserve_admin_escrow_refund(p_admin_id uuid,p_job_id uuid,p_escrow_id uuid,
 p_request_key text,p_gross_minor integer,p_reason text)
RETURNS SETOF public.escrow_refund_operations LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE j public.jobs; e public.escrow_transactions; b public.escrow_refund_balances;
 r public.escrow_refund_operations; funding public.payment_funding_reservations;
 p_actor_id uuid; cash integer; credit integer; operation_id uuid:=gen_random_uuid();
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=p_admin_id AND role='admin' AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current administrator required' USING ERRCODE='42501'; END IF;
 -- Preserve job-before-escrow lock order.
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Refund job missing' USING ERRCODE='23514'; END IF;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR e.job_id<>j.id OR e.payer_id IS NULL THEN
  RAISE EXCEPTION 'Escrow does not belong to this payer and job' USING ERRCODE='42501'; END IF;
 p_actor_id:=e.payer_id;
 IF p_request_key IS NULL OR length(p_request_key) NOT BETWEEN 1 AND 255 OR
    p_gross_minor IS NULL OR p_gross_minor<=0 OR p_reason IS NULL THEN
  RAISE EXCEPTION 'Invalid refund request' USING ERRCODE='23514'; END IF;
 SELECT * INTO r FROM public.escrow_refund_operations WHERE request_key=p_request_key;
 IF FOUND THEN
  IF r.initiated_by IS DISTINCT FROM p_admin_id OR r.actor_id<>p_actor_id OR r.escrow_id<>p_escrow_id OR r.gross_minor<>p_gross_minor OR r.reason<>p_reason THEN
   RAISE EXCEPTION 'Refund request identity changed' USING ERRCODE='23514'; END IF;
  RETURN NEXT r; RETURN;
 END IF;
 IF e.status NOT IN('held','pending_review','awaiting_homeowner_approval') OR
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
 INSERT INTO public.escrow_refund_operations(id,escrow_id,actor_id,initiated_by,request_key,gross_minor,cash_minor,
  credit_minor,reason,payment_intent_id,stripe_parameters)
 VALUES(operation_id,e.id,p_actor_id,p_admin_id,p_request_key,p_gross_minor,cash,credit,p_reason,e.payment_intent_id,
  jsonb_build_object('payment_intent',e.payment_intent_id,'amount',cash,'reason','requested_by_customer',
   'metadata',jsonb_build_object('refundOperationId',operation_id::text,'escrowTransactionId',e.id::text,
    'jobId',j.id::text,'requestedBy',p_admin_id::text,'payerId',p_actor_id::text))) RETURNING * INTO r;
 UPDATE public.escrow_transactions SET status='release_pending',release_reason='refund_pending',updated_at=now() WHERE id=e.id;
 RETURN NEXT r;
END $$;

REVOKE ALL ON FUNCTION public.reserve_admin_escrow_refund(uuid,uuid,uuid,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_admin_escrow_refund(uuid,uuid,uuid,text,integer,text) TO service_role;
