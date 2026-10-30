-- Retain every definitively rejected provider key; never retire unknown results.
ALTER TABLE public.escrow_transfer_attempts
  ADD COLUMN provider_attempt_started_at timestamptz,
  ADD COLUMN rejected_attempts jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(rejected_attempts) = 'array');

CREATE FUNCTION public.record_escrow_transfer_balance_rejection(
  p_escrow_id uuid, p_idempotency_key text, p_request_id text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  e public.escrow_transactions%ROWTYPE;
  a public.escrow_transfer_attempts%ROWTYPE;
BEGIN
  IF p_request_id IS NULL OR p_request_id !~ '^req_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Provider rejection reference required' USING ERRCODE='23514';
  END IF;
  -- Match the lock order of reserve_escrow_transfer. Never reopen a hold or
  -- release/refund a balance here; the normal release path rechecks eligibility.
  SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
  IF NOT FOUND OR e.status IS DISTINCT FROM 'release_pending' OR e.release_reason = 'refund_pending'
     OR e.transfer_id IS NOT NULL THEN
    RETURN false;
  END IF;
  SELECT * INTO a FROM public.escrow_transfer_attempts WHERE escrow_id=p_escrow_id FOR UPDATE;
  IF NOT FOUND OR a.transfer_id IS NOT NULL OR a.idempotency_key IS DISTINCT FROM p_idempotency_key THEN
    RETURN false;
  END IF;
  IF coalesce(a.provider_attempt_started_at, a.created_at) < now() - interval '23 hours'
     OR jsonb_array_length(a.rejected_attempts) >= 10 THEN
    RAISE EXCEPTION 'Payment transfer requires reconciliation' USING ERRCODE='23514';
  END IF;
  UPDATE public.escrow_transfer_attempts SET
    rejected_attempts = a.rejected_attempts || jsonb_build_array(jsonb_build_object(
      'idempotency_key', a.idempotency_key, 'request_id', p_request_id,
      'code', 'balance_insufficient', 'rejected_at', now()
    )),
    idempotency_key = 'escrow_release_' || p_escrow_id::text || '_' || gen_random_uuid()::text,
    provider_attempt_started_at = now()
  WHERE escrow_id=p_escrow_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_escrow_transfer_balance_rejection(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_escrow_transfer_balance_rejection(uuid,text,text) TO service_role;
