-- The row update lock and reserve_escrow_transfer's FOR UPDATE share one
-- serialization point. A persisted attempt remains uncertain even without a
-- transfer_id; refunding it requires provider reconciliation first.
CREATE FUNCTION public.guard_refund_transfer_claim()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.status = 'release_pending' AND NEW.release_reason = 'refund_pending'
     AND EXISTS (SELECT 1 FROM public.escrow_transfer_attempts WHERE escrow_id = NEW.id) THEN
    RAISE EXCEPTION 'A payout attempt exists; reconcile it before refunding'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_refund_transfer_claim() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_refund_transfer_claim
BEFORE UPDATE OF status, release_reason ON public.escrow_transactions
FOR EACH ROW EXECUTE FUNCTION public.guard_refund_transfer_claim();

CREATE OR REPLACE FUNCTION public.reserve_escrow_transfer(p_escrow_id uuid, p_amount integer, p_destination text)
RETURNS SETOF public.escrow_transfer_attempts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE e public.escrow_transactions%ROWTYPE; a public.escrow_transfer_attempts%ROWTYPE;
BEGIN
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR e.status <> 'release_pending' OR e.release_reason = 'refund_pending' THEN
   RAISE EXCEPTION 'Escrow is not claimed for release' USING ERRCODE='23514'; END IF;
 IF p_amount IS NULL OR p_amount <= 0 OR p_amount > round(e.amount*100) OR
    p_destination IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id=e.payee_id AND stripe_connect_account_id=p_destination
    ) THEN RAISE EXCEPTION 'Invalid escrow transfer terms' USING ERRCODE='23514'; END IF;
 SELECT * INTO a FROM public.escrow_transfer_attempts WHERE escrow_id=p_escrow_id;
 IF FOUND THEN
   IF (a.stripe_parameters->>'amount')::integer <> p_amount OR
      a.stripe_parameters->>'destination' IS DISTINCT FROM p_destination THEN
     RAISE EXCEPTION 'Escrow transfer terms changed; reconciliation required' USING ERRCODE='23514'; END IF;
   RETURN NEXT a; RETURN;
 END IF;
 INSERT INTO public.escrow_transfer_attempts(escrow_id,idempotency_key,stripe_parameters)
 VALUES (p_escrow_id,'escrow_release_'||p_escrow_id::text,jsonb_build_object(
   'amount',p_amount,'currency','gbp','destination',p_destination,
   'description','Escrow release '||p_escrow_id::text,
   'metadata',jsonb_build_object('escrowTransactionId',p_escrow_id::text,
     'jobId',e.job_id::text,'contractorId',e.payee_id::text,'payerId',e.payer_id::text)
 )) RETURNING * INTO a;
 RETURN NEXT a;
END $$;
REVOKE ALL ON FUNCTION public.reserve_escrow_transfer(uuid,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_escrow_transfer(uuid,integer,text) TO service_role;
