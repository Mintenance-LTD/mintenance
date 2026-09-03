-- Keep credit balance changes and their audit entries atomic. The payment
-- workflow can retry concurrently, so read-then-write mutations are unsafe.

CREATE OR REPLACE FUNCTION public.spend_user_credit(
  p_user_id uuid,
  p_requested_pence integer,
  p_reason text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debit integer;
BEGIN
  IF p_requested_pence IS NULL OR p_requested_pence <= 0 THEN
    RETURN 0;
  END IF;

  SELECT LEAST(balance_pence, p_requested_pence)
    INTO v_debit
    FROM public.user_credits
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF v_debit IS NULL OR v_debit <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.user_credits
     SET balance_pence = balance_pence - v_debit,
         updated_at = now()
   WHERE user_id = p_user_id;

  INSERT INTO public.user_credit_ledger
    (user_id, delta_pence, reason, reference_id)
  VALUES
    (p_user_id, -v_debit, p_reason, p_reference_id);

  RETURN v_debit;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_user_credit(
  p_user_id uuid,
  p_amount_pence integer,
  p_reference_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF p_amount_pence IS NULL OR p_amount_pence <= 0 THEN
    RETURN TRUE;
  END IF;

  UPDATE public.user_credits
     SET balance_pence = balance_pence + p_amount_pence,
         updated_at = now()
   WHERE user_id = p_user_id
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.user_credit_ledger
    (user_id, delta_pence, reason, reference_id)
  VALUES
    (p_user_id, p_amount_pence, 'escrow_payment_rollback', p_reference_id);

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.spend_user_credit(uuid, integer, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_user_credit(uuid, integer, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_user_credit(uuid, integer, text, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_user_credit(uuid, integer, uuid)
  TO service_role;
