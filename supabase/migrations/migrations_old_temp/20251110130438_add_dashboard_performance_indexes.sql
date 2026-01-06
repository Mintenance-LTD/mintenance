-- Add performance indexes for dashboard queries
-- Optimizes slow dashboard loading and page navigation

-- Jobs table indexes for homeowner dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_homeowner_created 
  ON jobs(homeowner_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_homeowner_status_category 
  ON jobs(homeowner_id, status, category);

-- Bids table indexes for contractor dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bids_contractor_created 
  ON bids(contractor_id, created_at DESC);

-- Payments table indexes for dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_payer_created 
  ON payments(payer_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_payee_created 
  ON payments(payee_id, created_at DESC);

-- Contractor quotes indexes for contractor dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_contractor_created 
  ON contractor_quotes(contractor_id, created_at DESC);

-- Messages table indexes for recent activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_user_created 
  ON messages(recipient_id, sender_id, created_at DESC);

-- Properties table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_owner_created 
  ON properties(owner_id, created_at DESC);

-- Subscriptions table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_status 
  ON subscriptions(user_id, status, next_billing_date);

-- Escrow transactions indexes for contractor dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escrow_payee_status 
  ON escrow_transactions(payee_id, status, created_at DESC);

-- Add comments for documentation
COMMENT ON INDEX idx_jobs_homeowner_created IS 'Optimize homeowner dashboard job queries';
COMMENT ON INDEX idx_jobs_homeowner_status_category IS 'Optimize recommendations service queries';
COMMENT ON INDEX idx_bids_contractor_created IS 'Optimize contractor dashboard bid queries';
COMMENT ON INDEX idx_payments_payer_created IS 'Optimize homeowner payment queries';
COMMENT ON INDEX idx_payments_payee_created IS 'Optimize contractor payment queries';
COMMENT ON INDEX idx_quotes_contractor_created IS 'Optimize contractor dashboard quote queries';
COMMENT ON INDEX idx_messages_user_created IS 'Optimize recent activity message queries';
COMMENT ON INDEX idx_properties_owner_created IS 'Optimize property listing queries';
COMMENT ON INDEX idx_subscriptions_user_status IS 'Optimize subscription queries';
COMMENT ON INDEX idx_escrow_payee_status IS 'Optimize contractor escrow queries';

