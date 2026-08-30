-- Phase 2b Step 1: Add storage_path column + backfill from public URLs.

-- 1. Add storage_path column to job_photos_metadata
ALTER TABLE public.job_photos_metadata
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 2. Add storage_path column to assessment_images
ALTER TABLE public.assessment_images
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 3. Backfill storage_path from photo_url in job_photos_metadata
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

-- 5. Partial indexes for the signing script
CREATE INDEX IF NOT EXISTS idx_job_photos_metadata_storage_path
  ON public.job_photos_metadata (storage_path)
  WHERE storage_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_images_storage_path
  ON public.assessment_images (storage_path)
  WHERE storage_path IS NOT NULL;;
