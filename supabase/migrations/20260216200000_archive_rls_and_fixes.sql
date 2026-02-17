-- ============================================================
-- Archive Schema: RLS Policies + Fix SELECT * in Functions
-- ============================================================
-- Only runs if the archive schema exists (created by data_archival_strategy migration).
-- 1. Enable RLS on archive tables (previously missing)
-- 2. Add service-role-only policies (archive = admin access)
-- 3. Replace SELECT * in archive_old_records() with explicit columns
-- ============================================================

DO $$
BEGIN
  -- Only proceed if archive schema exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'archive') THEN
    RAISE NOTICE 'archive schema does not exist, skipping archive RLS and fixes';
    RETURN;
  END IF;

  -- 1. Enable RLS on archive tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'archive' AND table_name = 'jobs') THEN
    ALTER TABLE archive.jobs ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'archive' AND table_name = 'bids') THEN
    ALTER TABLE archive.bids ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'archive' AND table_name = 'messages') THEN
    ALTER TABLE archive.messages ENABLE ROW LEVEL SECURITY;
  END IF;

  -- 2. Service-role-only policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'archive' AND table_name = 'jobs') THEN
    DROP POLICY IF EXISTS "Service role access archive jobs" ON archive.jobs;
    CREATE POLICY "Service role access archive jobs"
    ON archive.jobs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'archive' AND table_name = 'bids') THEN
    DROP POLICY IF EXISTS "Service role access archive bids" ON archive.bids;
    CREATE POLICY "Service role access archive bids"
    ON archive.bids FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'archive' AND table_name = 'messages') THEN
    DROP POLICY IF EXISTS "Service role access archive messages" ON archive.messages;
    CREATE POLICY "Service role access archive messages"
    ON archive.messages FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END;
$$;

-- 3. Fix archive_old_records() to use explicit columns
-- Only create if archive schema exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'archive') THEN
    RETURN;
  END IF;

  -- Create or replace the archive function with explicit columns
  CREATE OR REPLACE FUNCTION archive.archive_old_records(
    months_threshold INTEGER DEFAULT 12,
    batch_size INTEGER DEFAULT 500
  )
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, archive
  AS $fn$
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

    -- 2. Archive messages for these jobs (explicit columns)
    WITH moved_messages AS (
      DELETE FROM public.messages
      WHERE job_id = ANY(archived_job_ids)
      RETURNING id, job_id, sender_id, content, created_at, updated_at, read_at
    )
    INSERT INTO archive.messages (id, job_id, sender_id, content, created_at, updated_at, read_at, archived_at)
    SELECT id, job_id, sender_id, content, created_at, updated_at, read_at, NOW()
    FROM moved_messages;

    GET DIAGNOSTICS messages_archived = ROW_COUNT;

    -- 3. Archive bids for these jobs (explicit columns)
    WITH moved_bids AS (
      DELETE FROM public.bids
      WHERE job_id = ANY(archived_job_ids)
      RETURNING id, job_id, contractor_id, amount, message, status,
                estimated_duration_days, materials_included, warranty_months,
                created_at, updated_at
    )
    INSERT INTO archive.bids (id, job_id, contractor_id, amount, message, status,
                              estimated_duration_days, materials_included, warranty_months,
                              created_at, updated_at, archived_at)
    SELECT id, job_id, contractor_id, amount, message, status,
           estimated_duration_days, materials_included, warranty_months,
           created_at, updated_at, NOW()
    FROM moved_bids;

    GET DIAGNOSTICS bids_archived = ROW_COUNT;

    -- 4. Archive the jobs themselves (explicit columns)
    WITH moved_jobs AS (
      DELETE FROM public.jobs
      WHERE id = ANY(archived_job_ids)
      RETURNING id, homeowner_id, title, description, category, status,
                budget_min, budget_max, urgency, location, images, metadata,
                created_at, updated_at, published_at, completed_at
    )
    INSERT INTO archive.jobs (id, homeowner_id, title, description, category, status,
                             budget_min, budget_max, urgency, location, images, metadata,
                             created_at, updated_at, published_at, completed_at, archived_at)
    SELECT id, homeowner_id, title, description, category, status,
           budget_min, budget_max, urgency, location, images, metadata,
           created_at, updated_at, published_at, completed_at, NOW()
    FROM moved_jobs;

    GET DIAGNOSTICS jobs_archived = ROW_COUNT;

    RETURN jsonb_build_object(
      'jobs_archived', jobs_archived,
      'bids_archived', bids_archived,
      'messages_archived', messages_archived,
      'cutoff_date', cutoff_date,
      'batch_size', batch_size
    );
  END;
  $fn$;

  -- Also update the public schema wrapper
  CREATE OR REPLACE FUNCTION public.archive_old_records(
    months_threshold INTEGER DEFAULT 12,
    batch_size INTEGER DEFAULT 500
  )
  RETURNS JSONB
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public, archive
  AS $fn$
    SELECT archive.archive_old_records(months_threshold, batch_size);
  $fn$;
END;
$$;
