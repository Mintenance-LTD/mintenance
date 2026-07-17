-- The 2026-07-16 permissive-policy restructuring merged is_company_admin() into the
-- TO-public SELECT policy on company_team_members. Postgres checks function ACLs at
-- expression init (not evaluation), so the role-guarded CASE does not shield anon from
-- the EXECUTE check and anon reads errored. Same rationale as the earlier helper grants:
-- boolean membership check, probe surface already open to any free signup.
-- Applied live via Supabase MCP on 2026-07-16 (version 20260716220600).
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid, uuid) TO anon;
