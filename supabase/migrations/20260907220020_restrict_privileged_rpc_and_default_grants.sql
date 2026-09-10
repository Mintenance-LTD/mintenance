-- RLS does not protect SECURITY DEFINER RPCs. Revoking PUBLIC alone leaves
-- direct grants inherited from Supabase's historical default ACL in place.
REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_bid_atomic(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.try_claim_idempotency_key(text, text, uuid, jsonb, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.try_claim_idempotency_key(text, text, uuid, jsonb, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_contractor_contribution_stats(uuid, integer, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_contractor_contribution_milestone(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_bid_atomic(uuid, uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.try_claim_idempotency_key(text, text, uuid, jsonb, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.try_claim_idempotency_key(text, text, uuid, jsonb, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_contractor_contribution_stats(uuid, integer, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_contractor_contribution_milestone(uuid) TO service_role;

-- New API surfaces require explicit grants. PUBLIC's built-in function grant
-- is global: a schema-only revoke cannot remove it.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
