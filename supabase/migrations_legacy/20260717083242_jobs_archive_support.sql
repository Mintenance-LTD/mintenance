-- Archive support for jobs + align jobs_status_check with the state machine.
-- (Mirrors repo migration 20260717090000_jobs_archive_support.sql)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.jobs.archived_at IS
  'When the homeowner archived this job from their list views. NULL = not archived. Orthogonal to status — archiving does not change the job lifecycle.';

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('draft', 'open', 'posted', 'assigned', 'in_progress', 'completed', 'disputed', 'cancelled'));;
