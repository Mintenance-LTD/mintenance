-- ============================================================================
-- Security Events Table
-- Stores rate limit violations, authentication failures, and other security events
-- ============================================================================

-- Create enum for event types
CREATE TYPE security_event_type AS ENUM (
  'rate_limit_exceeded',
  'rate_limit_ddos',
  'auth_failed',
  'auth_mfa_failed',
  'auth_token_reuse',
  'auth_session_hijack',
  'csrf_failed',
  'sql_injection_attempt',
  'xss_attempt',
  'path_traversal_attempt',
  'suspicious_activity',
  'account_lockout',
  'password_reset_abuse',
  'api_abuse',
  'webhook_validation_failed',
  'file_upload_violation',
  'permission_denied',
  'data_breach_attempt'
);

-- Create enum for severity levels
CREATE TYPE security_event_severity AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

-- Create the security_events table
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Event details
  event_type security_event_type NOT NULL,
  severity security_event_severity NOT NULL,
  message TEXT NOT NULL,

  -- Context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  path TEXT,
  method TEXT,

  -- Rate limiting specific
  rate_limit_tier TEXT,
  rate_limit_attempts INTEGER,
  rate_limit_limit INTEGER,

  -- Additional metadata
  metadata JSONB DEFAULT '{}',

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- Indexing
  CONSTRAINT security_events_created_at_check CHECK (created_at <= NOW())
);

-- Create indexes for efficient querying
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX idx_security_events_severity ON public.security_events(severity);
CREATE INDEX idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX idx_security_events_ip_address ON public.security_events(ip_address);
CREATE INDEX idx_security_events_unresolved ON public.security_events(resolved_at) WHERE resolved_at IS NULL;

-- Create composite index for common queries
CREATE INDEX idx_security_events_type_severity_created
  ON public.security_events(event_type, severity, created_at DESC);

-- ============================================================================
-- IP Blacklist Table
-- Stores IPs that should be blocked due to security violations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ip_blacklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL UNIQUE,
  reason TEXT NOT NULL,

  -- Blocking details
  blocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  blocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  is_permanent BOOLEAN DEFAULT FALSE,

  -- Reference to security event
  security_event_id UUID REFERENCES public.security_events(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT ip_blacklist_expiry_check CHECK (
    (is_permanent = TRUE AND expires_at IS NULL) OR
    (is_permanent = FALSE AND expires_at IS NOT NULL) OR
    (is_permanent = FALSE AND expires_at IS NULL)
  )
);

-- Create indexes
CREATE INDEX idx_ip_blacklist_ip_address ON public.ip_blacklist(ip_address);
CREATE INDEX idx_ip_blacklist_active ON public.ip_blacklist(expires_at)
  WHERE expires_at IS NULL OR expires_at > NOW();

-- ============================================================================
-- Rate Limit Overrides Table
-- Allows admins to set custom rate limits for specific users or IPs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Target (either user or IP)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,

  -- Override settings
  path_pattern TEXT NOT NULL, -- e.g., '/api/jobs/*' or 'DEFAULT'
  max_requests INTEGER NOT NULL,
  window_seconds INTEGER NOT NULL,

  -- Metadata
  reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure at least one target is specified
  CONSTRAINT rate_limit_override_target_check CHECK (
    user_id IS NOT NULL OR ip_address IS NOT NULL
  ),

  -- Ensure unique override per target and path
  CONSTRAINT rate_limit_override_unique UNIQUE (user_id, ip_address, path_pattern)
);

-- Create indexes
CREATE INDEX idx_rate_limit_overrides_user_id ON public.rate_limit_overrides(user_id);
CREATE INDEX idx_rate_limit_overrides_ip_address ON public.rate_limit_overrides(ip_address);
CREATE INDEX idx_rate_limit_overrides_active ON public.rate_limit_overrides(expires_at)
  WHERE expires_at IS NULL OR expires_at > NOW();

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type security_event_type,
  p_severity security_event_severity,
  p_message TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_path TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    event_type,
    severity,
    message,
    user_id,
    ip_address,
    path,
    metadata
  ) VALUES (
    p_event_type,
    p_severity,
    p_message,
    p_user_id,
    p_ip_address,
    p_path,
    p_metadata
  ) RETURNING id INTO v_event_id;

  -- Auto-block IP for critical events
  IF p_severity = 'CRITICAL' AND p_ip_address IS NOT NULL THEN
    INSERT INTO public.ip_blacklist (
      ip_address,
      reason,
      security_event_id,
      expires_at
    ) VALUES (
      p_ip_address,
      'Auto-blocked due to critical security event: ' || p_event_type,
      v_event_id,
      NOW() + INTERVAL '24 hours'
    ) ON CONFLICT (ip_address) DO UPDATE
      SET expires_at = GREATEST(ip_blacklist.expires_at, NOW() + INTERVAL '24 hours'),
          updated_at = NOW();
  END IF;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if IP is blacklisted
CREATE OR REPLACE FUNCTION is_ip_blacklisted(p_ip_address INET)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.ip_blacklist
    WHERE ip_address = p_ip_address
      AND (is_permanent = TRUE OR expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old security events (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_security_events()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.security_events
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND resolved_at IS NOT NULL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_overrides ENABLE ROW LEVEL SECURITY;

-- Security events policies (admin only)
CREATE POLICY security_events_admin_all ON public.security_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- IP blacklist policies (admin only)
CREATE POLICY ip_blacklist_admin_all ON public.ip_blacklist
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Rate limit override policies (admin only)
CREATE POLICY rate_limit_overrides_admin_all ON public.rate_limit_overrides
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================================
-- Grants
-- ============================================================================

-- Grant permissions to authenticated users (RLS will restrict to admins)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ip_blacklist TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_overrides TO authenticated;

-- Grant permissions to service role (bypass RLS)
GRANT ALL ON public.security_events TO service_role;
GRANT ALL ON public.ip_blacklist TO service_role;
GRANT ALL ON public.rate_limit_overrides TO service_role;

-- Grant function execution
GRANT EXECUTE ON FUNCTION log_security_event TO service_role;
GRANT EXECUTE ON FUNCTION is_ip_blacklisted TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_security_events TO service_role;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.security_events IS 'Stores all security-related events including rate limit violations, auth failures, and suspicious activities';
COMMENT ON TABLE public.ip_blacklist IS 'IP addresses blocked due to security violations';
COMMENT ON TABLE public.rate_limit_overrides IS 'Custom rate limits for specific users or IPs';
COMMENT ON FUNCTION log_security_event IS 'Logs a security event and optionally blocks the IP for critical events';
COMMENT ON FUNCTION is_ip_blacklisted IS 'Checks if an IP address is currently blacklisted';
COMMENT ON FUNCTION cleanup_old_security_events IS 'Removes security events older than 90 days that have been resolved';