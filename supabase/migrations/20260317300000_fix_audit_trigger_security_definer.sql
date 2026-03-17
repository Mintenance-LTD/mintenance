-- Fix audit trigger functions to use SECURITY DEFINER
-- Without this, user-scoped RLS clients (createUserScopedClient) block audit log inserts
-- because the trigger runs as the calling user, not as the function owner.
-- The job_audit_log RLS policy "Block user audit log insertion" has WITH CHECK (false)
-- for authenticated users, so only service_role/function-owner can insert.

ALTER FUNCTION public.audit_job_changes() SECURITY DEFINER;
ALTER FUNCTION public.audit_job_changes() SET search_path = public;

ALTER FUNCTION public.auto_log_job_status_change() SECURITY DEFINER;
ALTER FUNCTION public.auto_log_job_status_change() SET search_path = public;
