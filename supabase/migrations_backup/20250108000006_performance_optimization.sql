-- ==========================================================
-- DATABASE PERFORMANCE OPTIMIZATION
-- Mintenance UK - Production Performance Enhancement
-- ==========================================================
-- This script optimizes database performance for high-traffic
-- production environments with 1000+ concurrent users
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. ADVANCED INDEXING STRATEGY
-- ==========================================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at_desc
ON public.jobs(status, created_at DESC)
WHERE status IN ('posted', 'assigned', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_status_created 
ON public.jobs(homeowner_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_contractor_status_created 
ON public.jobs(contractor_id, status, created_at DESC) 
WHERE contractor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_location_category_status 
ON public.jobs(latitude, longitude, category, status) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_budget_range 
ON public.jobs(budget) 
WHERE status = 'posted';

-- Messages optimization indexes
CREATE INDEX IF NOT EXISTS idx_messages_job_created_desc 
ON public.messages(job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread 
ON public.messages(receiver_id, created_at DESC) 
WHERE read = FALSE;

CREATE INDEX  IF NOT EXISTS idx_messages_sender_receiver_created 
ON public.messages(sender_id, receiver_id, created_at DESC);

-- Notifications optimization indexes
CREATE INDEX  IF NOT EXISTS idx_notifications_user_unread_created 
ON public.notifications(user_id, read, created_at DESC) 
WHERE read = FALSE;

-- Reviews optimization indexes
CREATE INDEX  IF NOT EXISTS idx_reviews_reviewed_rating_created 
ON public.reviews(reviewed_id, rating, created_at DESC);

CREATE INDEX  IF NOT EXISTS idx_reviews_job_created 
ON public.reviews(job_id, created_at DESC);

-- Bids optimization indexes
CREATE INDEX  IF NOT EXISTS idx_bids_job_status_amount 
ON public.bids(job_id, status, amount);

CREATE INDEX  IF NOT EXISTS idx_bids_contractor_created 
ON public.bids(contractor_id, created_at DESC);

-- Users optimization indexes
CREATE INDEX  IF NOT EXISTS idx_users_role_available_rating 
ON public.users(role, is_available, rating DESC) 
WHERE role = 'contractor' AND is_available = TRUE;

-- ==========================================================
-- 2. FULL-TEXT SEARCH OPTIMIZATION
-- ==========================================================

-- Full-text search indexes for job search
CREATE INDEX  IF NOT EXISTS idx_jobs_fts_title 
ON public.jobs USING gin(to_tsvector('english', title));

CREATE INDEX  IF NOT EXISTS idx_jobs_fts_description 
ON public.jobs USING gin(to_tsvector('english', description));

CREATE INDEX  IF NOT EXISTS idx_jobs_fts_combined 
ON public.jobs USING gin(to_tsvector('english', title || ' ' || description));

-- Full-text search for user bios
CREATE INDEX  IF NOT EXISTS idx_users_fts_bio 
ON public.users USING gin(to_tsvector('english', bio)) 
WHERE bio IS NOT NULL;

-- ==========================================================
-- 3. MATERIALIZED VIEWS FOR ANALYTICS
-- ==========================================================

-- Job statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_job_statistics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  status,
  category,
  COUNT(*) as job_count,
  AVG(budget) as avg_budget,
  SUM(budget) as total_budget,
  COUNT(DISTINCT homeowner_id) as unique_homeowners,
  COUNT(DISTINCT contractor_id) as unique_contractors
FROM public.jobs
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at), status, category;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_job_statistics_unique 
ON mv_job_statistics(date, status, category);

-- User activity materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_activity AS
SELECT 
  u.id as user_id,
  u.role,
  u.is_available,
  COUNT(DISTINCT j.id) as total_jobs,
  COUNT(DISTINCT CASE WHEN j.status = 'completed' THEN j.id END) as completed_jobs,
  COUNT(DISTINCT b.id) as total_bids,
  COUNT(DISTINCT CASE WHEN b.status = 'accepted' THEN b.id END) as accepted_bids,
  AVG(r.rating) as avg_rating,
  COUNT(DISTINCT r.id) as total_reviews,
  MAX(j.created_at) as last_job_activity,
  MAX(b.created_at) as last_bid_activity
FROM public.users u
LEFT JOIN public.jobs j ON u.id = j.homeowner_id
LEFT JOIN public.bids b ON u.id = b.contractor_id
LEFT JOIN public.reviews r ON u.id = r.reviewed_id
WHERE u.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY u.id, u.role, u.is_available;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_activity_unique 
ON mv_user_activity(user_id);

-- ==========================================================
-- 4. PERFORMANCE MONITORING FUNCTIONS
-- ==========================================================

-- Function to get slow queries
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE (
  query text,
  calls bigint,
  total_time double precision,
  mean_time double precision,
  rows bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_stat_statements.query,
    pg_stat_statements.calls,
    pg_stat_statements.total_time,
    pg_stat_statements.mean_time,
    pg_stat_statements.rows
  FROM pg_stat_statements
  WHERE pg_stat_statements.mean_time > 100 -- Queries taking more than 100ms
  ORDER BY pg_stat_statements.mean_time DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function to get table statistics
CREATE OR REPLACE FUNCTION get_table_statistics()
RETURNS TABLE (
  table_name text,
  row_count bigint,
  table_size text,
  index_size text,
  total_size text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    n_tup_ins + n_tup_upd + n_tup_del as row_count,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage()
RETURNS TABLE (
  table_name text,
  index_name text,
  index_scans bigint,
  tuples_read bigint,
  tuples_fetched bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    indexrelname as index_name,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- 5. QUERY OPTIMIZATION FUNCTIONS
-- ==========================================================

-- Function to get jobs with pagination and filtering
CREATE OR REPLACE FUNCTION get_jobs_paginated(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_min_budget DECIMAL DEFAULT NULL,
  p_max_budget DECIMAL DEFAULT NULL,
  p_latitude DECIMAL DEFAULT NULL,
  p_longitude DECIMAL DEFAULT NULL,
  p_radius_km INTEGER DEFAULT 25
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  location TEXT,
  budget DECIMAL,
  status TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  homeowner_name TEXT,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.description,
    j.location,
    j.budget,
    j.status,
    j.category,
    j.created_at,
    CONCAT(u.first_name, ' ', u.last_name) as homeowner_name,
    CASE 
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
        ST_Distance(
          ST_Point(j.longitude, j.latitude)::geography,
          ST_Point(p_longitude, p_latitude)::geography
        ) / 1000
      ELSE NULL
    END as distance_km
  FROM public.jobs j
  JOIN public.users u ON j.homeowner_id = u.id
  WHERE 
    (p_status IS NULL OR j.status = p_status)
    AND (p_category IS NULL OR j.category = p_category)
    AND (p_min_budget IS NULL OR j.budget >= p_min_budget)
    AND (p_max_budget IS NULL OR j.budget <= p_max_budget)
    AND (
      p_latitude IS NULL OR p_longitude IS NULL OR p_radius_km IS NULL OR
      ST_DWithin(
        ST_Point(j.longitude, j.latitude)::geography,
        ST_Point(p_longitude, p_latitude)::geography,
        p_radius_km * 1000
      )
    )
  ORDER BY j.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get contractor recommendations
CREATE OR REPLACE FUNCTION get_contractor_recommendations(
  p_job_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  contractor_id UUID,
  contractor_name TEXT,
  rating DECIMAL,
  total_jobs INTEGER,
  distance_km DECIMAL,
  hourly_rate DECIMAL,
  availability_score INTEGER
) AS $$
DECLARE
  job_record RECORD;
BEGIN
  -- Get job details
  SELECT * INTO job_record FROM public.jobs WHERE id = p_job_id;
  
  RETURN QUERY
  SELECT 
    u.id as contractor_id,
    CONCAT(u.first_name, ' ', u.last_name) as contractor_name,
    u.rating,
    u.total_jobs_completed as total_jobs,
    CASE 
      WHEN job_record.latitude IS NOT NULL AND job_record.longitude IS NOT NULL THEN
        ST_Distance(
          ST_Point(u.longitude, u.latitude)::geography,
          ST_Point(job_record.longitude, job_record.latitude)::geography
        ) / 1000
      ELSE NULL
    END as distance_km,
    NULL::DECIMAL as hourly_rate, -- Would need contractor_profiles table
    CASE 
      WHEN u.is_available THEN 100
      ELSE 0
    END as availability_score
  FROM public.users u
  WHERE 
    u.role = 'contractor'
    AND u.is_available = TRUE
    AND u.rating >= 3.0
    AND (
      job_record.latitude IS NULL OR job_record.longitude IS NULL OR
      ST_DWithin(
        ST_Point(u.longitude, u.latitude)::geography,
        ST_Point(job_record.longitude, job_record.latitude)::geography,
        50 * 1000 -- 50km radius
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.bids b 
      WHERE b.job_id = p_job_id AND b.contractor_id = u.id
    )
  ORDER BY 
    u.rating DESC,
    u.total_jobs_completed DESC,
    distance_km ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- 6. MAINTENANCE FUNCTIONS
-- ==========================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW  mv_job_statistics;
  REFRESH MATERIALIZED VIEW  mv_user_activity;
END;
$$ LANGUAGE plpgsql;

-- Function to update table statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
DECLARE
  table_record record;
BEGIN
  FOR table_record IN 
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE 'ANALYZE ' || quote_ident(table_record.schemaname) || '.' || quote_ident(table_record.tablename);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Clean up old notifications (older than 30 days)
  DELETE FROM public.notifications 
  WHERE created_at < CURRENT_DATE - INTERVAL '30 days' 
  AND read = TRUE;
  
  -- Clean up old messages (older than 1 year)
  DELETE FROM public.messages 
  WHERE created_at < CURRENT_DATE - INTERVAL '1 year' 
  AND read = TRUE;
  
  -- Clean up old webhook events (older than 30 days)
  DELETE FROM public.webhook_events 
  WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
  
  -- Clean up old security events (older than 90 days)
  DELETE FROM public.security_events 
  WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- 7. PERFORMANCE MONITORING VIEWS
-- ==========================================================

-- View for slow queries (DISABLED - requires pg_stat_statements extension)
-- CREATE OR REPLACE VIEW slow_queries AS
-- SELECT 
--   query,
--   calls,
--   total_time,
--   mean_time,
--   rows,
--   CASE 
--     WHEN mean_time > 1000 THEN 'CRITICAL'
--     WHEN mean_time > 500 THEN 'HIGH'
--     WHEN mean_time > 100 THEN 'MEDIUM'
--     ELSE 'LOW'
--   END as priority
-- FROM pg_stat_statements
-- WHERE mean_time > 100
-- ORDER BY mean_time DESC;

-- View for table sizes
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- View for index usage (DISABLED - requires pg_stat_user_indexes)
-- CREATE OR REPLACE VIEW index_usage AS
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch,
--   CASE 
--     WHEN idx_scan = 0 THEN 'UNUSED'
--     WHEN idx_scan < 100 THEN 'LOW'
--     WHEN idx_scan < 1000 THEN 'MEDIUM'
--     ELSE 'HIGH'
--   END as usage_level
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- ==========================================================
-- 8. COMMENTS AND DOCUMENTATION
-- ==========================================================

-- COMMENT ON FUNCTION get_slow_queries() IS 'Returns queries with mean execution time > 100ms';
-- COMMENT ON FUNCTION get_table_statistics() IS 'Returns table size and row count statistics';
-- COMMENT ON FUNCTION get_index_usage() IS 'Returns index usage statistics';
-- COMMENT ON FUNCTION get_jobs_paginated() IS 'Returns paginated jobs with filtering and location search';
-- COMMENT ON FUNCTION get_contractor_recommendations() IS 'Returns contractor recommendations for a job';
-- COMMENT ON FUNCTION refresh_materialized_views() IS 'Refreshes all materialized views';
-- COMMENT ON FUNCTION update_table_statistics() IS 'Updates table statistics for query optimizer';
COMMENT ON FUNCTION cleanup_old_data() IS 'Cleans up old data based on retention policies';

COMMENT ON MATERIALIZED VIEW mv_job_statistics IS 'Job statistics aggregated by day, status, and category';
COMMENT ON MATERIALIZED VIEW mv_user_activity IS 'User activity metrics and statistics';

-- COMMENT ON VIEW slow_queries IS 'Queries with execution time > 100ms';
COMMENT ON VIEW table_sizes IS 'Table size information';
-- COMMENT ON VIEW index_usage IS 'Index usage statistics';

COMMIT;
