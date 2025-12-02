-- Multi-Factor Authentication (MFA) Support
-- This migration adds complete MFA support including TOTP, SMS, and backup codes

-- ============================================================================
-- 1. Add MFA columns to users table
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_method TEXT CHECK (mfa_method IN ('totp', 'sms', 'email', NULL)),
ADD COLUMN IF NOT EXISTS totp_secret TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN users.mfa_enabled IS 'Whether MFA is enabled for this user';
COMMENT ON COLUMN users.mfa_method IS 'MFA method: totp, sms, or email';
COMMENT ON COLUMN users.totp_secret IS 'Encrypted TOTP secret (use app-level encryption)';
COMMENT ON COLUMN users.phone_number IS 'Phone number for SMS MFA';
COMMENT ON COLUMN users.mfa_enrolled_at IS 'Timestamp when MFA was enrolled';

-- Add index for MFA-enabled users
CREATE INDEX IF NOT EXISTS idx_users_mfa_enabled ON users(mfa_enabled) WHERE mfa_enabled = TRUE;

-- ============================================================================
-- 2. Create mfa_backup_codes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS mfa_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user_id ON mfa_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_used_at ON mfa_backup_codes(used_at);

-- Add comments
COMMENT ON TABLE mfa_backup_codes IS 'Stores backup codes for MFA recovery';
COMMENT ON COLUMN mfa_backup_codes.code_hash IS 'Bcrypt hash of backup code';
COMMENT ON COLUMN mfa_backup_codes.used_at IS 'Timestamp when code was used (NULL if unused)';

