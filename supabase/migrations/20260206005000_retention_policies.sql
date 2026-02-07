-- Migration: Retention policies (from root migrations)
-- Date: 2026-02-06

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
