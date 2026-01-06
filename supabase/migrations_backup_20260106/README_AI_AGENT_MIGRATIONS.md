# AI Agent Database Migrations

## Overview

This document provides comprehensive information about the database migrations created for the AI agent systems in the Mintenance application.

## Migration Files Created

### 1. Search Analytics Migration
**File:** `20250202120000_add_search_analytics.sql`

**Tables Created:**
- `search_analytics` - Tracks all user searches with filters, results, and engagement
- `search_suggestions` - Auto-generated and curated search suggestions
- `trending_searches` (Materialized View) - Aggregated trending searches from last 7 days

**Key Features:**
- Full-text search tracking with zero-results monitoring
- Click-through rate analysis (first click position, time to click)
- Trending search detection with configurable thresholds
- Session-based search refinement tracking
- Optional vector embeddings for semantic search analysis

**Functions:**
- `refresh_trending_searches()` - Refreshes the materialized view
- `get_trending_searches_by_category()` - Retrieves trending searches by category/location
- `log_search_and_update_suggestions()` - Logs search and updates suggestions

**Use Cases:**
- Search optimization and autocomplete
- Understanding user search intent
- Identifying content gaps (zero-result searches)
- Improving search relevance

---

### 2. Vector Search Support Migration
**File:** `20250202120100_add_vector_search_support.sql`

**Tables Created:**
- `embedding_generation_queue` - Queue for async embedding generation
- `embedding_statistics` - Daily statistics about embedding generation and usage

**Schema Changes:**
- Added `embedding vector(1536)` column to `jobs` table
- Added `embedding vector(1536)` column to `users` table (for contractors)
- Added tracking columns: `embedding_updated_at`, `embedding_model`

**Extensions Enabled:**
- `pgvector` - Vector similarity search extension
- `pg_trgm` - Trigram matching for fuzzy text search

**Indexes:**
- HNSW indexes on job and contractor embeddings for fast approximate nearest neighbor search
- Optimized for cosine similarity queries

**Functions:**
- `search_jobs_semantic()` - Semantic search for jobs using vector embeddings
- `search_contractors_semantic()` - Semantic search for contractors
- `find_similar_jobs()` - Find similar jobs based on embeddings
- `find_similar_contractors()` - Find similar contractors
- `queue_job_embedding()` - Queue job for embedding generation
- `queue_contractor_embedding()` - Queue contractor for embedding generation

**Use Cases:**
- Natural language job search
- Intelligent job recommendations
- Contractor matching based on profile similarity
- "Find similar" features

---

### 3. Notification Engagement Tracking Migration
**File:** `20250202120200_add_notification_engagement_tracking.sql`

**Tables Created:**
- `user_notification_engagement_profile` - Learned engagement patterns per user
- `notification_ab_tests` - A/B tests for notification optimization
- `notification_engagement_analytics` (Materialized View) - Aggregated metrics

**Schema Enhancements:**
- Enhanced existing `notification_engagement` table with:
  - Device type tracking
  - Channel tracking (in_app, email, sms, push)
  - Time-of-day and day-of-week analysis
  - Action completion tracking
  - Batch notification support

**Key Features:**
- Optimal send time learning per user
- Channel preference detection
- Device engagement analysis
- A/B testing framework for notifications
- Statistical significance calculation

**Functions:**
- `refresh_notification_engagement_analytics()` - Refreshes analytics view
- `analyze_user_notification_engagement()` - Updates user engagement profile

**Triggers:**
- `populate_notification_engagement_time_fields()` - Auto-populates time fields

**Use Cases:**
- Personalized notification timing
- Channel preference optimization
- Notification fatigue prevention
- A/B testing notification strategies

---

### 4. Job Status Transitions Migration
**File:** `20250202120300_add_job_status_transitions.sql`

**Tables Created:**
- `job_status_transitions` - Complete audit trail of status changes
- `job_status_predictions` - ML predictions for next status and timing
- `job_automation_history` - History of automated agent actions
- `job_state_machine_rules` - Configurable state transition rules

**Key Features:**
- Full status transition audit trail
- Automated vs manual transition tracking
- Predictive job status modeling
- State machine rule validation
- Agent decision logging with user feedback