-- ============================================================================
-- 3. Create mfa_verification_attempts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS mfa_verification_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method TEXT NOT NULL CHECK (method IN ('totp', 'sms', 'email', 'backup_code')),
    success BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address INET,
    user_agent TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_mfa_verification_attempts_user_id ON mfa_verification_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_verification_attempts_attempted_at ON mfa_verification_attempts(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_verification_attempts_success ON mfa_verification_attempts(user_id, success, attempted_at DESC);

-- Add comments
COMMENT ON TABLE mfa_verification_attempts IS 'Audit log for MFA verification attempts';
COMMENT ON COLUMN mfa_verification_attempts.method IS 'MFA method used for verification';
COMMENT ON COLUMN mfa_verification_attempts.success IS 'Whether verification was successful';

-- ============================================================================
-- 4. Create mfa_pending_verifications table
-- ============================================================================

CREATE TABLE IF NOT EXISTS mfa_pending_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('sms', 'email')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_mfa_pending_verifications_user_id ON mfa_pending_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_pending_verifications_expires_at ON mfa_pending_verifications(expires_at);

-- Add comments
COMMENT ON TABLE mfa_pending_verifications IS 'Temporary storage for pending MFA verifications (SMS/email codes)';
COMMENT ON COLUMN mfa_pending_verifications.code_hash IS 'Bcrypt hash of verification code';
COMMENT ON COLUMN mfa_pending_verifications.expires_at IS 'Expiration timestamp for verification code';

-- ============================================================================
-- 5. Create pre_mfa_sessions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS pre_mfa_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pre_mfa_sessions_user_id ON pre_mfa_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pre_mfa_sessions_session_token ON pre_mfa_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_pre_mfa_sessions_expires_at ON pre_mfa_sessions(expires_at);

-- Add comments
COMMENT ON TABLE pre_mfa_sessions IS 'Temporary sessions created after password verification but before MFA';
COMMENT ON COLUMN pre_mfa_sessions.session_token IS 'Unique token for pre-MFA session';
COMMENT ON COLUMN pre_mfa_sessions.expires_at IS 'Session expiration (typically 5-10 minutes)';

-- ============================================================================
-- 6. Create trusted_devices table (optional "Remember this device" feature)
-- ============================================================================

CREATE TABLE IF NOT EXISTS trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL UNIQUE,
    device_name TEXT,
    device_fingerprint TEXT,
    ip_address INET,
    user_agent TEXT,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_device_token ON trusted_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_expires_at ON trusted_devices(expires_at);

-- Add comments
COMMENT ON TABLE trusted_devices IS 'Devices trusted for MFA bypass (30 days)';
COMMENT ON COLUMN trusted_devices.device_token IS 'Unique token stored in device cookie';
COMMENT ON COLUMN trusted_devices.device_fingerprint IS 'Browser/device fingerprint for additional security';
COMMENT ON COLUMN trusted_devices.expires_at IS 'Trust expiration (typically 30 days)';

-- ============================================================================
-- 7. Add RLS (Row Level Security) policies
-- ============================================================================

-- Enable RLS on all MFA tables
ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_pending_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_mfa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;

-- mfa_backup_codes policies
CREATE POLICY "Users can view their own backup codes"
ON mfa_backup_codes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage backup codes"
ON mfa_backup_codes FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- mfa_verification_attempts policies (read-only for users, full access for service)
CREATE POLICY "Users can view their own MFA attempts"
ON mfa_verification_attempts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage MFA attempts"
ON mfa_verification_attempts FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- mfa_pending_verifications policies (service role only)
CREATE POLICY "Service role can manage pending verifications"
ON mfa_pending_verifications FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- pre_mfa_sessions policies (service role only)
CREATE POLICY "Service role can manage pre-MFA sessions"
ON pre_mfa_sessions FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- trusted_devices policies
CREATE POLICY "Users can view their own trusted devices"
ON trusted_devices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trusted devices"
ON trusted_devices FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage trusted devices"
ON trusted_devices FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- 8. Create cleanup function for expired records
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_mfa_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Clean up expired pending verifications
    DELETE FROM mfa_pending_verifications
    WHERE expires_at < NOW();

    -- Clean up expired pre-MFA sessions
    DELETE FROM pre_mfa_sessions
    WHERE expires_at < NOW();

    -- Clean up expired trusted devices
    DELETE FROM trusted_devices
    WHERE expires_at < NOW();

    -- Clean up used backup codes older than 90 days
    DELETE FROM mfa_backup_codes
    WHERE used_at IS NOT NULL AND used_at < NOW() - INTERVAL '90 days';

    -- Clean up old MFA verification attempts (keep 90 days)
    DELETE FROM mfa_verification_attempts
    WHERE attempted_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Add comment
COMMENT ON FUNCTION cleanup_expired_mfa_records IS 'Cleans up expired MFA records (run daily via cron)';

-- ============================================================================
-- 9. Create helper functions for MFA operations
-- ============================================================================

-- Function to record MFA verification attempt
CREATE OR REPLACE FUNCTION record_mfa_verification_attempt(
    p_user_id UUID,
    p_method TEXT,
    p_success BOOLEAN,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attempt_id UUID;
BEGIN
    INSERT INTO mfa_verification_attempts (
        user_id,
        method,
        success,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_method,
        p_success,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO v_attempt_id;

    RETURN v_attempt_id;
END;
$$;

-- Function to check recent failed MFA attempts (rate limiting)
CREATE OR REPLACE FUNCTION check_mfa_rate_limit(
    p_user_id UUID,
    p_window_minutes INTEGER DEFAULT 15,
    p_max_attempts INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_recent_failed_attempts INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_recent_failed_attempts
    FROM mfa_verification_attempts
    WHERE user_id = p_user_id
        AND success = FALSE
        AND attempted_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;

    RETURN v_recent_failed_attempts < p_max_attempts;
END;
$$;

-- Function to get unused backup codes count
CREATE OR REPLACE FUNCTION get_unused_backup_codes_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM mfa_backup_codes
    WHERE user_id = p_user_id
        AND used_at IS NULL;

    RETURN v_count;
END;
$$;

-- Function to disable MFA for a user
CREATE OR REPLACE FUNCTION disable_user_mfa(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update user record
    UPDATE users
    SET mfa_enabled = FALSE,
        mfa_method = NULL,
        totp_secret = NULL,
        mfa_enrolled_at = NULL
    WHERE id = p_user_id;

    -- Delete backup codes
    DELETE FROM mfa_backup_codes
    WHERE user_id = p_user_id;

    -- Delete trusted devices
    DELETE FROM trusted_devices
    WHERE user_id = p_user_id;

    -- Delete pending verifications
    DELETE FROM mfa_pending_verifications
    WHERE user_id = p_user_id;
END;
$$;

-- ============================================================================
-- 10. Add grants for functions
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION record_mfa_verification_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION check_mfa_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION get_unused_backup_codes_count TO authenticated;
GRANT EXECUTE ON FUNCTION disable_user_mfa TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_mfa_records TO authenticated;

-- ============================================================================
-- Migration complete
-- ============================================================================

-- Add migration record
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '20251202000001') THEN
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES ('20251202000001', 'add_mfa_support', NOW());
    END IF;
END $$;
