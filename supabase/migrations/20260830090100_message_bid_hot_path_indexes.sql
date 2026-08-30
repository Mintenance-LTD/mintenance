-- Hot-path composite indexes for messages + bids list queries.
--
-- Audit 2026-05-24: chat history and bid list endpoints scan large row sets
-- by (job_id) + (created_at desc) or (status) without a composite index.
-- Existing indexes do not include the full ordering keys for a stable
-- newest-first message page or the created_at ordering for per-job bid lists.
--
-- These are CREATE INDEX CONCURRENTLY so they can be applied during
-- business hours on a live table without taking an ACCESS EXCLUSIVE lock.
-- IF NOT EXISTS makes re-application a no-op.

-- Backing index for GET /api/messages/threads/[id]/messages
-- (newest-first paginated reads + read-marker update by (job_id, receiver_id))
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_job_created_desc_id
  ON public.messages (job_id, created_at DESC, id DESC);

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
