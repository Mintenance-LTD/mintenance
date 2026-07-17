-- Archive support for jobs + align jobs_status_check with the state machine.
--
-- Context (2026-07-17): the homeowner bulk "Archive" action PATCHed
-- /api/jobs/[id] with { status: 'archived' }, a value neither the
-- updateJobSchema enum, the job state machine, nor the live
-- jobs_status_check allowed — the action has 400'd since it shipped.
--
-- Archiving is a *view* concern, not a lifecycle state: modelling it as
-- a status would clobber the job's real status ('completed' jobs would
-- stop matching revenue/review/escrow queries keyed on status) and
-- would need transitions out of the terminal 'cancelled' state. An
-- orthogonal nullable timestamp preserves the lifecycle, makes
-- unarchive trivial (set NULL), and is additive — safe to apply ahead
-- of the code deploy.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.jobs.archived_at IS
  'When the homeowner archived this job from their list views. NULL = not archived. Orthogonal to status — archiving does not change the job lifecycle.';

-- While auditing the CHECK for this fix we found the dispute flow is
-- also broken: POST /api/jobs/[id]/dispute writes status='disputed'
-- (and the state machine + updateJobSchema both allow it) but the live
-- jobs_status_check did not include it, so every dispute attempt
-- failed at the DB. Widen the constraint to match the state machine.
-- 'archived' is deliberately NOT added — it is not a status.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('draft', 'open', 'posted', 'assigned', 'in_progress', 'completed', 'disputed', 'cancelled'));
