-- Phone Verification Migration
-- Adds phone verification fields to users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verification_code TEXT,
ADD COLUMN IF NOT EXISTS phone_verification_code_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

-- Index for phone verification lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_verification_code ON users(phone_verification_code) 
WHERE phone_verification_code IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.phone_verified IS 'Whether the user has verified their phone number via SMS';
COMMENT ON COLUMN users.phone_verification_code IS 'Hashed SMS verification code (expires in 5 minutes)';
COMMENT ON COLUMN users.phone_verification_code_expires_at IS 'Expiration timestamp for verification code';
COMMENT ON COLUMN users.phone_verified_at IS 'Timestamp when phone was verified';

