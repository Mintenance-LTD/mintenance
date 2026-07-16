-- TO-public RLS policies on ~20 tables call is_admin()/is_org_member()/has_org_management_access(),
-- but the function-lockdown migration left anon without EXECUTE on them, so anon queries on those
-- tables raise "permission denied for function" instead of returning zero rows (e.g. bids,
-- escrow_transactions, properties, organizations — pre-existing; plus the policies consolidated on
-- 2026-07-16). All four are boolean membership checks anchored on auth.uid() (NULL for anon => false).
-- Probing via /rpc is already available to any self-registered authenticated user, so this grants
-- anon nothing it could not already obtain with a free signup.
-- is_job_participant / is_company_admin stay anon-revoked (no TO-public policy references them).
-- Applied live via Supabase MCP on 2026-07-16 (version 20260716204544).
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_org_management_access(uuid, uuid) TO anon;
