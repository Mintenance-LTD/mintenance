-- The 2026-07-16 policy-consolidation backup table was created without RLS,
-- tripping the ERROR-level rls_disabled_in_public advisor. Default-deny it like
-- the other backup tables (postgres/service_role retain access via bypassrls).
-- Applied live via Supabase MCP on 2026-07-16 (version 20260716204743).
ALTER TABLE public.rls_consolidation_backup_20260716 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rls_consolidation_backup_20260716 FROM anon, authenticated;
