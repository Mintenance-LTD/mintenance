-- Phase 2b final step: flip Job-storage bucket to private.
--
-- ⚠️  DO NOT apply this migration until BOTH of these are true:
--
--   1. Migration 20260416000001_job_storage_phase2b_storage_path has been
--      applied (adds storage_path column + backfills paths from URLs).
--
--   2. scripts/backfill-signed-urls.mjs has been run successfully
--      (re-signs all existing photo_url / image_url values with 1-year
--      signed URLs so they survive the flip).
--
-- After this migration, the `/storage/v1/object/public/Job-storage/...`
-- URL pattern stops working. Only signed URLs (from createSignedUrl) and
-- authenticated SDK calls (service_role or RLS-passing) can access objects.
--
-- Rollback: UPDATE storage.buckets SET public = true WHERE id = 'Job-storage';
-- (but only if you have a reason — this undoes the security hardening).

UPDATE storage.buckets
SET public = false
WHERE id = 'Job-storage';
