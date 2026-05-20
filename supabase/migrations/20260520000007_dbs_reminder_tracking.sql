-- ============================================================================
-- 20260520000007_dbs_reminder_tracking.sql
--
-- Adds 90/30/7 reminder-tracking columns to `contractor_dbs_checks`
-- so a daily cron (running via /api/cron/dbs-renewal-reminders) can
-- ping the contractor at each threshold without spamming on every
-- re-run.
--
-- The existing `expiry_reminder_sent boolean` column is a single-shot
-- flag — once flipped, no further reminder ever fires. That's too
-- coarse for the canonical 3-band cadence we use on insurance,
-- licences, and compliance certs. We keep the legacy column in place
-- for compatibility with `DBSCheckService.getExpiringChecks` /
-- `.markExpiryReminderSent` (which run on a separate path); the new
-- columns power the canonical reminder cron.
--
-- Mirrors:
--   - 20260520000005_insurance_reminder_tracking.sql (this branch)
--   - compliance_certificates last_reminder_days pattern (2026-02-14)
-- ============================================================================

BEGIN;

ALTER TABLE public.contractor_dbs_checks
  ADD COLUMN IF NOT EXISTS last_reminder_days integer,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

COMMENT ON COLUMN public.contractor_dbs_checks.last_reminder_days IS
  'Most recent reminder threshold (90 / 30 / 7) the contractor has
   been pinged for. NULL until the first ping. Used by
   DbsRenewalReminderService to avoid duplicate pings on the same
   threshold across daily cron re-runs.';

COMMENT ON COLUMN public.contractor_dbs_checks.last_reminder_sent_at IS
  'Wall-clock timestamp of the most recent reminder ping. Used for
   observability and to debug stuck reminders.';

COMMIT;

-- ============================================================================
-- Rollback (manual)
-- ============================================================================
-- BEGIN;
-- ALTER TABLE public.contractor_dbs_checks
--   DROP COLUMN IF EXISTS last_reminder_days,
--   DROP COLUMN IF EXISTS last_reminder_sent_at;
-- COMMIT;
