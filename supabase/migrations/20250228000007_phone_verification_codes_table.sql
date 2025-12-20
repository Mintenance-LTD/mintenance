-- Phone Verification Codes Table
-- Stores temporary verification codes for development/testing
-- In production, Supabase Auth handles OTP codes

CREATE TABLE IF NOT EXISTS phone_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_user_id ON phone_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_phone_number ON phone_verification_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_code ON phone_verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_expires_at ON phone_verification_codes(expires_at);

-- Clean up expired codes (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_phone_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM phone_verification_codes
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE phone_verification_codes IS 'Temporary storage for phone verification codes (development/testing)';
COMMENT ON COLUMN phone_verification_codes.code IS '6-digit verification code (plain text for dev mode only)';
COMMENT ON COLUMN phone_verification_codes.expires_at IS 'Code expiration time (5 minutes from creation)';

