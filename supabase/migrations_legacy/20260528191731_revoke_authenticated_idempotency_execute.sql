REVOKE EXECUTE ON FUNCTION public.complete_idempotency_claim(
  p_idempotency_key text,
  p_operation text,
  p_result jsonb,
  p_user_id uuid,
  p_metadata jsonb
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.release_idempotency_claim(
  p_idempotency_key text,
  p_operation text
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.try_claim_idempotency_key(
  p_idempotency_key text,
  p_operation text,
  p_user_id uuid,
  p_metadata jsonb,
  p_stale_after_seconds integer
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.try_claim_idempotency_key(
  p_idempotency_key text,
  p_operation text,
  p_user_id uuid,
  p_metadata jsonb,
  p_stale_after_seconds integer,
  p_ttl_seconds integer
) FROM authenticated;

COMMENT ON FUNCTION public.try_claim_idempotency_key(
  p_idempotency_key text,
  p_operation text,
  p_user_id uuid,
  p_metadata jsonb,
  p_stale_after_seconds integer
) IS 'service_role-only. anon revoked 2026-05-27 (audit-P2-10); authenticated revoked 2026-05-28 — accepts arbitrary p_user_id and the sole caller (web idempotency.ts) uses the service-role client, so authenticated EXECUTE was an unused cross-tenant cache-poisoning vector.';

COMMENT ON FUNCTION public.complete_idempotency_claim(
  p_idempotency_key text,
  p_operation text,
  p_result jsonb,
  p_user_id uuid,
  p_metadata jsonb
) IS 'service_role-only. anon revoked 2026-05-27 (audit-P2-10); authenticated revoked 2026-05-28.';

COMMENT ON FUNCTION public.release_idempotency_claim(
  p_idempotency_key text,
  p_operation text
) IS 'service_role-only. anon revoked 2026-05-27 (audit-P2-10); authenticated revoked 2026-05-28.';;
