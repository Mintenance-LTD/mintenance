-- S5 (audit): revoke anon EXECUTE on SECURITY DEFINER functions that NO public
-- RLS policy evaluates, closing the unauthenticated /rest/v1/rpc surface without
-- breaking row-level security.
--
-- Applied via Supabase MCP on project ukrjudtlvapiajkjbcrd on 2026-07-16.
--
-- Scope rationale (verified against pg_policy before applying):
--   * is_job_participant  — 0 RLS policies reference it  -> safe to revoke anon
--   * is_company_admin    — 1 policy, authenticated-scoped -> safe to revoke anon
-- Deliberately NOT revoked (public RLS policies evaluate them; revoking anon
-- would break RLS for anon-reachable rows):
--   * is_admin, is_org_member, has_org_management_access
-- NOTE: st_estimatedextent (the only anon-flagged item) is a PostGIS
-- extension function granted to PUBLIC, not anon — a plain REVOKE FROM anon
-- does not close it, and REVOKE FROM PUBLIC risks spatial query planning.
-- That one is deferred to the PostGIS schema move (audit S6, maintenance window).
REVOKE EXECUTE ON FUNCTION public.is_job_participant(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_company_admin(uuid, uuid) FROM anon;