**Default Rules Inserted:**
- `posted → assigned` (homeowner assigns contractor)
- `assigned → in_progress` (contractor starts work)
- `in_progress → completed` (can be automated)
- `posted → cancelled` (can be automated after 7 days)
- `assigned → cancelled` (manual only)

**Functions:**
- `log_job_status_transition()` - Logs transitions with validation
- `get_job_transition_history()` - Retrieves transition history
- `validate_job_status_transition()` - Validates transitions against rules
- `predict_next_job_status()` - Predicts next status (rule-based, ready for ML)

**Triggers:**
- `auto_log_job_status_change()` - Automatically logs status changes

**Use Cases:**
- Job lifecycle tracking
- Automation eligibility detection
- Status prediction and scheduling
- Agent performance analysis
- User behavior learning

---

### 5. Comprehensive Performance Indexes Migration
**File:** `20250202120400_add_comprehensive_performance_indexes.sql`

**Indexes Added:** 50+ performance indexes across all tables

**Categories:**

**Agent Decision Indexes:**
- Composite indexes for performance analytics
- Learning query optimization
- User feedback analysis

**Job Table Indexes:**
- Status + category + budget composite
- Location fuzzy matching (trigram)
- Contractor and homeowner dashboard queries
- Active jobs partial index

**Bid Table Indexes:**
- Pricing analysis and competitiveness
- Contractor bid history
- Accepted bids for analytics

**User Table Indexes:**
- Contractor search and discovery
- Location-based search (trigram)
- Verification status queries

**Notification & Message Indexes:**
- Unread notification counts
- Conversation queries
- Full-text search on messages

**Escrow Payment Indexes:**
- Auto-release queries
- Photo verification status
- Contractor payout tracking

**Specialized Indexes:**
- Risk prediction analysis
- Pricing analytics queries
- Learning model performance
- AB test tracking
- Building surveyor assessments

**Use Cases:**
- Sub-second query performance for AI agents
- Dashboard load time optimization
- Real-time search and filtering
- Analytics query acceleration

---

## Existing Tables (Not Created in This Migration Set)

The following tables were already created in previous migrations:

### Agent Infrastructure (from `20250131000013_add_automation_preferences.sql`)
- `automation_preferences` - User automation settings
- `agent_decisions` - Agent decision logging (general purpose)
- `risk_predictions` - Risk predictions for jobs
- `user_behavior_profiles` - Learned user behavior patterns
- `user_pair_interactions` - Homeowner-contractor interaction history
- `learning_model_versions` - ML model version tracking

### Notification Agent (from `20250201000001_add_notification_agent_tables.sql`)
- `notification_engagement` - Basic engagement tracking (enhanced by migration 3)
- `notification_preferences` - User notification preferences
- `notification_queue` - Priority queue for notification scheduling

### Escrow Release Agent (from `20250201000002_add_escrow_release_agent_tables.sql`)
- `escrow_photo_verification` - Photo verification for escrow release
- `escrow_auto_release_rules` - Configurable auto-release rules

### Pricing Agent (from `20250201000003_add_pricing_agent_tables.sql`)
- `pricing_analytics` - Market pricing analytics
- `pricing_recommendations` - AI-generated pricing recommendations
- `contractor_pricing_patterns` - Learned contractor pricing behavior

### Building Surveyor (from `20250201000004_add_building_surveyor_tables.sql`)
- `building_assessments` - AI building condition assessments
- `assessment_corrections` - Human corrections for learning
- Plus various AB testing and YOLO model tables

### AB Testing (from multiple migrations)
- `ab_critic_fnr_tracking` - False Negative Rate tracking per stratum
- `ab_test_assignments` - AB test user assignments
- `ab_test_metrics` - AB test performance metrics

---

## Dependencies

### Required Extensions
- `pgvector` (for vector similarity search)
- `pg_trgm` (for trigram fuzzy matching)
- Standard PostgreSQL (14+)

### Required Tables (must exist before applying migrations)
- `users`
- `jobs`
- `bids`
- `notifications`
- `messages`
- `escrow_payments`
- `contractor_skills`

---

## Application Order

Migrations should be applied in this order:

1. `20250202120000_add_search_analytics.sql`
2. `20250202120100_add_vector_search_support.sql`
3. `20250202120200_add_notification_engagement_tracking.sql`
4. `20250202120300_add_job_status_transitions.sql`
5. `20250202120400_add_comprehensive_performance_indexes.sql`

