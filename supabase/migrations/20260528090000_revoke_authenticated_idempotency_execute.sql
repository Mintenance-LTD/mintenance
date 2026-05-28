-- =====================================================================
-- Revoke authenticated EXECUTE on idempotency-claim RPCs, 2026-05-28.
--
-- Follow-up to 20260527170000_lock_down_idempotency_security_definer,
-- which revoked anon EXECUTE but deliberately KEPT authenticated EXECUTE
-- on the assumption these RPCs are "called by authenticated API routes
-- only (via supabase RPC)".
--
-- That assumption is wrong. The only production caller is
-- apps/web/lib/idempotency.ts, and every call there goes through
-- `serverSupabase` (the service-role client from @/lib/api/supabaseServer),
-- never the authenticated client. service_role is unaffected by these
-- grants, so removing authenticated EXECUTE breaks no production path.
--
-- The risk being closed: all three functions are SECURITY DEFINER and
-- accept a caller-supplied p_user_id. With authenticated EXECUTE, any
-- logged-in user can call them directly with another user's id and
-- pre-claim that user's idempotency key, poisoning the cache on financial
-- operations (cross-tenant DoS / response substitution). Locking EXECUTE
-- to service_role means only trusted server code, which derives p_user_id
-- from the verified session, can claim keys.
-- =====================================================================

BEGIN;

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
) IS 'service_role-only. anon revoked 2026-05-27 (audit-P2-10); authenticated revoked 2026-05-28.';

COMMIT;

-- =====================================================================
-- Rollback (manual)
-- =====================================================================
-- BEGIN;
-- GRANT EXECUTE ON FUNCTION public.complete_idempotency_claim(text, text, jsonb, uuid, jsonb) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.release_idempotency_claim(text, text) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.try_claim_idempotency_key(text, text, uuid, jsonb, integer) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.try_claim_idempotency_key(text, text, uuid, jsonb, integer, integer) TO authenticated;
-- COMMIT;
