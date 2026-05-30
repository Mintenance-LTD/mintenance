-- 2026-05-24 audit-33 P2: confirm-completion was writing completed_at
-- on top of the contractor-set value when the homeowner approved,
-- corrupting "time the contractor finished" metrics, completion SLA,
-- and any duration analytics. The two events are semantically distinct:
--   - completed_at = when the contractor declared the job done.
--   - completion_confirmed_at = when the homeowner approved that.
-- Add a separate timestamp column so both lifecycle steps are
-- preserved. Nullable so historic rows confirmed before this migration
-- don't fail their NOT NULL. Applied live via Supabase MCP 2026-05-24.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS completion_confirmed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.jobs.completion_confirmed_at IS
  'Timestamp when the homeowner approved the contractor-completed work. '
  'Paired with completion_confirmed_by_homeowner=true. Distinct from '
  'completed_at, which records the contractor declaration.';
