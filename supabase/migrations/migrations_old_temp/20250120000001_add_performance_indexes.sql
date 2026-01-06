-- Add missing database indexes for performance optimization
-- Based on code review findings

-- Jobs table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_status 
  ON jobs(status) WHERE status IN ('posted', 'assigned', 'in_progress', 'completed', 'cancelled');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_created_at 
  ON jobs(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_homeowner_contractor 
  ON jobs(homeowner_id, contractor_id) 
  WHERE contractor_id IS NOT NULL;

-- Messages table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_job_id 
  ON messages(job_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at 
  ON messages(created_at DESC);

-- Escrow transactions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escrow_transactions_job_id 
  ON escrow_transactions(job_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escrow_transactions_status 
  ON escrow_transactions(status);

-- Refresh tokens indexes for better lookup performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_user_lookup 
  ON refresh_tokens(user_id, token_hash) 
  WHERE revoked_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_expires_at 
  ON refresh_tokens(expires_at) 
  WHERE revoked_at IS NULL;

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
  ON users(role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
  ON users(created_at DESC);

-- Contractors specific indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contractors_verified 
  ON contractors(verified) WHERE verified = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contractors_service_areas 
  ON contractors USING GIN(service_areas);

-- Bids table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bids_job_id 
  ON bids(job_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bids_contractor_id 
  ON bids(contractor_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bids_created_at 
  ON bids(created_at DESC);

-- Reviews table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_contractor_id 
  ON reviews(contractor_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_job_id 
  ON reviews(job_id);

-- Add comments for documentation
COMMENT ON INDEX idx_jobs_status IS 'Optimize job filtering by status';
COMMENT ON INDEX idx_jobs_created_at IS 'Optimize job listing by creation date';
COMMENT ON INDEX idx_jobs_homeowner_contractor IS 'Optimize job lookup by participants';
COMMENT ON INDEX idx_messages_job_id IS 'Optimize message thread loading';
COMMENT ON INDEX idx_refresh_tokens_user_lookup IS 'Optimize refresh token validation';
