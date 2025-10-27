-- Verify that our performance indexes were successfully created
-- Run this in your Supabase SQL Editor to check

-- Check if our performance indexes exist
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_%' 
    AND schemaname = 'public'
    AND indexname IN (
        'idx_jobs_status',
        'idx_jobs_created_at',
        'idx_jobs_homeowner_contractor',
        'idx_messages_job_id',
        'idx_messages_created_at',
        'idx_escrow_transactions_job_id',
        'idx_escrow_transactions_status',
        'idx_refresh_tokens_user_lookup',
        'idx_refresh_tokens_expires_at',
        'idx_users_role',
        'idx_users_created_at',
        'idx_contractors_verified',
        'idx_contractors_service_areas',
        'idx_bids_job_id',
        'idx_bids_contractor_id',
        'idx_bids_created_at',
        'idx_reviews_contractor_id',
        'idx_reviews_job_id',
        'idx_jobs_homeowner_status',
        'idx_jobs_contractor_status',
        'idx_escrow_job_status',
        'idx_messages_thread',
        'idx_refresh_tokens_active',
        'idx_users_role_active',
        'idx_contractors_verified_rating',
        'idx_contractors_service_areas_gin',
        'idx_jobs_category_status',
        'idx_payments_status_created'
    )
ORDER BY indexname;

-- Count total indexes created
SELECT COUNT(*) as total_performance_indexes
FROM pg_indexes 
WHERE indexname LIKE 'idx_%' 
    AND schemaname = 'public';
