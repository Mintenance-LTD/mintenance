-- Production readiness: add remaining missing timestamps and PII retention function
-- NOTE: Indexes are created in 20260326100002_fix_rls_and_indexes.sql

-- =========================================================================
-- MISSING TIMESTAMPS (P2)
-- =========================================================================

-- job_photos_metadata: audit trail for photo uploads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_photos_metadata' AND column_name = 'created_at') THEN
    ALTER TABLE public.job_photos_metadata ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- job_views: track when view metadata changes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_views' AND column_name = 'updated_at') THEN
    ALTER TABLE public.job_views ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- escrow_accounts: escrow release conditions can mutate
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'escrow_accounts' AND column_name = 'updated_at') THEN
    ALTER TABLE public.escrow_accounts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- =========================================================================
-- ADDITIONAL INDEX (not in 100002)
-- =========================================================================

-- Password reset token expiry cleanup
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires
  ON public.password_reset_tokens(expires_at);

-- =========================================================================
-- PII RETENTION: Auto-delete old login attempts and security events (P1-13)
-- =========================================================================

-- Function to clean up old PII data (called by cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_pii_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete login attempts older than 30 days
  DELETE FROM public.login_attempts
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- Anonymize IP addresses in security events older than 7 days
  UPDATE public.security_events
  SET ip_address = 'anonymized'
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND ip_address IS NOT NULL
    AND ip_address != 'anonymized';

  -- Delete expired refresh tokens older than 30 days
  DELETE FROM public.refresh_tokens
  WHERE expires_at < NOW() - INTERVAL '30 days';

  -- Delete expired password reset tokens older than 7 days
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION public.cleanup_old_pii_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_pii_data() TO service_role;
