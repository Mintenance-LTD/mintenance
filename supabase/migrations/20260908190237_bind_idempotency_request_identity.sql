-- Store only a canonical request digest, never raw payment or personal input.
ALTER TABLE public.idempotency_keys ADD COLUMN request_fingerprint text;
CREATE FUNCTION public.try_claim_bound_idempotency_key(
  p_idempotency_key text, p_operation text, p_user_id uuid,
  p_request_fingerprint text, p_stale_after_seconds integer, p_ttl_seconds integer
) RETURNS TABLE(claimed boolean, is_duplicate boolean, is_pending boolean,
  cached_result jsonb, cached_created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_existing public.idempotency_keys%ROWTYPE;
  v_claim record;
BEGIN
  IF p_user_id IS NULL OR p_request_fingerprint IS NULL OR
     p_request_fingerprint !~ '^[a-f0-9]{64}$' OR
     COALESCE(p_stale_after_seconds,0) < 1 OR COALESCE(p_ttl_seconds,0) < 1 THEN
    RAISE EXCEPTION 'Invalid idempotency identity' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(jsonb_build_array(p_operation,p_idempotency_key)::text, 0));
  SELECT * INTO v_existing FROM public.idempotency_keys
    WHERE idempotency_key=p_idempotency_key AND operation=p_operation FOR UPDATE;
  IF FOUND AND (v_existing.user_id IS DISTINCT FROM p_user_id OR
                v_existing.request_fingerprint IS DISTINCT FROM p_request_fingerprint) THEN
    RAISE EXCEPTION 'Idempotency request identity mismatch' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_claim FROM public.try_claim_idempotency_key(
    p_idempotency_key,p_operation,p_user_id,NULL::jsonb,p_stale_after_seconds,p_ttl_seconds);
  IF v_claim.claimed THEN
    UPDATE public.idempotency_keys SET request_fingerprint=p_request_fingerprint
      WHERE idempotency_key=p_idempotency_key AND operation=p_operation;
  END IF;
  RETURN QUERY SELECT v_claim.claimed,v_claim.is_duplicate,v_claim.is_pending,
    v_claim.cached_result,v_claim.cached_created_at;
END $$;
REVOKE ALL ON FUNCTION public.try_claim_bound_idempotency_key(text,text,uuid,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_claim_bound_idempotency_key(text,text,uuid,text,integer,integer) TO service_role;
REVOKE ALL ON FUNCTION public.complete_idempotency_claim(text,text,jsonb,uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_idempotency_claim(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_idempotency_claim(text,text,jsonb,uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_idempotency_claim(text,text) TO service_role;
