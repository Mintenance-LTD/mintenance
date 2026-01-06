-- Background Check Migration
-- Adds background check fields to users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS background_check_status VARCHAR(50) DEFAULT 'pending' 
  CHECK (background_check_status IN ('pending', 'in_progress', 'passed', 'failed', 'not_required')),
ADD COLUMN IF NOT EXISTS background_check_provider VARCHAR(100),
ADD COLUMN IF NOT EXISTS background_check_id TEXT,
ADD COLUMN IF NOT EXISTS background_check_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS background_check_result JSONB;

-- Index for filtering by background check status
CREATE INDEX IF NOT EXISTS idx_users_background_check_status ON users(background_check_status);

-- Add comments
COMMENT ON COLUMN users.background_check_status IS 'Status of background check: pending, in_progress, passed, failed, not_required';
COMMENT ON COLUMN users.background_check_provider IS 'Background check provider name (e.g., Checkr, GoodHire, Sterling)';
COMMENT ON COLUMN users.background_check_id IS 'External background check ID from provider';
COMMENT ON COLUMN users.background_check_completed_at IS 'Timestamp when background check was completed';
COMMENT ON COLUMN users.background_check_result IS 'JSON result from background check provider';

