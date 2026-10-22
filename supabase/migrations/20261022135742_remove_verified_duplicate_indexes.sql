-- Verified equivalent, non-unique indexes; retain the original valid copies.
SET LOCAL lock_timeout = '2s';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_index WHERE indexrelid = to_regclass('public.idx_messages_job_created_desc_id') AND indisvalid)
     OR NOT EXISTS (SELECT 1 FROM pg_index WHERE indexrelid = to_regclass('public.idx_service_areas_center') AND indisvalid) THEN
    RAISE EXCEPTION 'Retained indexes must exist and be valid before dropping duplicates';
  END IF;
END $$;
DROP INDEX IF EXISTS public.messages_inbox_activity;
DROP INDEX IF EXISTS public.idx_service_areas_center_gist;

