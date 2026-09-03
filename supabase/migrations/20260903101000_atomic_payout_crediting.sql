-- Credit accumulated contractor earnings atomically and once per job.
-- The payout balance is a financial ledger boundary: do not fall back to
-- application-side read-then-write arithmetic.

CREATE TABLE IF NOT EXISTS public.contractor_payout_credit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
  currency text NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contractor_payout_credit_events_job_id_key UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS idx_payout_credit_events_contractor
  ON public.contractor_payout_credit_events (contractor_id, created_at DESC);

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

REVOKE ALL ON TABLE public.contractor_payout_credit_events
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.contractor_payout_credit_events TO service_role;
