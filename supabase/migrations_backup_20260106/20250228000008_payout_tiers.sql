-- Payout Tiers Migration
-- Adds payout tier fields to users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS payout_tier VARCHAR(50) DEFAULT 'standard' 
  CHECK (payout_tier IN ('elite', 'trusted', 'standard')),
ADD COLUMN IF NOT EXISTS payout_speed_hours INTEGER DEFAULT 168 CHECK (payout_speed_hours > 0);

-- Index for filtering by payout tier
CREATE INDEX IF NOT EXISTS idx_users_payout_tier ON users(payout_tier);

-- Add comments
COMMENT ON COLUMN users.payout_tier IS 'Payout tier: elite (24h), trusted (48h), standard (7 days)';
COMMENT ON COLUMN users.payout_speed_hours IS 'Payout speed in hours based on tier';