---

## Verification Queries

### Check Search Analytics
```sql
-- Verify search_analytics table exists with data
SELECT COUNT(*) FROM search_analytics;

-- Check trending searches view
SELECT * FROM trending_searches LIMIT 10;

-- Verify search suggestions
SELECT suggestion_text, usage_count, acceptance_rate
FROM search_suggestions
WHERE is_active = TRUE
ORDER BY usage_count DESC
LIMIT 10;
```

### Check Vector Search
```sql
-- Verify pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check embedding columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'jobs' AND column_name = 'embedding';

-- Test semantic search (requires embeddings to be generated first)
SELECT COUNT(*) FROM jobs WHERE embedding IS NOT NULL;
```

### Check Notification Engagement
```sql
-- Verify engagement analytics
SELECT notification_type, COUNT(*) as total, AVG(open_rate) as avg_open_rate
FROM notification_engagement_analytics
GROUP BY notification_type;

-- Check user engagement profiles
SELECT COUNT(*) FROM user_notification_engagement_profile;

-- Verify enhanced columns
SELECT device_type, channel, COUNT(*)
FROM notification_engagement
WHERE device_type IS NOT NULL
GROUP BY device_type, channel;
```

### Check Job Status Transitions
```sql
-- Verify transition logging
SELECT COUNT(*) FROM job_status_transitions;

-- Check state machine rules
SELECT rule_name, from_status, to_status, can_be_automated
FROM job_state_machine_rules
WHERE is_active = TRUE;

-- Test transition validation
SELECT validate_job_status_transition('posted', 'assigned', 'homeowner');

-- Check automation history
SELECT automation_type, COUNT(*) as count,
       AVG(CASE WHEN was_successful THEN 1 ELSE 0 END) as success_rate
FROM job_automation_history
GROUP BY automation_type;
```

### Check Performance Indexes
```sql
-- List all indexes on agent_decisions
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'agent_decisions';

-- Check vector indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname LIKE '%embedding%';

-- Verify trigram extension
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';

-- Check partial indexes
SELECT indexname, pg_get_indexdef(indexrelid)
FROM pg_indexes
WHERE pg_get_indexdef(indexrelid) LIKE '%WHERE%';
```

---

## Performance Considerations

### Materialized Views
Materialized views need periodic refresh:
```sql
-- Refresh trending searches (run hourly)
SELECT refresh_trending_searches();

-- Refresh notification analytics (run daily)
SELECT refresh_notification_engagement_analytics();
```

Consider setting up scheduled jobs (pg_cron) for automatic refresh.

### Embedding Generation
Vector embeddings require external API calls (OpenAI). Process the queue asynchronously:
```sql
-- Get pending embedding jobs
SELECT * FROM embedding_generation_queue
WHERE status = 'pending'
ORDER BY priority DESC, created_at
LIMIT 100;
```

### Index Maintenance
Large tables may need periodic index maintenance:
```sql
-- Rebuild indexes (run during low-traffic periods)
REINDEX TABLE CONCURRENTLY search_analytics;
REINDEX TABLE CONCURRENTLY job_status_transitions;
REINDEX TABLE CONCURRENTLY notification_engagement;
```

---

## Security (RLS Policies)

All tables have Row Level Security enabled with appropriate policies:

- **Service Role:** Full access to all tables for agent operations
- **Users:** Can view their own data (searches, notifications, jobs, etc.)
- **Admins:** Enhanced access for analytics and management
- **Public Views:** Some aggregated data (trending searches, state machine rules) is publicly readable

---

## Integration Guide

### For Application Code

**1. Search Analytics Integration:**
```typescript
import { serverSupabase } from '@/lib/api/supabaseServer';

// Log a search
const searchId = await serverSupabase.rpc('log_search_and_update_suggestions', {
  p_search_query: 'plumber in London',
  p_user_id: userId,
  p_search_type: 'contractors',
  p_filters: { category: 'plumbing', location: 'London' },
  p_session_id: sessionId
});
```

**2. Vector Search Integration:**
```typescript
// Queue job for embedding generation
await serverSupabase.rpc('queue_job_embedding', { p_job_id: jobId });

// Perform semantic search (after embeddings generated)
const { data } = await serverSupabase.rpc('search_jobs_semantic', {
  query_embedding: userQueryEmbedding,
  category_filter: 'electrical',
  match_limit: 20,
  similarity_threshold: 0.7
});
```

