-- Refresh Token Security Migration
-- Addresses: VULN-001 (CVSS 8.1) - Incomplete Refresh Token Implementation
-- Implements: Token rotation, breach detection, and automatic cleanup
--
-- Security Features:
-- 1. Token Family Tracking: All tokens from same login session share a family_id
-- 2. Generation Counter: Tracks token rotation count for breach detection
-- 3. Breach Detection: If consumed token is reused, entire family is invalidated
-- 4. Automatic Cleanup: Expired tokens are automatically purged
-- 5. Comprehensive Audit Trail: Track token lifecycle events

-- Drop existing table if it exists (from old migrations)
DROP TABLE IF EXISTS public.refresh_tokens CASCADE;

-- Create refresh_tokens table with comprehensive security features
CREATE TABLE public.refresh_tokens (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Token hash (SHA-256) - NEVER store plain tokens
  -- Use: crypto.createHash('sha256').update(token).digest('hex')
  token_hash TEXT NOT NULL UNIQUE,

  -- User reference (links to profiles which links to auth.users)
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Token Family Tracking for Breach Detection
  -- All tokens from same login session share family_id
  -- If ANY consumed token is reused, invalidate ENTIRE family
  family_id UUID NOT NULL,

  -- Generation counter (increments on each rotation)
  -- Used to detect concurrent token use (potential attack)
  generation INTEGER NOT NULL DEFAULT 0,

  -- Token lifecycle tracking
  consumed_at TIMESTAMPTZ DEFAULT NULL,
  revoked_at TIMESTAMPTZ DEFAULT NULL,
  revoked_reason TEXT DEFAULT NULL,

  -- Token expiration (recommended: 7 days)
  expires_at TIMESTAMPTZ NOT NULL,

  -- Audit timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Additional security context
  device_info JSONB DEFAULT NULL,
  ip_address INET DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,

  -- Constraints
  CONSTRAINT valid_lifecycle CHECK (
    -- Token cannot be both consumed and revoked
    (consumed_at IS NULL OR revoked_at IS NULL)
  ),
  CONSTRAINT valid_expiration CHECK (
    expires_at > created_at
  )
);

-- Performance Indexes
CREATE INDEX idx_refresh_tokens_hash ON public.refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_family ON public.refresh_tokens(family_id);
CREATE INDEX idx_refresh_tokens_expires ON public.refresh_tokens(expires_at)
  WHERE revoked_at IS NULL AND consumed_at IS NULL; -- Partial index for active tokens

-- Index for breach detection queries
CREATE INDEX idx_refresh_tokens_consumed ON public.refresh_tokens(family_id, consumed_at)
  WHERE consumed_at IS NOT NULL;

-- Index for cleanup operations
CREATE INDEX idx_refresh_tokens_cleanup ON public.refresh_tokens(expires_at, revoked_at)
  WHERE expires_at < NOW();

-- Enable Row Level Security
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own refresh tokens
CREATE POLICY refresh_tokens_select_own ON public.refresh_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policy: Service role can view all tokens (for admin/debugging)
CREATE POLICY refresh_tokens_select_service ON public.refresh_tokens
  FOR SELECT
  TO service_role
  USING (true);

-- RLS Policy: Only service role can insert tokens (backend-only operation)
CREATE POLICY refresh_tokens_insert_service ON public.refresh_tokens
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- RLS Policy: Only service role can update tokens (rotation/revocation)
CREATE POLICY refresh_tokens_update_service ON public.refresh_tokens
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Users can delete their own tokens (logout)
CREATE POLICY refresh_tokens_delete_own ON public.refresh_tokens
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policy: Service role can delete any token
CREATE POLICY refresh_tokens_delete_service ON public.refresh_tokens
  FOR DELETE
  TO service_role
  USING (true);

-- Function: Cleanup expired refresh tokens
-- Called by: Cron job or manual trigger
-- Removes tokens that have expired more than 1 day ago
CREATE OR REPLACE FUNCTION public.cleanup_expired_refresh_tokens()
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  -- Delete expired tokens older than 1 day (grace period)
  DELETE FROM public.refresh_tokens
  WHERE expires_at < NOW() - INTERVAL '1 day';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.cleanup_expired_refresh_tokens() IS
  'Automatically deletes expired refresh tokens older than 1 day. Returns count of deleted tokens.';

-- Function: Revoke all tokens for a user
-- Called by: Logout all devices, password change, security breach
CREATE OR REPLACE FUNCTION public.revoke_user_tokens(
  p_user_id UUID,
  p_reason TEXT DEFAULT 'User requested revocation'
)
RETURNS TABLE(revoked_count BIGINT) AS $$
DECLARE
  v_revoked_count BIGINT;
BEGIN
  -- Revoke all active tokens for user
  UPDATE public.refresh_tokens
  SET
    revoked_at = NOW(),
    revoked_reason = p_reason,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND revoked_at IS NULL
    AND consumed_at IS NULL
    AND expires_at > NOW();

  GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

  RETURN QUERY SELECT v_revoked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.revoke_user_tokens(UUID, TEXT) IS
  'Revokes all active refresh tokens for a specific user. Returns count of revoked tokens.';

-- Function: Revoke entire token family (breach detection)
-- Called by: When a consumed token is reused (indicates token theft)
CREATE OR REPLACE FUNCTION public.revoke_token_family(
  p_family_id UUID,
  p_reason TEXT DEFAULT 'Token reuse detected - possible breach'
)
RETURNS TABLE(revoked_count BIGINT) AS $$
DECLARE
  v_revoked_count BIGINT;
