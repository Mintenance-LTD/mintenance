-- Audit P0 (2026-04-23): persistent `contractor_locations = 0` in production.
--
-- Root cause: both JobContextLocationService.updateContractorLocation and
-- BackgroundLocationTask used `.upsert(..., { onConflict: 'contractor_id,job_id' })`
-- (and earlier `'contractor_id'`) but the table had NO unique constraint
-- backing either onConflict target. PostgREST returns 42P10 for every
-- write, so foreground + background tracking have been silent-failing
-- since the feature shipped.
--
-- Fix: add a partial unique index on (contractor_id, job_id) for the
-- active rows. This matches the upsert callsite the mobile services are
-- already using. It is partial (`WHERE is_active = true`) so an inactive
-- historical row does not block a new active session for the same job
-- pair after stop/restart cycles.
--
-- Note: `job_id` is nullable. With a regular UNIQUE index, NULL values
-- are distinct so multiple `(contractor_id, NULL)` rows are allowed —
-- intentional, because the "available" context (no specific job) is
-- multi-row by design. The targeted use-case here is the per-job upsert
-- which always passes a non-null job_id.
CREATE UNIQUE INDEX IF NOT EXISTS contractor_locations_active_contractor_job_uidx
  ON public.contractor_locations (contractor_id, job_id)
  WHERE is_active = true;
