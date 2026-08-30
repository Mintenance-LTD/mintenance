CREATE OR REPLACE FUNCTION public.try_claim_idempotency_key(
  p_idempotency_key      TEXT,
  p_operation            TEXT,
  p_user_id              UUID DEFAULT NULL,
  p_metadata             JSONB DEFAULT NULL,
  p_stale_after_seconds  INT  DEFAULT 60,
  p_ttl_seconds          INT  DEFAULT 86400
)
RETURNS TABLE(
  claimed             BOOLEAN,
  is_duplicate        BOOLEAN,
  is_pending          BOOLEAN,
  cached_result       JSONB,
  cached_created_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_new_id       UUID;
  v_existing     public.idempotency_keys%ROWTYPE;
  v_stale_cutoff TIMESTAMPTZ;
  v_ttl_cutoff   TIMESTAMPTZ;
BEGIN
  v_ttl_cutoff := NOW() - make_interval(secs => p_ttl_seconds);
  DELETE FROM public.idempotency_keys
   WHERE idempotency_key = p_idempotency_key
     AND operation       = p_operation
     AND status          = 'completed'
     AND created_at      < v_ttl_cutoff;

  INSERT INTO public.idempotency_keys (
    idempotency_key, operation, result, user_id, metadata, status, claimed_at
  )
  VALUES (
    p_idempotency_key, p_operation, '{}'::jsonb, p_user_id, p_metadata, 'pending', NOW()
  )
  ON CONFLICT (idempotency_key, operation) DO NOTHING
  RETURNING id INTO v_new_id;

  IF v_new_id IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, FALSE, FALSE, NULL::jsonb, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT * INTO v_existing
  FROM public.idempotency_keys
  WHERE idempotency_key = p_idempotency_key AND operation = p_operation;

  IF v_existing.status = 'completed' THEN
    RETURN QUERY SELECT FALSE, TRUE, FALSE, v_existing.result, v_existing.created_at;
    RETURN;
  END IF;

  v_stale_cutoff := NOW() - make_interval(secs => p_stale_after_seconds);

  IF v_existing.claimed_at IS NULL OR v_existing.claimed_at < v_stale_cutoff THEN
    UPDATE public.idempotency_keys
       SET claimed_at = NOW(),
           result     = '{}'::jsonb,
           metadata   = COALESCE(p_metadata, metadata),
           user_id    = COALESCE(p_user_id, user_id)
     WHERE id = v_existing.id
       AND (claimed_at IS NULL OR claimed_at < v_stale_cutoff);
    IF FOUND THEN
      RETURN QUERY SELECT TRUE, FALSE, FALSE, NULL::jsonb, NULL::timestamptz;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT FALSE, FALSE, TRUE, NULL::jsonb, v_existing.created_at;
END;
$function$;
;
