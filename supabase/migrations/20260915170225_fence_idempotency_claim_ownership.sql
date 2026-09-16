-- Additive fencing primitives. Application callers must carry the returned token.
ALTER TABLE public.idempotency_keys ADD COLUMN claim_token uuid;
ALTER TABLE public.idempotency_keys ADD COLUMN claim_expires_at timestamptz;

CREATE FUNCTION public.claim_fenced_idempotency(
 p_idempotency_key text, p_operation text, p_user_id uuid,
 p_request_fingerprint text, p_stale_after_seconds integer, p_ttl_seconds integer
) RETURNS TABLE(claimed boolean,is_duplicate boolean,is_pending boolean,
 cached_result jsonb,cached_created_at timestamptz,claim_token uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r record; token uuid;
BEGIN
 -- The bound function holds the transaction lock through this token assignment.
 SELECT * INTO r FROM public.try_claim_bound_idempotency_key(
  p_idempotency_key,p_operation,p_user_id,p_request_fingerprint,p_stale_after_seconds,p_ttl_seconds);
 IF r.claimed THEN
  token := gen_random_uuid();
  UPDATE public.idempotency_keys SET claim_token=token,
   claim_expires_at=clock_timestamp()+make_interval(secs=>p_stale_after_seconds)
   WHERE idempotency_key=p_idempotency_key AND operation=p_operation AND user_id=p_user_id;
 END IF;
 RETURN QUERY SELECT r.claimed,r.is_duplicate,r.is_pending,r.cached_result,r.cached_created_at,token;
END $$;

CREATE FUNCTION public.complete_fenced_idempotency(
 p_idempotency_key text,p_operation text,p_user_id uuid,p_claim_token uuid,
 p_result jsonb,p_metadata jsonb DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE affected integer;
BEGIN
 UPDATE public.idempotency_keys SET status='completed',result=p_result,
  metadata=COALESCE(p_metadata,metadata)
 WHERE idempotency_key=p_idempotency_key AND operation=p_operation
  AND user_id=p_user_id AND claim_token=p_claim_token AND status='pending'
  AND claim_expires_at>clock_timestamp();
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN affected=1;
END $$;

CREATE FUNCTION public.release_fenced_idempotency(
 p_idempotency_key text,p_operation text,p_user_id uuid,p_claim_token uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE affected integer;
BEGIN
 DELETE FROM public.idempotency_keys
 WHERE idempotency_key=p_idempotency_key AND operation=p_operation
  AND user_id=p_user_id AND claim_token=p_claim_token AND status='pending'
  AND claim_expires_at>clock_timestamp();
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN affected=1;
END $$;

REVOKE ALL ON FUNCTION public.claim_fenced_idempotency(text,text,uuid,text,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.complete_fenced_idempotency(text,text,uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.release_fenced_idempotency(text,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_fenced_idempotency(text,text,uuid,text,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_fenced_idempotency(text,text,uuid,uuid,jsonb,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_fenced_idempotency(text,text,uuid,uuid) TO service_role;
