-- Add composite indexes for common query patterns
-- Based on code review recommendations

-- Jobs table composite indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_homeowner_status
  ON jobs(homeowner_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_contractor_status
  ON jobs(contractor_id, status)
  WHERE contractor_id IS NOT NULL;

-- Escrow transactions composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escrow_job_status
  ON escrow_transactions(job_id, status);

-- Messages table composite index for thread performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_thread
  ON messages(sender_id, receiver_id, created_at DESC);

-- Refresh tokens active sessions index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_active
  ON refresh_tokens(user_id, expires_at)
  WHERE revoked_at IS NULL AND expires_at > NOW();

-- User roles index for admin queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active
  ON users(role, created_at)
  WHERE role IN ('admin', 'contractor', 'homeowner');

-- Contractor verification index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contractors_verified_rating
  ON contractors(verified, rating DESC)
  WHERE verified = true AND rating IS NOT NULL;

-- Service areas GIN index for better text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contractors_service_areas_gin
  ON contractors USING GIN(service_areas);

-- Job categories index for filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_category_status
  ON jobs(category, status, created_at DESC);

-- Payment status index for financial queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status_created
  ON payments(status, created_at DESC);

-- Add comments for documentation
COMMENT ON INDEX idx_jobs_homeowner_status IS 'Optimize job queries by homeowner and status';
COMMENT ON INDEX idx_jobs_contractor_status IS 'Optimize job queries by contractor and status';
COMMENT ON INDEX idx_escrow_job_status IS 'Optimize escrow queries by job and status';
COMMENT ON INDEX idx_messages_thread IS 'Optimize message thread loading and ordering';
COMMENT ON INDEX idx_refresh_tokens_active IS 'Optimize active session lookups';
COMMENT ON INDEX idx_contractors_verified_rating IS 'Optimize verified contractor ranking';
COMMENT ON INDEX idx_contractors_service_areas_gin IS 'Optimize service area text search';
