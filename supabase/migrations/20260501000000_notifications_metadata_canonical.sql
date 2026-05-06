-- 2026-05-01 audit follow-up — settle the long-running `notifications.data`
-- vs `notifications.metadata` schema drift.
--
-- Live DB state (verified 2026-05-01 via Supabase MCP):
--   public.notifications has `metadata jsonb` and does NOT have `data`.
--
-- Local migration state on disk before this commit:
--   - `009_missing_core_tables.sql:74` (CREATE TABLE … data JSONB)
--   - `20260209100000_p0_p1_security_fixes.sql:198` (CREATE TABLE … data JSONB)
--   Both still describe the column as `data`.
--
-- These two facts cannot both be true on a fresh checkout; the live DB
-- diverged from the migration files at some point (likely a manual
-- ALTER applied via dashboard before MCP-based migration tracking).
-- This migration locks the canonical name to `metadata` for every
-- environment going forward:
--
--   1. If `metadata` is missing, add it (catches greenfield local dbs
--      that build straight from 009 + p0_p1_security_fixes).
--   2. If `data` still exists, copy any stragglers into `metadata`
--      (only where metadata is null) and then drop `data`.
--   3. No-op on the live production DB — `metadata` already exists,
--      `data` already gone.
--
-- Idempotent and safe to re-run.

BEGIN;

-- (1) Ensure metadata exists.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- (2) Migrate any rows where data is non-null and metadata is null,
--     then drop the legacy column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'data'
  ) THEN
    EXECUTE $sql$
      UPDATE public.notifications
         SET metadata = data
       WHERE metadata IS NULL
         AND data IS NOT NULL
    $sql$;

    EXECUTE 'ALTER TABLE public.notifications DROP COLUMN data';
  END IF;
END $$;

COMMIT;

-- Re-audit reminder for reviewers: a CI grep gate now blocks new
-- `.from('notifications').insert(` callers outside the canonical
-- NotificationService and NotificationProcessorService paths
-- (see scripts/check-notification-inserts.js).
