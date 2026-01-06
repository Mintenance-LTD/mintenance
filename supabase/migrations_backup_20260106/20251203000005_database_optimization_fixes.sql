-- Migration: Database Optimization Fixes
-- Created: 2025-12-03
-- Description: Addresses performance and consistency issues identified in database audit

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Jobs table property_id index (if column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jobs'
        AND column_name = 'property_id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
            AND tablename = 'jobs'
            AND indexname = 'idx_jobs_property_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_jobs_property_id ON jobs(property_id);
            COMMENT ON INDEX idx_jobs_property_id IS 'Optimize property-based job lookups';
        END IF;
    END IF;
END $$;

-- Job attachments uploaded_by index
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'job_attachments'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
            AND tablename = 'job_attachments'
            AND indexname = 'idx_job_attachments_uploaded_by'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_job_attachments_uploaded_by
            ON job_attachments(uploaded_by);
            COMMENT ON INDEX idx_job_attachments_uploaded_by IS 'Optimize attachment lookups by uploader';
        END IF;
    END IF;
END $$;

-- Notifications user_id index
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
            AND tablename = 'notifications'
            AND indexname = 'idx_notifications_user_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id
            ON notifications(user_id, created_at DESC)
            WHERE read = false;
            COMMENT ON INDEX idx_notifications_user_id IS 'Optimize unread notifications lookup';
        END IF;
    END IF;
END $$;

-- Contractor skills composite index
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'contractor_skills'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
            AND tablename = 'contractor_skills'
            AND indexname = 'idx_contractor_skills_lookup'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_contractor_skills_lookup
            ON contractor_skills(contractor_id, skill_name);
            COMMENT ON INDEX idx_contractor_skills_lookup IS 'Optimize skill-based contractor matching';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 2. ADD SCHEMA VERSION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum VARCHAR(64),
    execution_time_ms INTEGER,
    applied_by VARCHAR(255) DEFAULT current_user
);

COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations for version control';
COMMENT ON COLUMN schema_migrations.checksum IS 'MD5 hash of migration file for integrity checking';
COMMENT ON COLUMN schema_migrations.execution_time_ms IS 'Time taken to execute migration in milliseconds';

-- Insert this migration into tracking
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('20251203000005', 'database_optimization_fixes', NOW())
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- 3. CREATE PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- View for slow queries (requires pg_stat_statements extension)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
    ) THEN
        CREATE OR REPLACE VIEW database_slow_queries AS
        SELECT
            substring(query, 1, 100) as query_preview,
            calls,
            round(mean_exec_time::numeric, 2) as avg_time_ms,
            round(max_exec_time::numeric, 2) as max_time_ms,
            round(total_exec_time::numeric, 2) as total_time_ms,
            round((100.0 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) as percent_total_time
        FROM pg_stat_statements
        WHERE mean_exec_time > 100 -- Queries slower than 100ms
        ORDER BY mean_exec_time DESC
        LIMIT 20;

        COMMENT ON VIEW database_slow_queries IS 'Top 20 slowest queries for performance monitoring';
    END IF;
END $$;

-- View for table sizes and bloat estimation
CREATE OR REPLACE VIEW database_table_stats AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    round((pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename))::numeric * 100 /
          NULLIF(pg_total_relation_size(schemaname||'.'||tablename)::numeric, 0), 2) AS index_ratio_percent
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMENT ON VIEW database_table_stats IS 'Table size and index statistics for storage monitoring';

-- View for index usage statistics
CREATE OR REPLACE VIEW database_index_usage AS
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'RARELY USED'
        WHEN idx_scan < 1000 THEN 'OCCASIONALLY USED'
        ELSE 'FREQUENTLY USED'
    END as usage_category
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

COMMENT ON VIEW database_index_usage IS 'Index usage statistics to identify unused or underutilized indexes';

-- ============================================================================
-- 4. ADD REQUIRED_SKILLS COLUMN IF MISSING
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jobs'
        AND column_name = 'required_skills'
    ) THEN
        ALTER TABLE jobs
        ADD COLUMN required_skills TEXT[] DEFAULT ARRAY[]::TEXT[];

        COMMENT ON COLUMN jobs.required_skills IS 'Array of required skills for this job';

        -- Add GIN index for skill searching
        CREATE INDEX IF NOT EXISTS idx_jobs_required_skills
        ON jobs USING GIN(required_skills);
    END IF;
END $$;

