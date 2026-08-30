
BEGIN;

REVOKE EXECUTE ON FUNCTION public.complete_idempotency_claim(
  p_idempotency_key text, p_operation text, p_result jsonb, p_user_id uuid, p_metadata jsonb
) FROM anon, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.release_idempotency_claim(
  p_idempotency_key text, p_operation text
) FROM anon, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.try_claim_idempotency_key(
  p_idempotency_key text, p_operation text, p_user_id uuid, p_metadata jsonb, p_stale_after_seconds integer
) FROM anon, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.try_claim_idempotency_key(
  p_idempotency_key text, p_operation text, p_user_id uuid, p_metadata jsonb, p_stale_after_seconds integer, p_ttl_seconds integer
) FROM anon, PUBLIC;

COMMENT ON FUNCTION public.try_claim_idempotency_key(text, text, uuid, jsonb, integer) IS 'Authenticated-only. Anon access revoked 2026-05-27 audit-P2-10 because the function accepts an arbitrary p_user_id and would let anon poison the idempotency cache for any real user.';
COMMENT ON FUNCTION public.complete_idempotency_claim(text, text, jsonb, uuid, jsonb) IS 'Authenticated-only. Anon access revoked 2026-05-27 audit-P2-10.';
COMMENT ON FUNCTION public.release_idempotency_claim(text, text) IS 'Authenticated-only. Anon access revoked 2026-05-27 audit-P2-10.';

COMMIT;
;