BEGIN
  -- Revoke all tokens in the family
  UPDATE public.refresh_tokens
  SET
    revoked_at = NOW(),
    revoked_reason = p_reason,
    updated_at = NOW()
  WHERE family_id = p_family_id
    AND revoked_at IS NULL
    AND expires_at > NOW();

  GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

  -- Log security event (optional - requires audit log table)
  -- INSERT INTO security_audit_log (event_type, details, created_at)
  -- VALUES ('token_family_revoked', jsonb_build_object('family_id', p_family_id, 'reason', p_reason), NOW());

  RETURN QUERY SELECT v_revoked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.revoke_token_family(UUID, TEXT) IS
  'Revokes entire token family when breach is detected (consumed token reused). Returns count of revoked tokens.';

-- Function: Check if token is valid and not consumed/revoked
-- Called by: Token refresh endpoint before issuing new token
CREATE OR REPLACE FUNCTION public.validate_refresh_token(
  p_token_hash TEXT
)
RETURNS TABLE(
  is_valid BOOLEAN,
  user_id UUID,
  family_id UUID,
  generation INTEGER,
  reason TEXT
) AS $$
DECLARE
  v_token RECORD;
BEGIN
  -- Fetch token details
  SELECT
    rt.id,
    rt.user_id,
    rt.family_id,
    rt.generation,
    rt.consumed_at,
    rt.revoked_at,
    rt.revoked_reason,
    rt.expires_at
  INTO v_token
  FROM public.refresh_tokens rt
  WHERE rt.token_hash = p_token_hash;

  -- Token not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::INTEGER, 'Token not found';
    RETURN;
  END IF;

  -- Token already consumed (BREACH DETECTION TRIGGER)
  IF v_token.consumed_at IS NOT NULL THEN
    -- Revoke entire family
    PERFORM public.revoke_token_family(
      v_token.family_id,
      'Consumed token reused - breach detected'
    );
    RETURN QUERY SELECT false, v_token.user_id, v_token.family_id, v_token.generation,
      'Token already consumed - family revoked';
    RETURN;
  END IF;

  -- Token revoked
  IF v_token.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT false, v_token.user_id, v_token.family_id, v_token.generation,
      'Token revoked: ' || COALESCE(v_token.revoked_reason, 'No reason provided');
    RETURN;
  END IF;

  -- Token expired
  IF v_token.expires_at < NOW() THEN
    RETURN QUERY SELECT false, v_token.user_id, v_token.family_id, v_token.generation,
      'Token expired';
    RETURN;
  END IF;

  -- Token is valid
  RETURN QUERY SELECT true, v_token.user_id, v_token.family_id, v_token.generation,
    'Token valid';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.validate_refresh_token(TEXT) IS
  'Validates refresh token and triggers breach detection if consumed token is reused. Returns validation status and token details.';

-- Function: Mark token as consumed (after successful rotation)
-- Called by: Token refresh endpoint after issuing new token
CREATE OR REPLACE FUNCTION public.consume_refresh_token(
  p_token_hash TEXT
)
RETURNS TABLE(success BOOLEAN) AS $$
BEGIN
  UPDATE public.refresh_tokens
  SET
    consumed_at = NOW(),
    updated_at = NOW()
  WHERE token_hash = p_token_hash
    AND consumed_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > NOW();

  IF FOUND THEN
    RETURN QUERY SELECT true;
  ELSE
    RETURN QUERY SELECT false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.consume_refresh_token(TEXT) IS
  'Marks refresh token as consumed after successful rotation. Returns success status.';

-- Trigger: Update updated_at on modification
CREATE OR REPLACE FUNCTION public.update_refresh_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_tokens_update_timestamp
  BEFORE UPDATE ON public.refresh_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_refresh_token_timestamp();

-- Add helpful comments
COMMENT ON TABLE public.refresh_tokens IS
  'Secure refresh token storage with token rotation and breach detection. Never store plain tokens - only SHA-256 hashes.';

COMMENT ON COLUMN public.refresh_tokens.token_hash IS
  'SHA-256 hash of the actual refresh token. Never store plain tokens.';

COMMENT ON COLUMN public.refresh_tokens.family_id IS
  'Token family ID for breach detection. All tokens from same login session share family_id. If consumed token is reused, entire family is revoked.';

COMMENT ON COLUMN public.refresh_tokens.generation IS
  'Token rotation counter. Increments each time token is rotated. Used for detecting concurrent token use.';

COMMENT ON COLUMN public.refresh_tokens.consumed_at IS
  'Timestamp when token was consumed (rotated). If consumed token is reused, triggers breach detection.';

COMMENT ON COLUMN public.refresh_tokens.revoked_at IS
  'Timestamp when token was revoked (logout, password change, security breach).';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refresh_tokens TO service_role;
GRANT SELECT, DELETE ON public.refresh_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_refresh_tokens() TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_user_tokens(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_token_family(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_refresh_token(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_refresh_token(TEXT) TO service_role;

-- Usage Example (for documentation):
--
-- 1. Create new token family on login:
--    INSERT INTO refresh_tokens (user_id, token_hash, family_id, generation, expires_at)
--    VALUES (user_id, hash, gen_random_uuid(), 0, NOW() + INTERVAL '7 days');
--
-- 2. Validate token before refresh:
--    SELECT * FROM validate_refresh_token('token_hash_here');
--
-- 3. Rotate token (if valid):
--    a. Mark old token as consumed: SELECT consume_refresh_token('old_token_hash');
--    b. Create new token with same family_id, generation + 1
--
-- 4. Detect breach:
--    If validate_refresh_token returns is_valid=false and reason contains 'consumed',
--    entire family has been automatically revoked
--
-- 5. Logout user:
--    SELECT revoke_user_tokens(user_id, 'User logout');
--
-- 6. Cleanup expired tokens:
--    SELECT cleanup_expired_refresh_tokens(); -- Run via cron job
