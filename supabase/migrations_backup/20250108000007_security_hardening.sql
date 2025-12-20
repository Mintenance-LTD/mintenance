-- ==========================================================
-- DATABASE SECURITY HARDENING
-- Mintenance UK - Production Security Enhancement
-- ==========================================================
-- This script implements comprehensive security measures
-- for production database protection
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. SECURITY EXTENSIONS AND SETTINGS
-- ==========================================================

-- Enable required extensions for security
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ==========================================================
-- 2. AUDIT LOGGING SYSTEM
-- ==========================================================

-- Audit log table for tracking all database changes
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES public.users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON public.audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log policies (admin only)
CREATE POLICY audit_log_select_policy ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY audit_log_insert_policy ON public.audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ==========================================================
-- 3. AUDIT TRIGGER FUNCTION
-- ==========================================================

-- Function to create audit triggers
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (
      table_name,
      operation,
      old_values,
      user_id,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      row_to_json(OLD),
      auth.uid(),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (
      table_name,
      operation,
      old_values,
      new_values,
      user_id,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      row_to_json(OLD),
      row_to_json(NEW),
      auth.uid(),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (
      table_name,
      operation,
      new_values,
      user_id,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      row_to_json(NEW),
      auth.uid(),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- 4. INPUT VALIDATION FUNCTIONS
-- ==========================================================

-- Function to validate email format
CREATE OR REPLACE FUNCTION validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate phone number (UK format)
CREATE OR REPLACE FUNCTION validate_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN phone ~* '^(\+44|0)[0-9]{10}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to sanitize text input
CREATE OR REPLACE FUNCTION sanitize_text(input TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove potentially dangerous characters
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(input, '<[^>]*>', '', 'g'), -- Remove HTML tags
      '[<>''"`]', '', 'g'), -- Remove dangerous characters
    '\s+', ' ', 'g' -- Normalize whitespace
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate UK postcode
CREATE OR REPLACE FUNCTION validate_postcode(postcode TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN postcode ~* '^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][ABD-HJLNP-UW-Z]{2}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================================
-- 5. PASSWORD SECURITY FUNCTIONS
-- ==========================================================

-- Function to check password strength
CREATE OR REPLACE FUNCTION check_password_strength(password TEXT)
RETURNS TEXT AS $$
BEGIN
  IF LENGTH(password) < 8 THEN
    RETURN 'Password must be at least 8 characters long';
  END IF;
  
  IF NOT (password ~* '[A-Z]') THEN
    RETURN 'Password must contain at least one uppercase letter';
  END IF;
  
  IF NOT (password ~* '[a-z]') THEN
    RETURN 'Password must contain at least one lowercase letter';
  END IF;
  
  IF NOT (password ~* '[0-9]') THEN
    RETURN 'Password must contain at least one number';
  END IF;
  
  IF NOT (password ~* '[^A-Za-z0-9]') THEN
    RETURN 'Password must contain at least one special character';
  END IF;
  
  RETURN 'Password is strong';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to hash password
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to verify password
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN crypt(password, hash) = hash;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================================
-- 6. RATE LIMITING FUNCTIONS
-- ==========================================================

-- Rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  ip_address INET NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON public.rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_address ON public.rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON public.rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits(window_start);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_ip_address INET,
  p_endpoint TEXT,
  p_limit INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Clean up old entries
  DELETE FROM public.rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  -- Get current count
  SELECT COALESCE(SUM(request_count), 0) INTO current_count
  FROM public.rate_limits
  WHERE 
    (p_user_id IS NOT NULL AND user_id = p_user_id OR user_id IS NULL)
    AND ip_address = p_ip_address
    AND endpoint = p_endpoint
    AND window_start >= NOW() - INTERVAL '1 hour';
  
  -- Check if limit exceeded
  IF current_count >= p_limit THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  INSERT INTO public.rate_limits (user_id, ip_address, endpoint, request_count)
  VALUES (p_user_id, p_ip_address, p_endpoint, 1)
  ON CONFLICT (user_id, ip_address, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- 7. SECURITY MONITORING FUNCTIONS
-- ==========================================================

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_user_id UUID,
  p_ip_address INET,
  p_endpoint TEXT,
  p_method TEXT,
  p_details TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type,
    severity,
    user_id,
    ip_address,
    endpoint,
    method,
    details,
    metadata
  ) VALUES (
    p_event_type,
    p_severity,
    p_user_id,
    p_ip_address,
    p_endpoint,
    p_method,
    p_details,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql;

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
  p_user_id UUID,
  p_ip_address INET,
  p_endpoint TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  recent_events INTEGER;
  different_ips INTEGER;
BEGIN
  -- Check for multiple failed login attempts
  SELECT COUNT(*) INTO recent_events
  FROM public.security_events
  WHERE 
    user_id = p_user_id
    AND event_type = 'auth_failure'
    AND created_at >= NOW() - INTERVAL '15 minutes';
  
  IF recent_events >= 5 THEN
    PERFORM log_security_event(
      'suspicious_activity',
      'high',
      p_user_id,
      p_ip_address,
      p_endpoint,
      'POST',
      'Multiple failed login attempts detected'
    );
    RETURN TRUE;
  END IF;
  
  -- Check for requests from multiple IPs
  SELECT COUNT(DISTINCT ip_address) INTO different_ips
  FROM public.security_events
  WHERE 
    user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '1 hour';
  
  IF different_ips >= 3 THEN
    PERFORM log_security_event(
      'suspicious_activity',
      'medium',
      p_user_id,
      p_ip_address,
      p_endpoint,
      'GET',
      'Requests from multiple IP addresses detected'
    );
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- 8. DATA ENCRYPTION FUNCTIONS
-- ==========================================================

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
  IF data IS NULL OR key IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN encode(encrypt(data::bytea, key::bytea, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
  IF encrypted_data IS NULL OR key IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), key::bytea, 'aes'), 'UTF8');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================================
-- 9. SECURITY CONSTRAINTS AND VALIDATIONS
-- ==========================================================

-- Add security constraints to existing tables
ALTER TABLE public.users 
ADD CONSTRAINT users_email_format CHECK (validate_email(email));

ALTER TABLE public.users 
ADD CONSTRAINT users_phone_format CHECK (phone IS NULL OR validate_phone(phone));

ALTER TABLE public.users 
ADD CONSTRAINT users_postcode_format CHECK (postcode IS NULL OR validate_postcode(postcode));

-- Add security constraints to jobs table
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_title_length CHECK (LENGTH(title) >= 5 AND LENGTH(title) <= 200);

ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_description_length CHECK (LENGTH(description) >= 10 AND LENGTH(description) <= 5000);

ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_budget_positive CHECK (budget > 0);

-- Add security constraints to bids table
ALTER TABLE public.bids 
ADD CONSTRAINT bids_amount_positive CHECK (amount > 0);

ALTER TABLE public.bids 
ADD CONSTRAINT bids_description_length CHECK (LENGTH(description) >= 10 AND LENGTH(description) <= 2000);

-- Add security constraints to messages table
ALTER TABLE public.messages 
ADD CONSTRAINT messages_content_length CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 2000);

-- Add security constraints to notifications table
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_title_length CHECK (LENGTH(title) >= 1 AND LENGTH(title) <= 255);

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_message_length CHECK (LENGTH(message) >= 1 AND LENGTH(message) <= 1000);

-- ==========================================================
-- 10. SECURITY TRIGGERS
-- ==========================================================

-- Create audit triggers for sensitive tables
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_jobs_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_bids_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bids
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_escrow_transactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==========================================================
-- 11. SECURITY VIEWS AND MONITORING
-- ==========================================================

-- View for security dashboard
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  event_type,
  severity,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT ip_address) as unique_ips
FROM public.security_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), event_type, severity
ORDER BY hour DESC, event_count DESC;

-- View for failed login attempts
CREATE OR REPLACE VIEW failed_login_attempts AS
SELECT 
  ip_address,
  user_agent,
  COUNT(*) as attempt_count,
  MIN(created_at) as first_attempt,
  MAX(created_at) as last_attempt
FROM public.security_events
WHERE 
  event_type = 'auth_failure'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY ip_address, user_agent
HAVING COUNT(*) >= 3
ORDER BY attempt_count DESC;

-- View for suspicious IPs
CREATE OR REPLACE VIEW suspicious_ips AS
SELECT 
  ip_address,
  COUNT(*) as total_events,
  COUNT(DISTINCT event_type) as event_types,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as last_activity
FROM public.security_events
WHERE 
  created_at >= NOW() - INTERVAL '7 days'
  AND severity IN ('high', 'critical')
GROUP BY ip_address
HAVING COUNT(*) >= 10
ORDER BY total_events DESC;

-- ==========================================================
-- 12. SECURITY CLEANUP FUNCTIONS
-- ==========================================================

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_audit_logs()
RETURNS void AS $$
BEGIN
  -- Keep audit logs for 7 years for compliance
  DELETE FROM public.audit_log 
  WHERE created_at < NOW() - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old rate limits
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- 13. SECURITY GRANTS AND PERMISSIONS
-- ==========================================================

-- Grant permissions for security functions
GRANT EXECUTE ON FUNCTION validate_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_phone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION sanitize_text(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_postcode(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_password_strength(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION hash_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, INET, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event(TEXT, TEXT, UUID, INET, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_suspicious_activity(UUID, INET, TEXT) TO authenticated;

-- Grant permissions for security views
GRANT SELECT ON security_dashboard TO authenticated;
GRANT SELECT ON failed_login_attempts TO authenticated;
GRANT SELECT ON suspicious_ips TO authenticated;

-- ==========================================================
-- 14. COMMENTS AND DOCUMENTATION
-- ==========================================================

COMMENT ON TABLE public.audit_log IS 'Audit trail for all database changes';
COMMENT ON TABLE public.rate_limits IS 'Rate limiting tracking for API endpoints';

COMMENT ON FUNCTION validate_email(TEXT) IS 'Validates email format';
COMMENT ON FUNCTION validate_phone(TEXT) IS 'Validates UK phone number format';
COMMENT ON FUNCTION sanitize_text(TEXT) IS 'Sanitizes text input to prevent XSS';
COMMENT ON FUNCTION validate_postcode(TEXT) IS 'Validates UK postcode format';
COMMENT ON FUNCTION check_password_strength(TEXT) IS 'Checks password strength requirements';
COMMENT ON FUNCTION hash_password(TEXT) IS 'Hashes password using bcrypt';
COMMENT ON FUNCTION verify_password(TEXT, TEXT) IS 'Verifies password against hash';
COMMENT ON FUNCTION check_rate_limit(UUID, INET, TEXT, INTEGER, INTEGER) IS 'Checks and enforces rate limits';
COMMENT ON FUNCTION log_security_event(TEXT, TEXT, UUID, INET, TEXT, TEXT, TEXT, JSONB) IS 'Logs security events';
COMMENT ON FUNCTION detect_suspicious_activity(UUID, INET, TEXT) IS 'Detects suspicious user activity';

COMMENT ON VIEW security_dashboard IS 'Security events dashboard data';
COMMENT ON VIEW failed_login_attempts IS 'Failed login attempts by IP and user agent';
COMMENT ON VIEW suspicious_ips IS 'IPs with high security event counts';

COMMIT;
