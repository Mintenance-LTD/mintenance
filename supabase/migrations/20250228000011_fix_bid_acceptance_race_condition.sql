-- =====================================================
-- Migration: Fix Bid Acceptance Race Condition
-- Date: 2025-02-28
-- Purpose: Prevent multiple bids from being accepted for the same job
-- =====================================================

-- ============================================================================
-- 1. UNIQUE PARTIAL INDEX
-- ============================================================================
-- Prevents multiple accepted bids per job at the database level
-- This is the first line of defense against race conditions
CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_one_accepted_per_job 
ON bids(job_id) 
WHERE status = 'accepted';

COMMENT ON INDEX idx_bids_one_accepted_per_job IS 
'Ensures only one bid can be accepted per job, preventing race conditions at the database level';

-- ============================================================================
-- 2. ATOMIC BID ACCEPTANCE FUNCTION
-- ============================================================================
-- This function performs all operations atomically with row-level locking
-- to prevent race conditions when multiple requests try to accept bids simultaneously
CREATE OR REPLACE FUNCTION public.accept_bid_atomic(
  p_bid_id UUID,
  p_job_id UUID,
  p_contractor_id UUID,
  p_homeowner_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT,
  accepted_bid_id UUID,
  job_status VARCHAR(50)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid_status VARCHAR(50);
  v_existing_accepted_bid_id UUID;
  v_job_status VARCHAR(50);
  v_job_homeowner_id UUID;
  v_accepted_bid_id UUID;
BEGIN
  -- Lock the job row to prevent concurrent modifications
  -- This ensures only one transaction can process bid acceptance for this job at a time
  SELECT homeowner_id, status
  INTO v_job_homeowner_id, v_job_status
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE;

  -- Verify job exists
  IF v_job_homeowner_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Job not found'::TEXT, NULL::UUID, NULL::VARCHAR;
    RETURN;
  END IF;

  -- Verify homeowner owns the job
  IF v_job_homeowner_id != p_homeowner_id THEN
    RETURN QUERY SELECT FALSE, 'Not authorized to accept bids for this job'::TEXT, NULL::UUID, NULL::VARCHAR;
    RETURN;
  END IF;

  -- Check if job is already assigned (prevent accepting bids for assigned jobs)
  IF v_job_status = 'assigned' OR v_job_status = 'in_progress' OR v_job_status = 'completed' THEN
    RETURN QUERY SELECT FALSE, 'Job is already assigned or in progress'::TEXT, NULL::UUID, v_job_status;
    RETURN;
  END IF;

  -- Check if job already has an accepted bid (with lock to prevent race condition)
  SELECT id
  INTO v_existing_accepted_bid_id
  FROM public.bids
  WHERE job_id = p_job_id
    AND status = 'accepted'
  FOR UPDATE;

  -- If a bid is already accepted, return error
  IF v_existing_accepted_bid_id IS NOT NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      'A bid has already been accepted for this job'::TEXT, 
      v_existing_accepted_bid_id, 
      v_job_status;
    RETURN;
  END IF;

  -- Verify the target bid exists and belongs to this job
  SELECT status
  INTO v_bid_status
  FROM public.bids
  WHERE id = p_bid_id
    AND job_id = p_job_id
    AND contractor_id = p_contractor_id
  FOR UPDATE;

  -- Verify bid exists
  IF v_bid_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Bid not found or does not belong to this job'::TEXT, NULL::UUID, NULL::VARCHAR;
    RETURN;
  END IF;

  -- Verify bid is not already accepted
  IF v_bid_status = 'accepted' THEN
    RETURN QUERY SELECT FALSE, 'Bid has already been accepted'::TEXT, p_bid_id, v_job_status;
    RETURN;
  END IF;

  -- All checks passed - perform atomic operations
  -- 1. Accept the target bid
  UPDATE public.bids
  SET 
    status = 'accepted',
    updated_at = NOW()
  WHERE id = p_bid_id
  RETURNING id INTO v_accepted_bid_id;

  -- 2. Reject all other bids for this job
  UPDATE public.bids
  SET 
    status = 'rejected',
    updated_at = NOW()
  WHERE job_id = p_job_id
    AND id != p_bid_id
    AND status != 'rejected';

  -- 3. Update job status to assigned and set contractor
  UPDATE public.jobs
  SET 
    status = 'assigned',
    contractor_id = p_contractor_id,
    updated_at = NOW()
  WHERE id = p_job_id;

  -- Return success
  RETURN QUERY SELECT TRUE, NULL::TEXT, v_accepted_bid_id, 'assigned'::VARCHAR;
END;
$$;

-- Grant execute permission to authenticated users
REVOKE ALL ON FUNCTION public.accept_bid_atomic(UUID, UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_bid_atomic(UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_bid_atomic(UUID, UUID, UUID, UUID) TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION public.accept_bid_atomic(UUID, UUID, UUID, UUID) IS
'Atomically accepts a bid with row-level locking to prevent race conditions. Accepts the target bid, rejects all other bids for the job, and updates job status to assigned. Returns success status and error message if operation fails.';

