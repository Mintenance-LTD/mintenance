-- Serialize accumulated payouts with refund and direct-transfer claims.
CREATE OR REPLACE FUNCTION public.credit_payout_balance(
  p_contractor_id uuid,
  p_amount_minor bigint,
  p_currency text,
  p_job_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_currency text := upper(trim(p_currency));
  v_event_id uuid;
  j public.jobs;
  e public.escrow_transactions;
  prior public.contractor_payout_credit_events;
  b public.escrow_refund_balances;
BEGIN
  IF p_contractor_id IS NULL OR p_job_id IS NULL THEN
    RAISE EXCEPTION 'contractor_id and job_id are required';
  END IF;
  IF p_amount_minor IS NULL OR p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'amount_minor must be positive';
  END IF;
  IF v_currency IS NULL OR v_currency = '' OR length(v_currency) <> 3 THEN
    RAISE EXCEPTION 'currency must be a three-letter code';
  END IF;

  -- Match refund reservation lock order. A stale release worker cannot credit
  -- funds after a refund claim, and a refund cannot consume credited earnings.
  SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR j.contractor_id IS DISTINCT FROM p_contractor_id OR v_currency <> 'GBP' THEN
    RAISE EXCEPTION 'Payout recipient or currency does not match job' USING ERRCODE='23514';
  END IF;
  SELECT * INTO prior FROM public.contractor_payout_credit_events WHERE job_id=p_job_id;
  IF FOUND THEN
    IF prior.contractor_id IS DISTINCT FROM p_contractor_id OR
       prior.currency IS DISTINCT FROM v_currency OR prior.amount_minor IS DISTINCT FROM p_amount_minor THEN
      RAISE EXCEPTION 'Payout retry terms changed' USING ERRCODE='23514';
    END IF;
    RETURN;
  END IF;
  SELECT * INTO e FROM public.escrow_transactions
    WHERE job_id=p_job_id AND status IN ('pending','held','release_pending') FOR UPDATE;
  IF NOT FOUND OR e.status <> 'release_pending' OR e.release_reason='refund_pending' OR
     e.payee_id IS DISTINCT FROM p_contractor_id OR
     EXISTS(SELECT FROM public.escrow_transfer_attempts WHERE escrow_id=e.id) THEN
    RAISE EXCEPTION 'Escrow cannot be credited to payout balance' USING ERRCODE='23514';
  END IF;
  SELECT * INTO b FROM public.escrow_refund_balances WHERE escrow_id=e.id;
  IF p_amount_minor > coalesce(b.remaining_minor,round(e.amount*100)::bigint) OR
     coalesce(b.needs_review,false) OR
     EXISTS(SELECT FROM public.escrow_refund_operations WHERE escrow_id=e.id AND
       state IN ('reserved','pending','requires_action','reconciliation_required')) THEN
    RAISE EXCEPTION 'Refund balance does not permit payout credit' USING ERRCODE='23514';
  END IF;

  -- The unique job key makes retries and overlapping release workers
  -- idempotent. Only the worker that inserts the event mutates the balance.
  INSERT INTO public.contractor_payout_credit_events (
    contractor_id, job_id, currency, amount_minor
  )
  VALUES (p_contractor_id, p_job_id, v_currency, p_amount_minor)
  ON CONFLICT (job_id) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.contractor_payout_balances (
    contractor_id, currency, pending_amount_minor
  )
  VALUES (p_contractor_id, v_currency, p_amount_minor)
  ON CONFLICT (contractor_id, currency)
  DO UPDATE SET
    pending_amount_minor = contractor_payout_balances.pending_amount_minor
      + EXCLUDED.pending_amount_minor,
    updated_at = now();
END;
$function$;

REVOKE ALL ON FUNCTION public.credit_payout_balance(uuid, bigint, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_payout_balance(uuid, bigint, text, uuid)
  TO service_role;


CREATE OR REPLACE FUNCTION public.guard_refund_balance_transfer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE b public.escrow_refund_balances;
BEGIN
 IF EXISTS(SELECT FROM public.contractor_payout_credit_events c
   JOIN public.escrow_transactions e ON e.job_id=c.job_id WHERE e.id=NEW.escrow_id) THEN
  RAISE EXCEPTION 'Escrow already credited to accumulated payout' USING ERRCODE='23514'; END IF;
 SELECT * INTO b FROM public.escrow_refund_balances WHERE escrow_id=NEW.escrow_id;
 IF FOUND AND (b.needs_review OR (NEW.stripe_parameters->>'amount')::integer>b.remaining_minor OR
   EXISTS(SELECT FROM public.escrow_refund_operations WHERE escrow_id=NEW.escrow_id AND
     state IN('reserved','pending','requires_action','reconciliation_required'))) THEN
  RAISE EXCEPTION 'Refund balance does not permit this payout' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_refund_balance_transfer() FROM PUBLIC,anon,authenticated;

-- Protect legacy route claims as well as ledger reservations.
CREATE OR REPLACE FUNCTION public.guard_refund_transfer_claim()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.status = 'release_pending' AND NEW.release_reason = 'refund_pending'
     AND (EXISTS (SELECT 1 FROM public.escrow_transfer_attempts WHERE escrow_id = NEW.id)
       OR EXISTS (SELECT 1 FROM public.contractor_payout_credit_events WHERE job_id = NEW.job_id)) THEN
    RAISE EXCEPTION 'A payout attempt exists; reconcile it before refunding'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_refund_transfer_claim() FROM PUBLIC, anon, authenticated;
