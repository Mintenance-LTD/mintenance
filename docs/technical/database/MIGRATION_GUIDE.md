# Database Migration Guide for Mintenance

## Overview
This guide helps you apply the refresh token cleanup migration and manage database migrations safely.

## Prerequisites
- Supabase CLI installed (`npm install -g supabase`)
- Supabase project configured
- Database access credentials

## Step 1: Check Migration Status

### Using Supabase CLI:
```bash
# Check current migration status
supabase migration list

# Check database status
supabase status
```

### Using SQL directly:
```sql
-- Check if migrations table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'migrations';

-- Check applied migrations
SELECT filename, applied_at 
FROM migrations 
ORDER BY applied_at DESC;
```

## Step 2: Apply Refresh Token Cleanup Migration

The migration file `20250115000003_enhanced_refresh_token_cleanup.sql` is already created and includes:

### What it does:
1. **Enhanced cleanup function** with better TTL management
2. **Cleanup logging table** for monitoring
3. **Automatic scheduling** with pg_cron (if available)
4. **Better error handling** and statistics

### Apply the migration:

#### Option A: Using Supabase CLI (Recommended)
```bash
# Apply all pending migrations
supabase db push

# Or apply specific migration
supabase migration up --target 20250115000003
```

#### Option B: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the migration SQL
4. Execute the query

#### Option C: Using psql directly
```bash
# Connect to your database
psql "postgresql://postgres:[password]@[host]:5432/postgres"

# Apply migration
\i supabase/migrations/20250115000003_enhanced_refresh_token_cleanup.sql
```

## Step 3: Verify Migration Applied

### Check migration was applied:
```sql
-- Verify cleanup function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%cleanup%';

-- Check cleanup logs table
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'token_cleanup_logs';

-- Test cleanup function
SELECT cleanup_expired_refresh_tokens_with_logging();
```

### Check pg_cron scheduling:
```sql
-- Check if pg_cron is available
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check scheduled jobs
SELECT * FROM cron.job WHERE jobname = 'cleanup-refresh-tokens';
```

## Step 4: Test Cleanup Function

### Manual test:
```sql
-- Insert test expired tokens
INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
VALUES 
  ('test-user-1', 'expired-hash-1', NOW() - INTERVAL '8 days'),
  ('test-user-2', 'expired-hash-2', NOW() - INTERVAL '10 days');

-- Run cleanup
SELECT cleanup_expired_refresh_tokens_with_logging();

-- Check cleanup logs
SELECT * FROM token_cleanup_logs ORDER BY cleanup_date DESC LIMIT 5;
```

## Step 5: Monitor Cleanup Performance

### Check cleanup statistics:
```sql
-- Recent cleanup operations
SELECT 
  cleanup_date,
  deleted_count,
  message,
  execution_time_ms
FROM token_cleanup_logs 
ORDER BY cleanup_date DESC 
LIMIT 10;

-- Token count over time
SELECT 
  DATE(created_at) as date,
  COUNT(*) as tokens_created
FROM refresh_tokens 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Troubleshooting

### Common Issues:

1. **Migration fails with permission error**
   ```sql
   -- Grant necessary permissions
   GRANT CREATE ON SCHEMA public TO postgres;
   GRANT USAGE ON SCHEMA public TO postgres;
   ```

2. **pg_cron not available**
   ```sql
   -- Check if extension can be installed
   SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';
   
   -- Install if available
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

3. **Cleanup function not working**
   ```sql
   -- Check function exists
   \df cleanup_expired_refresh_tokens*
   
   -- Test with verbose output
   SELECT cleanup_expired_refresh_tokens();
   ```

### Manual Cleanup (if needed):
```sql
-- Manual cleanup of expired tokens
DELETE FROM refresh_tokens 
WHERE expires_at < NOW() - INTERVAL '7 days';

-- Manual cleanup of revoked tokens
DELETE FROM refresh_tokens 
WHERE revoked_at IS NOT NULL 
AND revoked_at < NOW() - INTERVAL '30 days';
```

## Step 6: Set Up Monitoring

### Create monitoring dashboard query:
```sql
-- Token cleanup monitoring view
CREATE OR REPLACE VIEW token_cleanup_monitoring AS
SELECT 
  DATE(cleanup_date) as cleanup_day,
  COUNT(*) as cleanup_runs,
  SUM(deleted_count) as total_deleted,
  AVG(execution_time_ms) as avg_execution_time,
  MAX(execution_time_ms) as max_execution_time
FROM token_cleanup_logs 
WHERE cleanup_date > NOW() - INTERVAL '30 days'
GROUP BY DATE(cleanup_date)
ORDER BY cleanup_day DESC;
```

### Set up alerts:
```sql
-- Alert if cleanup hasn't run in 2 days
SELECT 
  CASE 
    WHEN MAX(cleanup_date) < NOW() - INTERVAL '2 days' 
    THEN 'ALERT: Token cleanup not running'
    ELSE 'OK: Token cleanup running normally'
  END as status
FROM token_cleanup_logs;
```

## Rollback (if needed)

### Rollback migration:
```sql
-- Drop cleanup function
DROP FUNCTION IF EXISTS cleanup_expired_refresh_tokens();
DROP FUNCTION IF EXISTS cleanup_expired_refresh_tokens_with_logging();

-- Drop cleanup logs table
DROP TABLE IF EXISTS token_cleanup_logs;

-- Remove cron job (if exists)
SELECT cron.unschedule('cleanup-refresh-tokens');
```

## Next Steps

After migration is applied:
1. Monitor cleanup logs for 1 week
2. Verify tokens are being cleaned up automatically
3. Set up alerts for cleanup failures
4. Document cleanup performance metrics
5. Consider adjusting cleanup intervals if needed

## Support

- **Supabase Documentation**: https://supabase.com/docs/guides/database/migrations
- **pg_cron Documentation**: https://github.com/citusdata/pg_cron
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
