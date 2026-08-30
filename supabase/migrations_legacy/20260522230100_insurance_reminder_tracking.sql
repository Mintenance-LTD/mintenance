ALTER TABLE public.contractor_insurance
  ADD COLUMN IF NOT EXISTS last_reminder_days integer,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

ALTER TABLE public.contractor_licenses
  ADD COLUMN IF NOT EXISTS last_reminder_days integer,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

COMMENT ON COLUMN public.contractor_insurance.last_reminder_days IS
  'Highest reminder threshold (90 / 30 / 7) the contractor has been pinged for. Used by ContractorCredentialReminderService to avoid duplicate pings.';

COMMENT ON COLUMN public.contractor_licenses.last_reminder_days IS
  'Same as contractor_insurance.last_reminder_days but for trade licences.';;
