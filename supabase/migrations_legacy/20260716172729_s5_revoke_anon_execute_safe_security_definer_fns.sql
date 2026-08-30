-- S5 (audit): revoke anon EXECUTE on SECURITY DEFINER functions that NO public
-- RLS policy evaluates, closing the unauthenticated /rest/v1/rpc vector without
-- breaking row-level security. is_admin / is_org_member / has_org_management_access
-- are deliberately NOT revoked — public RLS policies evaluate them, so anon needs
-- EXECUTE for those policies to run; the advisor warning on those is addressed
-- later by moving the helpers to a non-exposed schema, not by a revoke.
REVOKE EXECUTE ON FUNCTION public.is_job_participant(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_company_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean) FROM anon;;
