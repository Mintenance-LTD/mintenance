-- Password History and Account Lockout Migration
-- Created: 2025-01-09
-- Purpose: Add password history tracking and account lockout mechanisms

-- ============================================================================
-- 1. Password History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON public.password_history(user_id);

-- Index for cleanup queries (delete old entries)
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON public.password_history(created_at);

-- ============================================================================
-- 2. Account Lockout Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  locked_until TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL DEFAULT 'too_many_failed_attempts',
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one active lockout per user
  CONSTRAINT unique_active_lockout UNIQUE (user_id)
);

-- Index for checking lockout status
CREATE INDEX IF NOT EXISTS idx_account_lockouts_user_id ON public.account_lockouts(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_locked_until ON public.account_lockouts(locked_until);

-- ============================================================================
-- 3. Login Attempts Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Index for rate limiting queries
  CONSTRAINT login_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON public.login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON public.login_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON public.login_attempts(ip_address);

-- ============================================================================
-- 4. Helper Functions
-- ============================================================================

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lockout_record RECORD;
BEGIN
  -- Get active lockout record
  SELECT * INTO lockout_record
  FROM public.account_lockouts
  WHERE user_id = check_user_id
    AND locked_until > NOW()
  LIMIT 1;
  
  -- Return true if locked, false otherwise
  RETURN FOUND;
END;
$$;

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION public.record_failed_login(
  attempt_user_id UUID,
  attempt_email TEXT,
  attempt_ip TEXT DEFAULT NULL,
  attempt_user_agent TEXT DEFAULT NULL,
  attempt_failure_reason TEXT DEFAULT 'invalid_credentials'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_failures INTEGER;
  lockout_duration INTERVAL := '15 minutes';
  max_attempts INTEGER := 5;
BEGIN
  -- Record the failed attempt
  INSERT INTO public.login_attempts (
    user_id,
    email,
    ip_address,
    user_agent,
    success,
    failure_reason,
    attempted_at
  ) VALUES (
    attempt_user_id,
    attempt_email,
    attempt_ip,
    attempt_user_agent,
    FALSE,
    attempt_failure_reason,
    NOW()
  );
  
  -- Count recent failed attempts (last 15 minutes)
  SELECT COUNT(*) INTO recent_failures
  FROM public.login_attempts
  WHERE (user_id = attempt_user_id OR email = attempt_email)
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '15 minutes';
  
  -- Lock account if too many failures
  IF recent_failures >= max_attempts AND attempt_user_id IS NOT NULL THEN
    INSERT INTO public.account_lockouts (
      user_id,
      locked_until,
      reason,
      failed_attempts,
      last_attempt_at
    ) VALUES (
      attempt_user_id,
      NOW() + lockout_duration,
      'too_many_failed_attempts',
      recent_failures,
      NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      locked_until = NOW() + lockout_duration,
      failed_attempts = recent_failures,
      last_attempt_at = NOW();
  END IF;
END;
$$;

-- Function to record successful login
CREATE OR REPLACE FUNCTION public.record_successful_login(
  login_user_id UUID,
  login_email TEXT,
  login_ip TEXT DEFAULT NULL,
  login_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Record the successful attempt
  INSERT INTO public.login_attempts (
    user_id,
    email,
    ip_address,
    user_agent,
    success,
    attempted_at
  ) VALUES (
    login_user_id,
    login_email,
    login_ip,
    login_user_agent,
    TRUE,
    NOW()
  );
  
  -- Clear any lockouts for this user
  DELETE FROM public.account_lockouts
  WHERE user_id = login_user_id;
END;
$$;

-- Function to add password to history
CREATE OR REPLACE FUNCTION public.add_password_to_history(
  history_user_id UUID,
  new_password_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_history_count INTEGER := 5;
  current_count INTEGER;
BEGIN
  -- Add new password to history
  INSERT INTO public.password_history (user_id, password_hash)
  VALUES (history_user_id, new_password_hash);
  
  -- Count total history entries
  SELECT COUNT(*) INTO current_count
  FROM public.password_history
  WHERE user_id = history_user_id;
  
  -- Keep only the most recent N passwords
  IF current_count > max_history_count THEN
    DELETE FROM public.password_history
    WHERE id IN (
      SELECT id
      FROM public.password_history
      WHERE user_id = history_user_id
      ORDER BY created_at ASC
      LIMIT (current_count - max_history_count)
    );
  END IF;
END;
$$;

-- Function to check if password was used before
CREATE OR REPLACE FUNCTION public.is_password_in_history(
  check_user_id UUID,
  check_password_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_match BOOLEAN;
BEGIN
  -- Check if password hash exists in history
  SELECT EXISTS (
    SELECT 1
    FROM public.password_history
    WHERE user_id = check_user_id
      AND password_hash = check_password_hash
  ) INTO found_match;
  
  RETURN found_match;
END;
$$;

-- Function to clean up old login attempts (for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete login attempts older than 90 days
  DELETE FROM public.login_attempts
  WHERE attempted_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Function to clean up expired lockouts
CREATE OR REPLACE FUNCTION public.cleanup_expired_lockouts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired lockouts
  DELETE FROM public.account_lockouts
  WHERE locked_until < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- 5. Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Password History Policies
CREATE POLICY password_history_admin_all ON public.password_history
  FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY password_history_user_read_own ON public.password_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Account Lockouts Policies
CREATE POLICY account_lockouts_admin_all ON public.account_lockouts
  FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY account_lockouts_user_read_own ON public.account_lockouts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Login Attempts Policies
CREATE POLICY login_attempts_admin_all ON public.login_attempts
  FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY login_attempts_user_read_own ON public.login_attempts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. Grants
-- ============================================================================

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.password_history TO authenticated;
GRANT SELECT ON public.account_lockouts TO authenticated;
GRANT SELECT ON public.login_attempts TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.is_account_locked(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_login(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_successful_login(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_password_to_history(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_password_in_history(UUID, TEXT) TO authenticated;

-- Admin-only cleanup functions
GRANT EXECUTE ON FUNCTION public.cleanup_old_login_attempts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_lockouts() TO authenticated;

-- ============================================================================
-- 7. Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.password_history IS 'Stores hashed password history to prevent password reuse';
COMMENT ON TABLE public.account_lockouts IS 'Tracks account lockouts due to failed login attempts';
COMMENT ON TABLE public.login_attempts IS 'Logs all login attempts for security auditing and rate limiting';

COMMENT ON FUNCTION public.is_account_locked IS 'Check if a user account is currently locked';
COMMENT ON FUNCTION public.record_failed_login IS 'Record a failed login attempt and potentially lock the account';
COMMENT ON FUNCTION public.record_successful_login IS 'Record a successful login and clear any lockouts';
COMMENT ON FUNCTION public.add_password_to_history IS 'Add a password hash to user history (keeps last 5)';
COMMENT ON FUNCTION public.is_password_in_history IS 'Check if a password hash exists in user history';

-- ============================================================================
-- 8. Initial Data / Indexes
-- ============================================================================

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_success_time 
  ON public.login_attempts(user_id, success, attempted_at DESC);

-- Create index for email-based queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_success_time 
  ON public.login_attempts(email, success, attempted_at DESC);

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Password history and account lockout migration completed successfully';
  RAISE NOTICE 'Tables created: password_history, account_lockouts, login_attempts';
  RAISE NOTICE 'Functions created: 6 helper functions for password/lockout management';
  RAISE NOTICE 'RLS policies applied to all tables';
END $$;

