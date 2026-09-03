-- Keep the escrow state and canonical dispute record in one transaction.
-- This function is called only by the server-role client after the API has
-- authenticated the caller; it repeats participant checks at the lock point
-- to close the read-then-write race in the route.

CREATE OR REPLACE FUNCTION public.create_dispute_atomic(
  p_escrow_id uuid,
  p_raised_by uuid,
  p_against uuid,
  p_reason text,
  p_description text
)
RETURNS TABLE (dispute_id uuid, job_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_job_id uuid;
  v_payer_id uuid;
  v_payee_id uuid;
  v_status text;
  v_dispute_id uuid;
BEGIN
  SELECT e.job_id, e.payer_id, e.payee_id, e.status
    INTO v_job_id, v_payer_id, v_payee_id, v_status
  FROM public.escrow_transactions AS e
  WHERE e.id = p_escrow_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'escrow transaction not found';
  END IF;
  IF p_raised_by IS NULL OR (p_raised_by <> v_payer_id AND p_raised_by <> v_payee_id) THEN
    RAISE EXCEPTION 'caller is not a participant in this escrow';
  END IF;
  IF p_against IS NULL OR p_against = p_raised_by
     OR (p_against <> v_payer_id AND p_against <> v_payee_id) THEN
    RAISE EXCEPTION 'invalid dispute participant';
  END IF;
  IF v_status IN ('disputed', 'refunded', 'completed') THEN
    RAISE EXCEPTION 'escrow is not eligible for a new dispute';
  END IF;

  UPDATE public.escrow_transactions
  SET status = 'disputed', updated_at = now()
  WHERE id = p_escrow_id;

  INSERT INTO public.disputes (
    job_id, raised_by, against, reason, description, status
  )
  VALUES (v_job_id, p_raised_by, p_against, p_reason, p_description, 'open')
  RETURNING id INTO v_dispute_id;

  RETURN QUERY SELECT v_dispute_id, v_job_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_dispute_atomic(uuid, uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_dispute_atomic(uuid, uuid, uuid, text, text)
  TO service_role;
