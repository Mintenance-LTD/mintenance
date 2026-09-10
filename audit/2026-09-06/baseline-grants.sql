\set ON_ERROR_STOP on
BEGIN;
-- A new object under the same Supabase default privileges as baseline tables.
CREATE TABLE public.audit_readiness_grant_probe(id uuid, role text);
ALTER TABLE public.audit_readiness_grant_probe ENABLE ROW LEVEL SECURITY;
-- Match baseline profiles grant shape: adding limited grants does not revoke.
GRANT REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.audit_readiness_grant_probe TO authenticated;
GRANT SELECT(role) ON public.audit_readiness_grant_probe TO authenticated;
SELECT has_column_privilege('authenticated','public.audit_readiness_grant_probe','role','UPDATE') AS baseline_still_allows_role_update;
CREATE FUNCTION public.audit_readiness_function_probe() RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
-- Match baseline SECURITY DEFINER grant shape.
REVOKE ALL ON FUNCTION public.audit_readiness_function_probe() FROM PUBLIC;
GRANT ALL ON FUNCTION public.audit_readiness_function_probe() TO service_role;
SELECT has_function_privilege('anon','public.audit_readiness_function_probe()','EXECUTE') AS baseline_still_allows_anon_execute;
ROLLBACK;
