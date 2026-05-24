-- Hot-path composite indexes for messages + bids list queries.
--
-- Audit 2026-05-24: chat history and bid list endpoints scan large row sets
-- by (job_id) + (created_at desc) or (status) without a composite index.
-- Existing indexes:
--   messages(thread_id), messages(created_at)               — single column
--   bids(job_id), bids(status)                              — single column
-- The planner can't combine these for a typical "newest N messages on this
-- job" or "open bids on this job" query without bitmap heap scans.
--
-- These are CREATE INDEX CONCURRENTLY so they can be applied during
-- business hours on a live table without taking an ACCESS EXCLUSIVE lock.
-- Wrapped in DO blocks so re-application is a no-op (CREATE INDEX
-- CONCURRENTLY does not support IF NOT EXISTS pre-PG 9.5 — supabase is
-- newer, but the DO guard documents intent and lets us early-out on a
-- partial failure).

-- Backing index for GET /api/messages/threads/[id]/messages
-- (newest-first paginated reads + read-marker update by (job_id, receiver_id))
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_job_created_desc_id
  ON public.messages (job_id, created_at DESC, id DESC);

-- Backing index for thread-based reads (message_threads has thread_id FK)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_thread_created_desc_id
  ON public.messages (thread_id, created_at DESC, id DESC);

-- Backing index for GET /api/jobs/[id]/bids — "open bids on this job",
-- "accepted bid for this job", etc. Default ordering is newest-first so
-- include created_at DESC.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bids_job_status_created_desc
  ON public.bids (job_id, status, created_at DESC);

-- Verification queries for the operator applying this migration:
--   EXPLAIN ANALYZE SELECT id, content, created_at
--     FROM public.messages
--     WHERE job_id = '<uuid>'
--     ORDER BY created_at DESC, id DESC
--     LIMIT 51;
--   -- expect: Index Scan using idx_messages_job_created_desc_id
--
--   EXPLAIN ANALYZE SELECT id, amount, status
--     FROM public.bids
--     WHERE job_id = '<uuid>' AND status = 'pending'
--     ORDER BY created_at DESC
--     LIMIT 50;
--   -- expect: Index Scan using idx_bids_job_status_created_desc
