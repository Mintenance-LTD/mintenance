-- Data Archival Strategy (Issue 58)
-- Archives completed/cancelled jobs older than 12 months to reduce table bloat
-- and improve query performance on active data.

-- ============================================================
-- 1. Archive schema
-- ============================================================
CREATE SCHEMA IF NOT EXISTS archive;

-- ============================================================
-- 2. Archive tables (mirror structure of source tables)
-- ============================================================

-- Archived jobs
CREATE TABLE IF NOT EXISTS archive.jobs (
  LIKE public.jobs INCLUDING ALL
);

-- Archived bids
CREATE TABLE IF NOT EXISTS archive.bids (
  LIKE public.bids INCLUDING ALL
);

-- Archived messages
CREATE TABLE IF NOT EXISTS archive.messages (
  LIKE public.messages INCLUDING ALL
);

-- Add archival metadata columns
DO $$ BEGIN
  ALTER TABLE archive.jobs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE archive.bids ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE archive.messages ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- 3. Archival function
-- ============================================================
CREATE OR REPLACE FUNCTION archive.archive_old_records(
  months_threshold INTEGER DEFAULT 12,
  batch_size INTEGER DEFAULT 500
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, archive
AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  jobs_archived INTEGER := 0;
  bids_archived INTEGER := 0;
  messages_archived INTEGER := 0;
  archived_job_ids UUID[];
BEGIN
  cutoff_date := NOW() - (months_threshold || ' months')::INTERVAL;

  -- 1. Find jobs to archive (completed or cancelled, older than threshold)
  SELECT ARRAY_AGG(id) INTO archived_job_ids
  FROM (
    SELECT id
    FROM public.jobs
    WHERE status IN ('completed', 'cancelled')
      AND updated_at < cutoff_date
    ORDER BY updated_at ASC
    LIMIT batch_size
  ) sub;

  -- Exit early if nothing to archive
  IF archived_job_ids IS NULL OR array_length(archived_job_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'jobs_archived', 0,
      'bids_archived', 0,
      'messages_archived', 0,
      'cutoff_date', cutoff_date
    );
  END IF;

  -- 2. Archive messages for these jobs
  WITH moved_messages AS (
    DELETE FROM public.messages
    WHERE job_id = ANY(archived_job_ids)
    RETURNING *
  )
  INSERT INTO archive.messages
  SELECT *, NOW() AS archived_at FROM moved_messages;

  GET DIAGNOSTICS messages_archived = ROW_COUNT;

  -- 3. Archive bids for these jobs
  WITH moved_bids AS (
    DELETE FROM public.bids
    WHERE job_id = ANY(archived_job_ids)
    RETURNING *
  )
  INSERT INTO archive.bids
  SELECT *, NOW() AS archived_at FROM moved_bids;

  GET DIAGNOSTICS bids_archived = ROW_COUNT;

  -- 4. Archive the jobs themselves
  WITH moved_jobs AS (
    DELETE FROM public.jobs
    WHERE id = ANY(archived_job_ids)
    RETURNING *
  )
  INSERT INTO archive.jobs
  SELECT *, NOW() AS archived_at FROM moved_jobs;

  GET DIAGNOSTICS jobs_archived = ROW_COUNT;

  RETURN jsonb_build_object(
    'jobs_archived', jobs_archived,
    'bids_archived', bids_archived,
    'messages_archived', messages_archived,
    'cutoff_date', cutoff_date,
    'batch_size', batch_size
  );
END;
$$;

-- ============================================================
-- 4. Restore function (in case of accidental archival)
-- ============================================================
CREATE OR REPLACE FUNCTION archive.restore_job(job_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, archive
AS $$
BEGIN
  -- Restore job
  INSERT INTO public.jobs
  SELECT id, homeowner_id, title, description, category, status,
         budget_min, budget_max, urgency, location, images, metadata,
         created_at, updated_at, published_at, completed_at
  FROM archive.jobs WHERE id = job_uuid;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Restore bids
  INSERT INTO public.bids
  SELECT id, job_id, contractor_id, amount, message, status,
         estimated_duration_days, materials_included, warranty_months,
         created_at, updated_at
  FROM archive.bids WHERE job_id = job_uuid;

  -- Restore messages
  INSERT INTO public.messages
  SELECT id, job_id, sender_id, content, created_at, updated_at, read_at
  FROM archive.messages WHERE job_id = job_uuid;

  -- Clean up archive
  DELETE FROM archive.messages WHERE job_id = job_uuid;
  DELETE FROM archive.bids WHERE job_id = job_uuid;
  DELETE FROM archive.jobs WHERE id = job_uuid;

  RETURN TRUE;
END;
$$;

-- ============================================================
-- 5. Archive stats view
-- ============================================================
CREATE OR REPLACE VIEW archive.stats AS
SELECT
  (SELECT COUNT(*) FROM archive.jobs) AS archived_jobs,
  (SELECT COUNT(*) FROM archive.bids) AS archived_bids,
  (SELECT COUNT(*) FROM archive.messages) AS archived_messages,
  (SELECT COUNT(*) FROM public.jobs WHERE status IN ('completed', 'cancelled')
    AND updated_at < NOW() - INTERVAL '12 months') AS eligible_for_archival;

-- ============================================================
-- 6. Index for archive lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_archive_jobs_archived_at ON archive.jobs(archived_at);
CREATE INDEX IF NOT EXISTS idx_archive_jobs_homeowner ON archive.jobs(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_archive_bids_job ON archive.bids(job_id);
CREATE INDEX IF NOT EXISTS idx_archive_messages_job ON archive.messages(job_id);

-- ============================================================
-- 7. Schedule via pg_cron (monthly archival)
-- ============================================================
DO $$
BEGIN
  -- Run archival monthly at 3 AM on the 1st
  PERFORM cron.schedule(
    'archive-old-records',
    '0 3 1 * *',
    $cron$SELECT archive.archive_old_records(12, 1000);$cron$
  );
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'pg_cron not available — use /api/cron/data-archival instead';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule pg_cron job: %', SQLERRM;
END $$;

-- ============================================================
-- 8. Public schema wrapper for Supabase RPC
-- Supabase .rpc() only calls functions in the public schema,
-- so we create a thin wrapper that delegates to archive schema.
-- ============================================================
CREATE OR REPLACE FUNCTION public.archive_old_records(
  months_threshold INTEGER DEFAULT 12,
  batch_size INTEGER DEFAULT 500
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, archive
AS $$
  SELECT archive.archive_old_records(months_threshold, batch_size);
$$;
