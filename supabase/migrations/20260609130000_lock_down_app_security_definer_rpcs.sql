-- Audit 2026-06-09 (security advisor lint 0028/0029): get_trust_stats() and
-- contractor_postcode_proof_count() are SECURITY DEFINER and were executable
-- by anon + authenticated via /rest/v1/rpc/*. Both have exactly two callers,
-- both server-side via service_role (apps/web/app/api/stats/trust +
-- apps/web/app/api/contractors/[id]); mobile has zero references. Direct
-- client execution would let anyone probe aggregate stats / per-postcode job
-- counts outside the API's privacy gate (the route only surfaces counts >= 2).
--
-- NOT revoked: is_admin / is_job_participant / is_org_member /
-- is_company_admin / has_org_management_access — those are RLS-policy helper
-- functions and policies execute them with the querying user's privileges, so
-- authenticated EXECUTE is required. st_estimatedextent is PostGIS-owned
-- (ecosystem-blocked, same as spatial_ref_sys).
-- Applied live via Supabase MCP 2026-06-09; post-apply
-- has_function_privilege check confirms only service_role retains EXECUTE.
REVOKE EXECUTE ON FUNCTION public.get_trust_stats() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.contractor_postcode_proof_count(uuid, text) FROM anon, authenticated;
