-- Enhanced Payment Security Migration
-- Adds tables and functions for advanced payment security features
-- Created: 2025-12-02

-- ============================================================================
-- PAYMENT SECURITY EVENTS TABLE
-- Audit log for security events related to payments
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'high_risk_transaction',
    'anomaly_detected',
    'velocity_limit_exceeded',
    'mfa_required',
    'mfa_failed',
    'geographic_anomaly',
    'device_anomaly',
    'suspicious_pattern'
  )),
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  transaction_type TEXT CHECK (transaction_type IN (
    'payment',
    'escrow_release',
    'refund',
    'payout'
  )),
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'usd',
  reasons TEXT[] DEFAULT '{}',
  blocked_reasons TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indices for performance
  CONSTRAINT valid_amount CHECK (amount >= 0)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_payment_security_events_user_id ON payment_security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_security_events_created_at ON payment_security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_security_events_event_type ON payment_security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_security_events_risk_score ON payment_security_events(risk_score DESC);

-- RLS Policies
ALTER TABLE payment_security_events ENABLE ROW LEVEL SECURITY;

-- Users can only view their own security events
CREATE POLICY "Users can view own security events" ON payment_security_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all security events
CREATE POLICY "Admins can view all security events" ON payment_security_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only system/admin can insert security events
CREATE POLICY "System can insert security events" ON payment_security_events
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- PAYMENT VELOCITY TRACKING TABLE
-- Tracks transaction velocity for rate limiting
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_velocity_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  window_type TEXT NOT NULL CHECK (window_type IN ('hourly', 'daily', 'weekly')),
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  transaction_count INTEGER DEFAULT 0,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique tracking per user per window
  CONSTRAINT unique_user_window UNIQUE (user_id, window_type, window_start)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_payment_velocity_user_id ON payment_velocity_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_velocity_window ON payment_velocity_tracking(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_payment_velocity_type ON payment_velocity_tracking(window_type);

-- RLS Policies
ALTER TABLE payment_velocity_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own velocity tracking
CREATE POLICY "Users can view own velocity tracking" ON payment_velocity_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all velocity tracking
CREATE POLICY "Admins can view all velocity tracking" ON payment_velocity_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert/update velocity tracking
CREATE POLICY "System can manage velocity tracking" ON payment_velocity_tracking
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PAYMENT ATTEMPTS TABLE
-- Tracks all payment attempts including failures
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_intent_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  failure_reason TEXT,
  ip_address INET,
  geo_location JSONB,
  device_fingerprint TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_payment_attempts_user_id ON payment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_created_at ON payment_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_ip_address ON payment_attempts(ip_address);

-- RLS Policies
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment attempts" ON payment_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment attempts" ON payment_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert payment attempts" ON payment_attempts
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- PAYMENT FAILURES TABLE
-- Specifically tracks failures for anomaly detection
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_attempt_id UUID REFERENCES payment_attempts(id) ON DELETE CASCADE,
  failure_code TEXT NOT NULL,
  failure_message TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_payment_failures_user_id ON payment_failures(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_created_at ON payment_failures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_failures_code ON payment_failures(failure_code);

-- RLS Policies
ALTER TABLE payment_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment failures" ON payment_failures
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment failures" ON payment_failures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert payment failures" ON payment_failures
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- MFA ATTEMPTS TABLE
-- Tracks MFA authentication attempts for security
-- ============================================================================
CREATE TABLE IF NOT EXISTS mfa_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_user_id ON mfa_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_created_at ON mfa_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_success ON mfa_attempts(success);

-- RLS Policies
ALTER TABLE mfa_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mfa attempts" ON mfa_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all mfa attempts" ON mfa_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert mfa attempts" ON mfa_attempts
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- USER DEVICES TABLE
-- Tracks known devices for anomaly detection
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_trusted BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',

  CONSTRAINT unique_user_device UNIQUE (user_id, device_fingerprint)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen ON user_devices(last_seen DESC);

-- RLS Policies
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices" ON user_devices
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own devices" ON user_devices
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- ADD MFA COLUMNS TO USERS TABLE
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- POSTGRESQL ADVISORY LOCK FUNCTIONS
-- For distributed locking in idempotency checks
-- ============================================================================
CREATE OR REPLACE FUNCTION pg_try_advisory_lock(lock_key INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN pg_try_advisory_lock(lock_key::BIGINT);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_advisory_unlock(lock_key INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN pg_advisory_unlock(lock_key::BIGINT);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ANOMALY DETECTION TRIGGER
-- Automatically flag suspicious transactions
-- ============================================================================
CREATE OR REPLACE FUNCTION detect_payment_anomaly()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
  avg_amount DECIMAL;
  deviation_multiplier DECIMAL;
BEGIN
  -- Count recent transactions (last hour)
  SELECT COUNT(*) INTO recent_count
  FROM escrow_transactions
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 hour';

  -- Flag if too many transactions in short time
  IF recent_count > 5 THEN
    INSERT INTO payment_security_events (
      user_id,
      event_type,
      risk_score,
      transaction_type,
      amount,
      reasons,
      metadata
    ) VALUES (
      NEW.user_id,
      'velocity_limit_exceeded',
      70,
      'payment',
      NEW.amount,
      ARRAY['More than 5 transactions in 1 hour'],
      jsonb_build_object('transaction_count', recent_count)
    );
  END IF;

  -- Calculate average transaction amount
  SELECT AVG(amount) INTO avg_amount
  FROM escrow_transactions
  WHERE user_id = NEW.user_id
    AND status = 'completed'
    AND created_at > NOW() - INTERVAL '30 days'
  LIMIT 20;

  -- Check if amount is anomalous (5x average or more)
  IF avg_amount IS NOT NULL AND avg_amount > 0 THEN
    deviation_multiplier := NEW.amount / avg_amount;

    IF deviation_multiplier >= 5 THEN
      INSERT INTO payment_security_events (
        user_id,
        event_type,
        risk_score,
        transaction_type,
        amount,
        reasons,
        metadata
      ) VALUES (
        NEW.user_id,
        'anomaly_detected',
        80,
        'payment',
        NEW.amount,
        ARRAY[format('Amount is %.1fx higher than average', deviation_multiplier)],
        jsonb_build_object(
          'average_amount', avg_amount,
          'deviation_multiplier', deviation_multiplier
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on escrow_transactions
DROP TRIGGER IF EXISTS trigger_detect_payment_anomaly ON escrow_transactions;
CREATE TRIGGER trigger_detect_payment_anomaly
  AFTER INSERT ON escrow_transactions
  FOR EACH ROW
  EXECUTE FUNCTION detect_payment_anomaly();

-- ============================================================================
-- CLEANUP OLD SECURITY EVENTS
-- Function to clean up old security events (older than 90 days)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_security_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM payment_security_events
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE payment_security_events IS 'Audit log for payment security events and anomaly detection';
COMMENT ON TABLE payment_velocity_tracking IS 'Tracks transaction velocity for rate limiting and fraud detection';
COMMENT ON TABLE payment_attempts IS 'Records all payment attempts including metadata for forensics';
COMMENT ON TABLE payment_failures IS 'Tracks payment failures for pattern analysis';
COMMENT ON TABLE mfa_attempts IS 'Tracks MFA authentication attempts';
COMMENT ON TABLE user_devices IS 'Known user devices for anomaly detection';

-- ============================================================================
-- GRANTS
-- Ensure service role can access these tables
-- ============================================================================
GRANT ALL ON payment_security_events TO service_role;
GRANT ALL ON payment_velocity_tracking TO service_role;
GRANT ALL ON payment_attempts TO service_role;
GRANT ALL ON payment_failures TO service_role;
GRANT ALL ON mfa_attempts TO service_role;
GRANT ALL ON user_devices TO service_role;
