-- 005_retention_policies.sql
-- Purpose: Add purge helpers for old email history and quote interactions.

BEGIN;

CREATE OR REPLACE FUNCTION public.purge_old_email_history(p_days INT DEFAULT 180)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - make_interval(days => p_days);
BEGIN
  IF to_regclass('public.email_history') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.email_history WHERE sent_at < $1' USING cutoff;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_old_quote_interactions(p_days INT DEFAULT 180)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - make_interval(days => p_days);
BEGIN
  IF to_regclass('public.quote_interactions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.quote_interactions WHERE created_at < $1' USING cutoff;
  END IF;
END;
$$;

COMMIT;

-- Set a scheduled job in Supabase to run weekly, e.g.:
-- SELECT cron.schedule('purge_logs_weekly', '0 3 * * 0', $$
--   SELECT public.purge_old_email_history(180);
--   SELECT public.purge_old_quote_interactions(180);
-- $$);
