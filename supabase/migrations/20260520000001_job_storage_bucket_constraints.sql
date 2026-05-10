-- Audit P2 (2026-05-10): tighten the `Job-storage` bucket so the
-- bucket-level guards mirror the route-level enforcement in
-- `apps/web/app/api/jobs/[id]/photos/{before,after}/route.ts`.
--
-- Prior state (live snapshot 2026-05-10):
--   { id: 'Job-storage', public: false, file_size_limit: NULL,
--     allowed_mime_types: NULL }
--
-- Routes already enforce 10 MB max + image/{jpeg,jpg,png,webp,gif} +
-- application/pdf at upload time. The bucket-level NULLs mean a
-- direct-storage caller (signed URL with elevated scope, future
-- service-role tooling, or a route bug) could write anything of any
-- size. Lock the bucket down so the route caps are NOT the only
-- defense.
--
-- 10 MiB matches MAX_FILE_SIZE in /photos/after. Allowed MIME list
-- matches ALLOWED_IMAGE_TYPES + the PDF allowance from /photos/before.
-- Any future loosening should update both sides in one PR.

UPDATE storage.buckets
SET
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]::text[]
WHERE id = 'Job-storage';

-- Verify the update landed (no rows = bucket missing, which is its
-- own bug). Surfaces the result in psql output without blocking the
-- migration; idempotent if re-run.
DO $$
DECLARE
  cur_size_limit BIGINT;
  cur_mime_count INT;
BEGIN
  SELECT file_size_limit, COALESCE(array_length(allowed_mime_types, 1), 0)
    INTO cur_size_limit, cur_mime_count
  FROM storage.buckets
  WHERE id = 'Job-storage';

  IF cur_size_limit IS NULL OR cur_mime_count = 0 THEN
    RAISE WARNING
      'Job-storage bucket constraints did not apply (size_limit=%, mime_count=%)',
      cur_size_limit, cur_mime_count;
  ELSE
    RAISE NOTICE
      'Job-storage bucket constrained to % bytes / % MIME types',
      cur_size_limit, cur_mime_count;
  END IF;
END $$;
