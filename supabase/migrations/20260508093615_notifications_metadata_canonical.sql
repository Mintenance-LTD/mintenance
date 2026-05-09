-- 2026-05-01 audit follow-up — settle the long-running `notifications.data`
-- vs `notifications.metadata` schema drift. Idempotent and safe to re-run.

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
