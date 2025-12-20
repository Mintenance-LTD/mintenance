# Database Fix Implementation Guide

## Quick Start - Apply Fixes Now

### Step 1: Apply the Migration
Run the new migration to fix immediate issues:

```bash
# Using Supabase CLI
npx supabase migration up

# Or manually in SQL editor
# Copy contents of: supabase/migrations/20251203000005_database_optimization_fixes.sql
# Execute in Supabase SQL Editor
```

### Step 2: Verify Migration Success
Run these verification queries in Supabase SQL Editor:

```sql
-- Check if new indexes were created
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_jobs_property_id',
    'idx_job_attachments_uploaded_by',
    'idx_notifications_user_id',
    'idx_contractor_skills_lookup'
)
ORDER BY tablename, indexname;

-- Check schema version tracking
SELECT * FROM schema_migrations
ORDER BY applied_at DESC
LIMIT 5;

-- Run health check
SELECT * FROM check_database_health();
```

### Step 3: Monitor Performance
Check the new monitoring views:

```sql
-- View slow queries (if pg_stat_statements is enabled)
SELECT * FROM database_slow_queries;

-- Check table sizes and bloat
SELECT * FROM database_table_stats
WHERE total_size != '0 bytes'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Check index usage
SELECT * FROM database_index_usage
WHERE usage_category IN ('UNUSED', 'RARELY USED')
LIMIT 20;
```

## Code Changes Required

### 1. Add Transaction Support (Priority: HIGH)
Update critical operations to use transactions:

```typescript
// Example: apps/web/lib/services/payment/EscrowService.ts
static async releaseEscrowPayment(transactionId: string): Promise<void> {
  const { data, error } = await supabase.rpc('release_escrow_with_transaction', {
    p_transaction_id: transactionId
  });

  if (error) throw error;
  return data;
}
```

Create the stored procedure:
```sql
CREATE OR REPLACE FUNCTION release_escrow_with_transaction(p_transaction_id UUID)
RETURNS void AS $$
BEGIN
  -- Start transaction
  UPDATE escrow_transactions
  SET status = 'releasing', updated_at = NOW()
  WHERE id = p_transaction_id AND status = 'held';

  -- Update job status
  UPDATE jobs
  SET status = 'completed', updated_at = NOW()
  WHERE id = (SELECT job_id FROM escrow_transactions WHERE id = p_transaction_id);

  -- Create payment record
  INSERT INTO payments (escrow_transaction_id, status, amount, created_at)
  SELECT id, 'completed', amount, NOW()
  FROM escrow_transactions
  WHERE id = p_transaction_id;

  -- Mark as released
  UPDATE escrow_transactions
  SET status = 'released', released_at = NOW()
  WHERE id = p_transaction_id;

  -- All operations succeed or all fail
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Fix N+1 Queries (Priority: MEDIUM)

**Current Issue (jobs/route.ts):**
```typescript
// BAD: Separate query for attachments
const { data } = await serverSupabase
  .from('job_attachments')
  .select('job_id, file_url, file_type')
  .in('job_id', jobIds);
```

**Fixed Version:**
```typescript
// GOOD: Include attachments in initial query
const jobSelectFields = `
  id,
  title,
  description,
  status,
  homeowner:users!homeowner_id(id,first_name,last_name,email),
  attachments:job_attachments(file_url,file_type),
  bids(count)
`.trim();

const { data, error } = await serverSupabase
  .from('jobs')
  .select(jobSelectFields)
  .eq('status', 'posted')
  .order('created_at', { ascending: false });
```

### 3. Add Query Caching (Priority: MEDIUM)

Create a caching wrapper:
```typescript
// lib/cache/query-cache.ts
import { Redis } from '@upstash/redis';

export class QueryCache {
  private static redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  });

  static async cached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 60
  ): Promise<T> {
    // Try cache first
    const cached = await this.redis.get<T>(key);
    if (cached) return cached;

    // Fetch and cache
    const data = await fetcher();
    await this.redis.set(key, data, { ex: ttl });
    return data;
  }
}

// Usage example
const contractors = await QueryCache.cached(
  `contractors:${area}:${Date.now() / 60000 | 0}`, // 1 minute cache
  async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'contractor')
      .eq('service_area', area);
    return data;
  },
  60 // TTL in seconds
);
```

## Maintenance Schedule

### Daily Tasks
- Monitor slow query view
- Check for failed jobs in error logs
- Review security events

### Weekly Tasks
- Run orphaned record cleanup:
  ```sql
  SELECT * FROM cleanup_orphaned_records();
  ```
- Check index usage and remove unused indexes
- Review table bloat statistics

### Monthly Tasks
- Full database health check
- Performance baseline comparison
- Schema migration audit

## Monitoring Queries

### Real-time Performance Check
```sql
-- Current active connections
SELECT count(*) as connection_count
FROM pg_stat_activity
WHERE state = 'active';

-- Cache hit ratio (should be > 99%)
SELECT
  round(100.0 * sum(heap_blks_hit) /
    (sum(heap_blks_hit) + sum(heap_blks_read)), 2) as cache_hit_ratio
FROM pg_statio_user_tables;

-- Long-running queries
SELECT
  pid,
  now() - query_start as duration,
  state,
  substring(query, 1, 100) as query_preview
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < now() - interval '1 minute'
ORDER BY duration DESC;
```

### Database Size Monitoring
```sql
-- Total database size
SELECT pg_size_pretty(pg_database_size(current_database())) as total_size;

-- Top 10 largest tables
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

## Rollback Plan

If issues occur after applying migrations:

### Step 1: Create Rollback Migration
```sql
-- supabase/migrations/20251203000006_rollback_optimization_fixes.sql

-- Drop new indexes
DROP INDEX IF EXISTS idx_jobs_property_id;
DROP INDEX IF EXISTS idx_job_attachments_uploaded_by;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_contractor_skills_lookup;

-- Drop monitoring views
DROP VIEW IF EXISTS database_slow_queries;
DROP VIEW IF EXISTS database_table_stats;
DROP VIEW IF EXISTS database_index_usage;

-- Drop functions
DROP FUNCTION IF EXISTS check_database_health();
DROP FUNCTION IF EXISTS cleanup_orphaned_records();

-- Drop schema migrations table (if desired)
DROP TABLE IF EXISTS schema_migrations;
```

### Step 2: Apply Rollback
```bash
npx supabase migration up
```

## Testing Checklist

After applying fixes, test:

- [ ] User registration still works
- [ ] Job creation succeeds
- [ ] Bid submission works
- [ ] Message sending functions
- [ ] Payment processing completes
- [ ] Search functionality performs well
- [ ] Dashboard loads quickly
- [ ] No new errors in logs

## Support

If you encounter issues:

1. Check Supabase logs for errors
2. Run `SELECT * FROM check_database_health()`
3. Review slow query log
4. Check application error logs
5. Verify all migrations applied: `SELECT * FROM schema_migrations`

## Next Steps

1. **Immediate**: Apply migration and verify
2. **This Week**: Implement transaction support in critical paths
3. **This Month**: Add query caching layer
4. **Ongoing**: Monitor and optimize based on metrics