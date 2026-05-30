-- =====================================================================
-- Lock down SECURITY DEFINER idempotency RPCs (audit-P2-10), 2026-05-27.
--
-- Supabase advisor flagged 14 SECURITY DEFINER functions executable by
-- anon and/or authenticated roles. We categorised them:
--
--   * is_admin / is_admin(uuid) / is_company_admin / is_job_participant
--     / is_org_member / has_org_management_access — these are textbook
--     RLS helper functions called from policy expressions. They MUST
--     run as SECURITY DEFINER to cross the RLS boundary and compute a
--     boolean. authenticated EXECUTE is intentional; anon EXECUTE is
--     already absent. No change.
--
--   * st_estimatedextent (postgis) — vendored extension, owned by
--     postgres. Can't safely re-grant; ecosystem-managed.
--
--   * contractor_postcode_proof_count + get_trust_stats — used by
--     public-facing trust pages (/trust). Anon EXECUTE is intentional
--     and the result set is privacy-neutral. No change.
--
--   * complete_idempotency_claim / release_idempotency_claim /
--     try_claim_idempotency_key (2 overloads) — these are called by
--     authenticated API routes only (via supabase RPC). Anon should
--     never call them: an anon caller could claim arbitrary
--     idempotency keys on behalf of any user_id they pass in,
--     poisoning the cache for that user's real requests. Revoke anon
--     EXECUTE; authenticated EXECUTE stays.
-- =====================================================================

BEGIN;

REVOKE EXECUTE ON FUNCTION public.complete_idempotency_claim(
  p_idempotency_key text,
  p_operation text,
  p_result jsonb,
  p_user_id uuid,
  p_metadata jsonb
) FROM anon, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.release_idempotency_claim(
  p_idempotency_key text,
  p_operation text
) FROM anon, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.try_claim_idempotency_key(
  p_idempotency_key text,
  p_operation text,
  p_user_id uuid,
  p_metadata jsonb,
  p_stale_after_seconds integer
) FROM anon, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.try_claim_idempotency_key(
  p_idempotency_key text,
  p_operation text,
  p_user_id uuid,
  p_metadata jsonb,
  p_stale_after_seconds integer,
  p_ttl_seconds integer
) FROM anon, PUBLIC;

COMMENT ON FUNCTION public.try_claim_idempotency_key(
  p_idempotency_key text,
  p_operation text,
  p_user_id uuid,
  p_metadata jsonb,
  p_stale_after_seconds integer
) IS 'Authenticated-only. Anon access revoked 2026-05-27 audit-P2-10 because the function accepts an arbitrary p_user_id and would let anon poison the idempotency cache for any real user.';

COMMENT ON FUNCTION public.complete_idempotency_claim(
  p_idempotency_key text,
  p_operation text,
  p_result jsonb,
  p_user_id uuid,
  p_metadata jsonb
) IS 'Authenticated-only. Anon access revoked 2026-05-27 audit-P2-10.';

COMMENT ON FUNCTION public.release_idempotency_claim(
  p_idempotency_key text,
  p_operation text
) IS 'Authenticated-only. Anon access revoked 2026-05-27 audit-P2-10.';

COMMIT;

-- =====================================================================
-- Rollback (manual)
-- =====================================================================
-- BEGIN;
-- GRANT EXECUTE ON FUNCTION public.complete_idempotency_claim(text, text, jsonb, uuid, jsonb) TO anon;
-- GRANT EXECUTE ON FUNCTION public.release_idempotency_claim(text, text) TO anon;
-- GRANT EXECUTE ON FUNCTION public.try_claim_idempotency_key(text, text, uuid, jsonb, integer) TO anon;
-- GRANT EXECUTE ON FUNCTION public.try_claim_idempotency_key(text, text, uuid, jsonb, integer, integer) TO anon;
-- COMMIT;
