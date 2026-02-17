-- Migration: Deprecate jobs_photos table
-- Date: 2026-02-15
--
-- The jobs_photos table is fully superseded by job_photos_metadata (canonical).
-- All app code now uses job_photos_metadata exclusively.
-- This migration backfills any orphaned rows, then removes the old table.

BEGIN;

-- 1. Backfill any photos in jobs_photos that are missing from job_photos_metadata
INSERT INTO public.job_photos_metadata (job_id, photo_url, photo_type, created_at)
SELECT jp.job_id, jp.photo_url, 'before', COALESCE(jp.created_at, NOW())
FROM public.jobs_photos jp
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_photos_metadata jpm
  WHERE jpm.job_id = jp.job_id AND jpm.photo_url = jp.photo_url
)
ON CONFLICT DO NOTHING;

-- 2. Drop the compatibility view
DROP VIEW IF EXISTS public.v_job_photos;

-- 3. Drop RLS policies on jobs_photos
DROP POLICY IF EXISTS jobs_photos_service_role ON public.jobs_photos;
DROP POLICY IF EXISTS jobs_photos_read ON public.jobs_photos;
DROP POLICY IF EXISTS jobs_photos_insert ON public.jobs_photos;

-- 4. Drop the deprecated table
DROP TABLE IF EXISTS public.jobs_photos;

COMMIT;
