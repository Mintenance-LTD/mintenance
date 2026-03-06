-- Add reminder tracking columns to compliance_certificates
ALTER TABLE public.compliance_certificates
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reminder_days INTEGER;

COMMENT ON COLUMN public.compliance_certificates.last_reminder_sent_at IS 'When the last expiry reminder was sent';
COMMENT ON COLUMN public.compliance_certificates.last_reminder_days IS 'The threshold (90/30/7) of the last reminder sent, to avoid duplicates';
