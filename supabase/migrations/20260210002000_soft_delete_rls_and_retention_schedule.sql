-- Migration: Soft delete filtering in RLS policies + retention policy scheduling
-- Issue 59: Ensure soft-deleted profiles are excluded from all queries
-- Issue 29: Schedule retention policy functions via pg_cron
-- Date: 2026-02-10

BEGIN;

-- ============================================================
-- ISSUE 59: Soft delete filtering in RLS policies
-- Profiles with deleted_at IS NOT NULL must be invisible to all non-admin queries
-- ============================================================

-- Drop and recreate profiles SELECT policy to exclude soft-deleted rows
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    OR id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Drop and recreate profiles UPDATE policy to prevent updating deleted profiles
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (id = auth.uid() AND deleted_at IS NULL);

-- Service role still has full access (existing policy)
-- No change needed for service_role policies

-- ============================================================
-- ISSUE 29: Schedule retention policy functions
-- Uses pg_cron extension (available on Supabase Pro plans)
-- Gracefully handles case where pg_cron is not available
-- ============================================================

-- Create comprehensive retention cleanup function
CREATE OR REPLACE FUNCTION public.run_retention_cleanup()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1. Purge old email history (>180 days)
  PERFORM public.purge_old_email_history(180);

  -- 2. Purge old quote interactions (>180 days)
  PERFORM public.purge_old_quote_interactions(180);

  -- 3. Clean expired password reset tokens (>24 hours past expiry)
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < NOW() - INTERVAL '24 hours';

  -- 4. Clean old login attempts (>90 days)
  DELETE FROM public.login_attempts
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- 5. Clean old webhook idempotency records (>7 days)
  IF to_regclass('public.webhook_events') IS NOT NULL THEN
    DELETE FROM public.webhook_events
    WHERE created_at < NOW() - INTERVAL '7 days';
  END IF;

  -- 6. Anonymise soft-deleted profiles after 90-day recovery period
  UPDATE public.profiles
  SET
    full_name = 'Deleted User',
    email = 'deleted-' || id || '@deleted.mintenance.app',
    phone = NULL,
    avatar_url = NULL,
    bio = NULL
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '90 days'
    AND full_name != 'Deleted User';

  RAISE NOTICE 'Retention cleanup completed at %', NOW();
END;
$$;

-- Attempt to schedule with pg_cron (Supabase Pro)
-- This will silently fail if pg_cron is not available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Run retention cleanup daily at 03:00 UTC
    PERFORM cron.schedule(
      'retention-cleanup',
      '0 3 * * *',
      'SELECT public.run_retention_cleanup()'
    );

    RAISE NOTICE 'pg_cron scheduled: retention-cleanup at 03:00 UTC daily';
  ELSE
    RAISE NOTICE 'pg_cron not available — use API cron endpoint for retention cleanup';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;

COMMIT;