-- ============================================================================
-- 5. CREATE ORPHANED RECORDS CLEANUP FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_records()
RETURNS TABLE (
    table_name TEXT,
    records_deleted INTEGER
) AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clean orphaned job attachments
    DELETE FROM job_attachments ja
    WHERE NOT EXISTS (
        SELECT 1 FROM jobs j WHERE j.id = ja.job_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    table_name := 'job_attachments';
    records_deleted := deleted_count;
    RETURN NEXT;

    -- Clean orphaned messages
    DELETE FROM messages m
    WHERE m.job_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM jobs j WHERE j.id = m.job_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    table_name := 'messages';
    records_deleted := deleted_count;
    RETURN NEXT;

    -- Clean orphaned notifications
    DELETE FROM notifications n
    WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.id = n.user_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    table_name := 'notifications';
    records_deleted := deleted_count;
    RETURN NEXT;

    -- Clean orphaned bids
    DELETE FROM bids b
    WHERE NOT EXISTS (
        SELECT 1 FROM jobs j WHERE j.id = b.job_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    table_name := 'bids';
    records_deleted := deleted_count;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_orphaned_records() IS 'Removes orphaned records from child tables - run periodically';

-- ============================================================================
-- 6. CREATE DATABASE HEALTH CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details JSONB
) AS $$
DECLARE
    v_count INTEGER;
    v_tables JSONB;
BEGIN
    -- Check for tables without primary keys
    check_name := 'Tables without primary keys';
    
    WITH tables_without_pk AS (
        SELECT t.table_name
        FROM information_schema.tables t
        LEFT JOIN information_schema.table_constraints tc
            ON t.table_name = tc.table_name
            AND t.table_schema = tc.table_schema
            AND tc.constraint_type = 'PRIMARY KEY'
        WHERE t.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
            AND tc.constraint_name IS NULL
    )
    SELECT COUNT(*), jsonb_agg(table_name) INTO v_count, v_tables
    FROM tables_without_pk;
    
    status := CASE WHEN COALESCE(v_count, 0) = 0 THEN 'OK' ELSE 'WARNING' END;
    details := jsonb_build_object('count', COALESCE(v_count, 0), 'tables', COALESCE(v_tables, '[]'::jsonb));
    RETURN NEXT;

    -- Check for unused indexes
    check_name := 'Unused indexes';
    
    SELECT COUNT(*), jsonb_agg(indexrelname) INTO v_count, v_tables
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
        AND idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey';
    
    status := CASE 
        WHEN COALESCE(v_count, 0) = 0 THEN 'OK'
        WHEN COALESCE(v_count, 0) < 5 THEN 'INFO'
        ELSE 'WARNING'
    END;
    details := jsonb_build_object('count', COALESCE(v_count, 0), 'indexes', COALESCE(v_tables, '[]'::jsonb));
    RETURN NEXT;

    -- Check cache hit ratio
    check_name := 'Cache hit ratio';
    SELECT INTO details
        jsonb_build_object(
            'ratio', round((sum(heap_blks_hit)::numeric / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100), 2)
        )
    FROM pg_statio_user_tables;

    SELECT INTO status
        CASE
            WHEN (details->>'ratio')::numeric > 99 THEN 'OK'
            WHEN (details->>'ratio')::numeric > 95 THEN 'INFO'
            ELSE 'WARNING'
        END;
    RETURN NEXT;

    -- Check for long-running queries
    check_name := 'Long-running queries';
    
    WITH long_queries AS (
        SELECT 
            pid,
            EXTRACT(EPOCH FROM (NOW() - query_start)) as duration,
            LEFT(query, 100) as query_preview
        FROM pg_stat_activity
        WHERE state = 'active'
            AND query_start < NOW() - INTERVAL '5 minutes'
            AND query NOT LIKE '%pg_stat_activity%'
    )
    SELECT COUNT(*), jsonb_agg(
        jsonb_build_object(
            'pid', pid,
            'duration', duration,
            'query', query_preview
        )
    ) INTO v_count, v_tables
    FROM long_queries;
    
    status := CASE WHEN COALESCE(v_count, 0) = 0 THEN 'OK' ELSE 'WARNING' END;
    details := jsonb_build_object('count', COALESCE(v_count, 0), 'queries', COALESCE(v_tables, '[]'::jsonb));
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_database_health() IS 'Comprehensive database health check - returns status of various database metrics';

-- ============================================================================
-- 7. ADD MISSING COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Jobs location and status for geographic queries
CREATE INDEX IF NOT EXISTS idx_jobs_location_status
ON jobs(status, created_at DESC)
WHERE location IS NOT NULL AND status = 'posted';

-- Contractor location for nearby job matching
CREATE INDEX IF NOT EXISTS idx_users_contractor_location
ON users(latitude, longitude)
WHERE role = 'contractor' AND is_available = true;

-- Escrow transactions for financial reporting
        CREATE INDEX IF NOT EXISTS idx_escrow_transactions_reporting
        ON escrow_transactions(created_at DESC, status)
        WHERE status IN ('completed', 'refunded');

-- ============================================================================
-- 8. GRANTS FOR MONITORING VIEWS
-- ============================================================================

GRANT SELECT ON database_slow_queries TO authenticated;
GRANT SELECT ON database_table_stats TO authenticated;
GRANT SELECT ON database_index_usage TO authenticated;
GRANT EXECUTE ON FUNCTION check_database_health() TO authenticated;

-- Admin-only access for cleanup function
GRANT EXECUTE ON FUNCTION cleanup_orphaned_records() TO service_role;

-- ============================================================================
-- 9. AUTOMATIC VACUUM AND ANALYZE CONFIGURATION
-- ============================================================================

-- Set more aggressive autovacuum for high-traffic tables
ALTER TABLE jobs SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE messages SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE notifications SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- ============================================================================
-- 10. VALIDATION QUERIES
-- ============================================================================

-- Run these queries to verify the migration was successful:
/*
-- Check new indexes exist
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_jobs_property_id',
    'idx_job_attachments_uploaded_by',
    'idx_notifications_user_id',
    'idx_contractor_skills_lookup'
);

-- Check schema migrations table
SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;

-- Test health check function
SELECT * FROM check_database_health();

-- View table statistics
SELECT * FROM database_table_stats LIMIT 10;
*/