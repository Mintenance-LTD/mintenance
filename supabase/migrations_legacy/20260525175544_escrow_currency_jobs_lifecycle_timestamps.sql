
BEGIN;

ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'gbp';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'escrow_transactions_currency_gbp_check'
  ) THEN
    ALTER TABLE public.escrow_transactions
      ADD CONSTRAINT escrow_transactions_currency_gbp_check
      CHECK (currency = 'gbp');
  END IF;
END$$;

COMMENT ON COLUMN public.escrow_transactions.currency IS
  'Always ''gbp'' — UK-only platform. Stored on the row so reporting and Stripe-side reconciliation do not need to read PaymentIntent metadata.';

UPDATE public.escrow_transactions
SET status = 'failed',
    release_blocked_reason = COALESCE(release_blocked_reason, '')
      || '; archived 2026-05-27: legacy test row (pi_test_simulated) parked to allow uniqueness migration',
    updated_at = now()
WHERE payment_intent_id = 'pi_test_simulated'
  AND status IN ('pending', 'held', 'release_pending');

CREATE UNIQUE INDEX IF NOT EXISTS uq_escrow_active_per_job
  ON public.escrow_transactions (job_id)
  WHERE status IN ('pending', 'held', 'release_pending');

COMMENT ON INDEX public.uq_escrow_active_per_job IS
  'Prevents multiple in-flight escrow rows for the same job. Refunded / failed / disputed rows can coexist with a new pending row so payment retries work.';

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

COMMENT ON COLUMN public.jobs.assigned_at IS
  'Stamped by accept_bid_atomic when the winning bid is accepted. Drives time-to-assign analytics and the contractor SLA window. Nullable to remain backwards compatible with pre-2026-05-27 rows.';

COMMENT ON COLUMN public.jobs.started_at IS
  'Stamped by POST /api/jobs/:id/start when before-photos are confirmed and the contractor begins work. Drives time-to-completion and on-site-duration analytics. Nullable for legacy rows.';

CREATE OR REPLACE FUNCTION public.accept_bid_atomic(
  p_bid_id uuid,
  p_job_id uuid,
  p_contractor_id uuid,
  p_homeowner_id uuid
)
RETURNS TABLE(success boolean, error_message text, accepted_bid_id uuid, job_status character varying)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bid_status VARCHAR(50);
  v_existing_accepted_bid_id UUID;
  v_job_status VARCHAR(50);
  v_job_homeowner_id UUID;
  v_accepted_bid_id UUID;
BEGIN
  SELECT homeowner_id, status
  INTO v_job_homeowner_id, v_job_status
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF v_job_homeowner_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Job not found'::TEXT, NULL::UUID, NULL::VARCHAR;
    RETURN;
  END IF;

  IF v_job_homeowner_id != p_homeowner_id THEN
    RETURN QUERY SELECT FALSE, 'Not authorized to accept bids for this job'::TEXT, NULL::UUID, NULL::VARCHAR;
    RETURN;
  END IF;

  IF v_job_status = 'assigned' OR v_job_status = 'in_progress' OR v_job_status = 'completed' THEN
    RETURN QUERY SELECT FALSE, 'Job is already assigned or in progress'::TEXT, NULL::UUID, v_job_status;
    RETURN;
  END IF;

  SELECT id
  INTO v_existing_accepted_bid_id
  FROM public.bids
  WHERE job_id = p_job_id
    AND status = 'accepted'
  FOR UPDATE;

  IF v_existing_accepted_bid_id IS NOT NULL THEN
    RETURN QUERY SELECT
      FALSE,
      'A bid has already been accepted for this job'::TEXT,
      v_existing_accepted_bid_id,
      v_job_status;
    RETURN;
  END IF;

  SELECT status
  INTO v_bid_status
  FROM public.bids
  WHERE id = p_bid_id
    AND job_id = p_job_id
    AND contractor_id = p_contractor_id
  FOR UPDATE;

  IF v_bid_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Bid not found or does not belong to this job'::TEXT, NULL::UUID, NULL::VARCHAR;
    RETURN;
  END IF;

  IF v_bid_status = 'accepted' THEN
    RETURN QUERY SELECT FALSE, 'Bid has already been accepted'::TEXT, p_bid_id, v_job_status;
    RETURN;
  END IF;

  UPDATE public.bids
  SET
    status = 'accepted',
    updated_at = NOW()
  WHERE id = p_bid_id
  RETURNING id INTO v_accepted_bid_id;

  UPDATE public.bids
  SET
    status = 'rejected',
    updated_at = NOW()
  WHERE job_id = p_job_id
    AND id != p_bid_id
    AND status != 'rejected';

  UPDATE public.jobs
  SET
    status = 'assigned',
    contractor_id = p_contractor_id,
    assigned_at = COALESCE(assigned_at, NOW()),
    updated_at = NOW()
  WHERE id = p_job_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_accepted_bid_id, 'assigned'::VARCHAR;
END;
$function$;

UPDATE public.jobs
SET assigned_at = updated_at
WHERE assigned_at IS NULL
  AND status IN ('assigned', 'in_progress', 'completed');

COMMIT;
;