**3. Notification Engagement:**
```typescript
// Analyze user engagement (run periodically)
await serverSupabase.rpc('analyze_user_notification_engagement', {
  p_user_id: userId
});

// Get optimal send time for user
const { data: profile } = await serverSupabase
  .from('user_notification_engagement_profile')
  .select('best_send_hour, preferred_channel')
  .eq('user_id', userId)
  .single();
```

**4. Job Status Transitions:**
```typescript
// Log a status transition
await serverSupabase.rpc('log_job_status_transition', {
  p_job_id: jobId,
  p_from_status: 'posted',
  p_to_status: 'assigned',
  p_triggered_by_user_id: userId,
  p_trigger_reason: 'Homeowner selected contractor'
});

// Get transition history
const { data: history } = await serverSupabase.rpc('get_job_transition_history', {
  p_job_id: jobId
});
```

---

## Monitoring & Observability

### Key Metrics to Track

**Search Analytics:**
- Daily search volume
- Zero-result search rate
- Click-through rate
- Top trending searches

**Vector Search:**
- Embedding generation queue length
- Average similarity scores
- Search latency

**Notification Engagement:**
- Open rates by type/channel
- Optimal send times distribution
- A/B test performance

**Job Status:**
- Automation success rate
- Prediction accuracy
- Manual override frequency

---

## Rollback Procedures

If you need to rollback these migrations:

```sql
-- Rollback in reverse order
DROP INDEX IF EXISTS idx_agent_decisions_agent_outcome CASCADE;
-- ... (drop all indexes from migration 5)

DROP TABLE IF EXISTS job_state_machine_rules CASCADE;
DROP TABLE IF EXISTS job_automation_history CASCADE;
DROP TABLE IF EXISTS job_status_predictions CASCADE;
DROP TABLE IF EXISTS job_status_transitions CASCADE;

DROP TABLE IF EXISTS notification_ab_tests CASCADE;
DROP TABLE IF EXISTS user_notification_engagement_profile CASCADE;
DROP MATERIALIZED VIEW IF EXISTS notification_engagement_analytics CASCADE;

DROP TABLE IF EXISTS embedding_statistics CASCADE;
DROP TABLE IF EXISTS embedding_generation_queue CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS embedding CASCADE;
ALTER TABLE jobs DROP COLUMN IF EXISTS embedding CASCADE;

DROP TABLE IF EXISTS search_suggestions CASCADE;
DROP MATERIALIZED VIEW IF EXISTS trending_searches CASCADE;
DROP TABLE IF EXISTS search_analytics CASCADE;
```

**Warning:** Rollback will result in data loss. Backup before rollback.

---

## Future Enhancements

### Planned Features
1. **Real-time Embedding Generation** - Webhook-based embedding generation on entity creation
2. **Advanced ML Models** - Replace rule-based predictions with trained models
3. **Multi-language Search** - Support for non-English search queries
4. **Recommendation Engine** - Collaborative filtering for job/contractor recommendations
5. **Anomaly Detection** - AI-based detection of unusual patterns in agent decisions

### Schema Evolution
- Consider partitioning large tables (search_analytics, job_status_transitions) by date
- Add more materialized views for common analytics queries
- Implement time-series optimizations for trending data

---

## Support & Troubleshooting

### Common Issues

**Issue: Vector search not working**
- Ensure pgvector extension is installed
- Verify embeddings have been generated (check `embedding IS NOT NULL`)
- Confirm indexes exist (`\di *embedding*` in psql)

**Issue: Slow search queries**
- Check if indexes are being used (`EXPLAIN ANALYZE`)
- Consider refreshing materialized views
- Verify table statistics are up to date (`ANALYZE table_name`)

**Issue: Migration fails**
- Check dependencies (required tables and extensions)
- Verify user has necessary permissions
- Review migration logs for specific errors

---

## Version History

- **v1.0.0** (2025-02-02) - Initial AI agent migrations
  - Search analytics
  - Vector search support
  - Enhanced notification engagement
  - Job status transitions
  - Performance indexes

---

## Contributors

Generated by Claude Code AI Assistant for the Mintenance UK platform.

For questions or issues, please contact the development team.
