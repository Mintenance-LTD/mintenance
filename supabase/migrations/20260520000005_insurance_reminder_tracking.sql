-- ============================================================================
-- 20260520000005_insurance_reminder_tracking.sql
--
-- Adds reminder-tracking columns to `contractor_insurance` and
-- `contractor_licenses` so a new cron (running daily via
-- /api/cron/contractor-credential-reminders) can fire at 90 / 30 / 7
-- day thresholds without spamming the contractor with duplicate
-- emails on every run.
--
-- Mirrors the pattern already used by `compliance_certificates`
-- (migration 20260214… add `last_reminder_days` +
-- `last_reminder_sent_at`) — see ComplianceReminderService for the
-- prior art.
-- ============================================================================

BEGIN;

ALTER TABLE public.contractor_insurance
  ADD COLUMN IF NOT EXISTS last_reminder_days integer,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

ALTER TABLE public.contractor_licenses
  ADD COLUMN IF NOT EXISTS last_reminder_days integer,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

COMMENT ON COLUMN public.contractor_insurance.last_reminder_days IS
  'Highest reminder threshold (90 / 30 / 7) the contractor has been
   pinged for. Used by ContractorCredentialReminderService to avoid
   duplicate pings on the same threshold.';

COMMENT ON COLUMN public.contractor_licenses.last_reminder_days IS
  'Same as contractor_insurance.last_reminder_days but for trade
   licences (CSCS, Gas Safe, NICEIC, etc.).';

COMMIT;

-- ============================================================================
-- Rollback (manual)
-- ============================================================================
-- BEGIN;
-- ALTER TABLE public.contractor_insurance
--   DROP COLUMN IF EXISTS last_reminder_days,
--   DROP COLUMN IF EXISTS last_reminder_sent_at;
-- ALTER TABLE public.contractor_licenses
--   DROP COLUMN IF EXISTS last_reminder_days,
--   DROP COLUMN IF EXISTS last_reminder_sent_at;
-- COMMIT;
