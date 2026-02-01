-- =====================================================================
-- VULN-009: Session Timeout Implementation - Phase 1
-- =====================================================================
-- Add session tracking columns to refresh_tokens table
-- This enables absolute session timeout (12 hours) and idle timeout (30 minutes)
--
-- Security Impact:
-- - Prevents indefinite session extension via token refresh
-- - Enables detection of idle sessions for automatic logout
-- - Maintains original login time across token rotations
-- - Supports PCI DSS 8.1.8 (idle timeout) and 8.2.4 (absolute timeout)
--
-- Created: 2026-02-01
-- Related: VULN-009-SESSION-TIMEOUT-IMPLEMENTATION
-- =====================================================================

-- Add session tracking columns to refresh_tokens table
ALTER TABLE public.refresh_tokens
  ADD COLUMN session_started_at TIMESTAMPTZ,
  ADD COLUMN last_activity_at TIMESTAMPTZ;

-- Backfill existing tokens (use created_at as session start)
-- This ensures backward compatibility with existing active sessions
UPDATE public.refresh_tokens
SET
  session_started_at = created_at,
  last_activity_at = created_at
WHERE session_started_at IS NULL;

-- Make columns NOT NULL after backfill
ALTER TABLE public.refresh_tokens
  ALTER COLUMN session_started_at SET NOT NULL,
  ALTER COLUMN last_activity_at SET NOT NULL;

-- Set default values for future inserts (fallback if application doesn't provide)
ALTER TABLE public.refresh_tokens
  ALTER COLUMN session_started_at SET DEFAULT NOW(),
  ALTER COLUMN last_activity_at SET DEFAULT NOW();

-- =====================================================================
-- Indexes for Session Timeout Queries
-- =====================================================================

-- Index for absolute session timeout queries
-- Used by: SessionValidator to find sessions older than 12 hours
CREATE INDEX idx_refresh_tokens_session_age
  ON public.refresh_tokens(session_started_at, user_id)
  WHERE revoked_at IS NULL AND consumed_at IS NULL;

COMMENT ON INDEX idx_refresh_tokens_session_age IS
  'Optimizes queries checking absolute session age (VULN-009). Used to enforce 12-hour session timeout.';

-- Index for idle timeout queries
-- Used by: SessionValidator to find idle sessions (no activity > 30 minutes)
CREATE INDEX idx_refresh_tokens_idle
  ON public.refresh_tokens(last_activity_at, user_id)
  WHERE revoked_at IS NULL AND consumed_at IS NULL;

COMMENT ON INDEX idx_refresh_tokens_idle IS
  'Optimizes queries checking session idle time (VULN-009). Used to enforce 30-minute idle timeout.';

-- =====================================================================
-- Column Comments (Documentation)
-- =====================================================================

COMMENT ON COLUMN public.refresh_tokens.session_started_at IS
  'Timestamp when session was originally created (login). NEVER changes across token rotations. Used for absolute session timeout (12 hours).';

COMMENT ON COLUMN public.refresh_tokens.last_activity_at IS
  'Timestamp of last user activity (API request). Updated on every token refresh. Used for idle session timeout (30 minutes).';

-- =====================================================================
-- Update rotate_refresh_token Function
-- =====================================================================
-- Modify the atomic token rotation function to preserve session metadata

CREATE OR REPLACE FUNCTION rotate_refresh_token(
  p_user_id UUID,
  p_token_hash TEXT
)
RETURNS TABLE (
  user_email TEXT,
  user_role TEXT,
  family_id UUID,
  next_generation INTEGER,
  session_started_at TIMESTAMPTZ,  -- NEW: Return session start time
  last_activity_at TIMESTAMPTZ     -- NEW: Return last activity time
) AS $$
DECLARE
  v_old_token RECORD;
  v_user RECORD;
  v_next_gen INTEGER;
BEGIN
  -- Get old token details with row-level lock (prevents concurrent rotations)
  SELECT rt.*, u.email, u.role
  INTO v_old_token
  FROM refresh_tokens rt
  JOIN users u ON u.id = rt.user_id
  WHERE rt.token_hash = p_token_hash
    AND rt.user_id = p_user_id
    AND rt.revoked_at IS NULL
    AND rt.expires_at > NOW()
  FOR UPDATE;

  -- Return null if token not found or already consumed
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check for token reuse (breach detection)
  IF v_old_token.consumed_at IS NOT NULL THEN
    -- Token already used - potential security breach
    -- Revoke entire token family
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE family_id = v_old_token.family_id
      AND revoked_at IS NULL;

    -- Raise exception to trigger application-level breach detection
    RAISE EXCEPTION 'Token reuse detected - security breach';
  END IF;

  -- Mark old token as consumed
  UPDATE refresh_tokens
  SET consumed_at = NOW()
  WHERE token_hash = p_token_hash;

  -- Calculate next generation
  v_next_gen := COALESCE(v_old_token.generation, 0) + 1;

  -- Return user details and session metadata
  -- Application will create new token with this metadata
  user_email := v_old_token.email;
  user_role := v_old_token.role;
  family_id := v_old_token.family_id;
  next_generation := v_next_gen;
  session_started_at := v_old_token.session_started_at;  -- NEW: Preserve session start
  last_activity_at := v_old_token.last_activity_at;       -- NEW: Return for update

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rotate_refresh_token IS
  'Atomically rotates refresh token with breach detection (VULN-001). Updated for VULN-009 to preserve session metadata across rotations.';

-- =====================================================================
-- Verification Queries (For Testing)
-- =====================================================================

-- Verify migration applied successfully
DO $$
BEGIN
  -- Check columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'refresh_tokens'
      AND column_name = 'session_started_at'
  ) THEN
    RAISE EXCEPTION 'Migration failed: session_started_at column not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'refresh_tokens'
      AND column_name = 'last_activity_at'
  ) THEN
    RAISE EXCEPTION 'Migration failed: last_activity_at column not created';
  END IF;

  -- Check indexes exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'refresh_tokens'
      AND indexname = 'idx_refresh_tokens_session_age'
  ) THEN
    RAISE EXCEPTION 'Migration failed: session_age index not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'refresh_tokens'
      AND indexname = 'idx_refresh_tokens_idle'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idle timeout index not created';
  END IF;

  RAISE NOTICE 'VULN-009 Session Tracking Migration: ✅ SUCCESS';
END $$;
