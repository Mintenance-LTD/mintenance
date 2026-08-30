ALTER TABLE public.contractor_dbs_checks
  ADD COLUMN IF NOT EXISTS last_reminder_days integer,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

COMMENT ON COLUMN public.contractor_dbs_checks.last_reminder_days IS
  'Most recent reminder threshold (90 / 30 / 7) the contractor has been pinged for. NULL until the first ping.';

COMMENT ON COLUMN public.contractor_dbs_checks.last_reminder_sent_at IS
  'Wall-clock timestamp of the most recent reminder ping.';;
