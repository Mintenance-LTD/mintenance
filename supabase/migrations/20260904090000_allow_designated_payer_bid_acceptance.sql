-- Keep the atomic bid-acceptance authorization rule aligned with the API.
-- Jobs may designate a payer (for example, a landlord or property manager)
-- who is allowed to fund and accept the job even when they are not the
-- homeowner recorded on the job.

CREATE OR REPLACE FUNCTION public.accept_bid_atomic(
  p_bid_id uuid,
  p_job_id uuid,
  p_contractor_id uuid,
  p_homeowner_id uuid
) RETURNS TABLE(
  success boolean,
  error_message text,
  accepted_bid_id uuid,
  job_status character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bid_status varchar(50);
  v_existing_accepted_bid_id uuid;
  v_job_status varchar(50);
  v_job_homeowner_id uuid;
  v_job_payer_user_id uuid;
  v_accepted_bid_id uuid;
BEGIN
  SELECT homeowner_id, payer_user_id, status
  INTO v_job_homeowner_id, v_job_payer_user_id, v_job_status
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF v_job_homeowner_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Job not found'::text, NULL::uuid, NULL::varchar;
    RETURN;
  END IF;

  IF v_job_homeowner_id != p_homeowner_id
     AND (v_job_payer_user_id IS NULL OR v_job_payer_user_id != p_homeowner_id) THEN
    RETURN QUERY SELECT FALSE, 'Not authorized to accept bids for this job'::text, NULL::uuid, NULL::varchar;
    RETURN;
  END IF;

  IF v_job_status IN ('assigned', 'in_progress', 'completed') THEN
    RETURN QUERY SELECT FALSE, 'Job is already assigned or in progress'::text, NULL::uuid, v_job_status;
    RETURN;
  END IF;

  SELECT id
  INTO v_existing_accepted_bid_id
  FROM public.bids
  WHERE job_id = p_job_id
    AND status = 'accepted'
  FOR UPDATE;

  IF v_existing_accepted_bid_id IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'A bid has already been accepted for this job'::text, v_existing_accepted_bid_id, v_job_status;
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
    RETURN QUERY SELECT FALSE, 'Bid not found or does not belong to this job'::text, NULL::uuid, NULL::varchar;
    RETURN;
  END IF;

  IF v_bid_status = 'accepted' THEN
    RETURN QUERY SELECT FALSE, 'Bid has already been accepted'::text, p_bid_id, v_job_status;
    RETURN;
  END IF;

  UPDATE public.bids
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_bid_id
  RETURNING id INTO v_accepted_bid_id;

  UPDATE public.bids
  SET status = 'rejected', updated_at = NOW()
  WHERE job_id = p_job_id
    AND id != p_bid_id
    AND status != 'rejected';

  UPDATE public.jobs
  SET status = 'assigned',
      contractor_id = p_contractor_id,
      assigned_at = COALESCE(assigned_at, NOW()),
      updated_at = NOW()
  WHERE id = p_job_id;

  RETURN QUERY SELECT TRUE, NULL::text, v_accepted_bid_id, 'assigned'::varchar;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_bid_atomic(uuid, uuid, uuid, uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.accept_bid_atomic(uuid, uuid, uuid, uuid) TO service_role;
