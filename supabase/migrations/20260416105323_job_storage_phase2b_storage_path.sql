-- Phase 2b of Job-storage hardening (Gate 1, audit-reports/BETA_READINESS.md).
--
-- Adds `storage_path TEXT` to job_photos_metadata and assessment_images.
-- Backfills the column by extracting the storage-object path from the
-- existing public URL (stripping the Supabase project URL + bucket prefix).
--
-- After this migration, run scripts/backfill-signed-urls.mjs to re-sign
-- all 12 rows, then apply the follow-up migration
-- 20260416000002_job_storage_flip_private.sql to flip the bucket.
--
-- property_room_photos already has a storage_path column (created with
-- the table, not affected by this migration).

-- 1. Add storage_path column to job_photos_metadata
ALTER TABLE public.job_photos_metadata
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 2. Add storage_path column to assessment_images
ALTER TABLE public.assessment_images
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 3. Backfill storage_path from photo_url in job_photos_metadata
-- Pattern: https://<project>.supabase.co/storage/v1/object/public/Job-storage/<path>
UPDATE public.job_photos_metadata
SET storage_path = regexp_replace(
  photo_url,
  '^.*/storage/v1/object/public/Job-storage/',
  ''
)
WHERE photo_url LIKE '%/storage/v1/object/public/Job-storage/%'
  AND (storage_path IS NULL OR storage_path = '');

-- 4. Backfill storage_path from image_url in assessment_images
UPDATE public.assessment_images
SET storage_path = regexp_replace(
  image_url,
  '^.*/storage/v1/object/public/Job-storage/',
  ''
)
WHERE image_url LIKE '%/storage/v1/object/public/Job-storage/%'
  AND (storage_path IS NULL OR storage_path = '');

-- 5. Add an index on storage_path for the signing script's WHERE clause
CREATE INDEX IF NOT EXISTS idx_job_photos_metadata_storage_path
  ON public.job_photos_metadata (storage_path)
  WHERE storage_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_images_storage_path
  ON public.assessment_images (storage_path)
  WHERE storage_path IS NOT NULL;
