-- =====================================================================
-- Schema tightening, 2026-05-27.
--
-- audit-P1-1: escrow_transactions had no currency column. The platform
-- is GBP-only (see scripts/ci/check-edge-fn-currency.js + the live
-- Stripe API version pin), but downstream reporting + Stripe disputes
-- couldn't tell from the row alone. Adding NOT NULL DEFAULT 'gbp' +
-- CHECK enforces it forward; existing rows pick up the default.
--
-- audit-P1-2: the existing unique index
--   idx_escrow_unique_job_payment_intent (job_id, payment_intent_id)
--   WHERE payment_intent_id IS NOT NULL
-- allowed duplicate active escrow rows per job as long as the PI ids
-- differed (live job ea8f9654 has one held + one pending row for the
-- same job, one with the legacy 'pi_test_simulated' PI and one with a
-- real Stripe PI). That's a real data-integrity gap — exactly one
-- escrow should be active per job lifecycle. Cleans the legacy test
-- row to 'failed' first, then adds a partial unique index on job_id
-- restricted to the active-statuses set so refunded / failed rows
-- don't block a retry.
--
-- audit-P1-6: jobs table only had created_at / updated_at /
-- completed_at / completion_confirmed_at — no record of when the
-- assigned and in_progress transitions happened, so SLA / duration /
-- analytics queries had no truth source. Adding assigned_at and
-- started_at, both nullable, and updating accept_bid_atomic so future
-- accepts stamp it. The /api/jobs/[id]/start route is patched
-- separately in the same commit to set started_at.
-- =====================================================================

BEGIN;

-- ----- P1-1: escrow currency -----------------------------------------

ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'gbp';

-- Block any future drift to a non-GBP currency. UK-only platform; the
-- check fires if anything tries to write usd / eur / etc.
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

-- ----- P1-2: one active escrow per job -------------------------------

-- Park the legacy test row (live id eaa3d60f-...) so the partial
-- unique index can be created without blocking. Using
-- payment_intent_id rather than the row id keeps this self-healing if
-- the same data lands on a future environment.
UPDATE public.escrow_transactions
SET status = 'failed',
    release_blocked_reason = COALESCE(release_blocked_reason, '')
      || '; archived 2026-05-27: legacy test row (pi_test_simulated) parked to allow uniqueness migration',
    updated_at = now()
WHERE payment_intent_id = 'pi_test_simulated'
  AND status IN ('pending', 'held', 'release_pending');

-- One active escrow per job. Other statuses don't take up the slot,
-- so a refunded / failed attempt can sit alongside a new pending one.
CREATE UNIQUE INDEX IF NOT EXISTS uq_escrow_active_per_job
  ON public.escrow_transactions (job_id)
  WHERE status IN ('pending', 'held', 'release_pending');

COMMENT ON INDEX public.uq_escrow_active_per_job IS
  'Prevents multiple in-flight escrow rows for the same job. Refunded / failed / disputed rows can coexist with a new pending row so payment retries work.';

-- ----- P1-6: jobs lifecycle timestamps -------------------------------

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

COMMENT ON COLUMN public.jobs.assigned_at IS
  'Stamped by accept_bid_atomic when the winning bid is accepted. Drives time-to-assign analytics and the contractor SLA window. Nullable to remain backwards compatible with pre-2026-05-27 rows.';

COMMENT ON COLUMN public.jobs.started_at IS
  'Stamped by POST /api/jobs/:id/start when before-photos are confirmed and the contractor begins work. Drives time-to-completion and on-site-duration analytics. Nullable for legacy rows.';

-- accept_bid_atomic update: same body, plus assigned_at = NOW() on the
-- final jobs UPDATE. The rest of the function is unchanged.
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

  -- 2026-05-27 audit-P1-6: stamp assigned_at on the same row as
  -- contractor_id + status flip, so the lifecycle audit always has it.
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

-- Backfill assigned_at for existing rows where the job is already past
-- the posted state. Best-effort: use updated_at as the proxy stamp
-- since we have no historical assignment event. Skip rows where it's
-- already set (which is everything written post-migration).
UPDATE public.jobs
SET assigned_at = updated_at
WHERE assigned_at IS NULL
  AND status IN ('assigned', 'in_progress', 'completed');

-- started_at intentionally NOT backfilled. Live has 0 in_progress
-- jobs (see audit-P0-3 — Start Job CTA was unreachable on a return
-- visit), so any future started_at writes are clean from this point.

COMMIT;

-- =====================================================================
-- Rollback (manual)
-- =====================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS public.uq_escrow_active_per_job;
-- ALTER TABLE public.escrow_transactions DROP CONSTRAINT IF EXISTS escrow_transactions_currency_gbp_check;
-- ALTER TABLE public.escrow_transactions DROP COLUMN IF EXISTS currency;
-- ALTER TABLE public.jobs
--   DROP COLUMN IF EXISTS assigned_at,
--   DROP COLUMN IF EXISTS started_at;
-- COMMIT;
