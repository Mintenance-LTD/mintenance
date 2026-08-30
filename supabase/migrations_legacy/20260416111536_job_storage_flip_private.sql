-- Phase 2b final step: flip Job-storage bucket to private.
-- All 8 real photo/image rows have been re-signed with 1-year signed URLs
-- via scripts/backfill-signed-urls.mjs (run 2026-04-16).
-- 4 phantom test rows (test-before-photo.jpg etc.) have no backing file
-- in the bucket — they were already 404ing on public access.
-- Rollback: UPDATE storage.buckets SET public = true WHERE id = 'Job-storage';

UPDATE storage.buckets
SET public = false
WHERE id = 'Job-storage';;
