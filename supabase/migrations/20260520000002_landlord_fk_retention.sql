-- ============================================================================
-- 20260520000002_landlord_fk_retention.sql
--
-- Audit P2 (2026-05-10): the four landlord-feature tables ship with
-- `property_id ... ON DELETE CASCADE`. Properties in this app are
-- hard-deleted (no `deleted_at` column on `properties`, by design),
-- so a property delete currently wipes:
--
--   - compliance_certificates  (gas safety certs, EICRs, etc.)
--   - property_tenants         (tenant records)
--   - property_contacts        (keyholder / managing agent / etc.)
--   - anonymous_reports        (tenant-submitted maintenance reports)
--   - recurring_schedules      (maintenance cycle definitions)
--
-- UK landlord retention law:
--   - Gas safety certificate: minimum 2 years (Gas Safety Regs 1998 r.36)
--   - EICR: minimum 5 years (Electrical Safety Standards Regs 2020)
--   - Tenancy records: 6 years for HMRC tax purposes (Income Tax Act)
--   - Anonymous reports: useful for dispute-resolution + insurance
--
-- A property hard-delete that wipes these records is therefore a
-- legal-retention failure. This migration switches the FK to
-- `ON DELETE SET NULL` and makes `property_id` nullable on each
-- table, so the records survive a property delete (orphaned but
-- preserved) and can still be retrieved via `owner_id` filters.
--
-- recurring_schedules is also flipped — its data isn't legally
-- mandated but losing the cycle definition silently when a property
-- is removed is a UX gotcha (the homeowner expects the cycle to
-- pause, not vanish).
--
-- After this migration `owner_id` becomes the authoritative ownership
-- key for these tables. The existing RLS policies already gate on
-- `owner_id`, so RLS continues to work correctly with property_id =
-- NULL rows.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 1. compliance_certificates
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE public.compliance_certificates
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.compliance_certificates
  DROP CONSTRAINT IF EXISTS compliance_certificates_property_id_fkey;

ALTER TABLE public.compliance_certificates
  ADD CONSTRAINT compliance_certificates_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.compliance_certificates.property_id IS
  'FK to properties. NULL once the property is deleted — the cert
   itself is retained for legal compliance windows (gas safety ≥2yr,
   EICR ≥5yr). owner_id is the authoritative ownership key.';

-- ────────────────────────────────────────────────────────────────────
-- 2. property_tenants
-- ────────────────────────────────────────────────────────────────────
-- Conditional: the table may not exist in every install (some
-- earlier migrations create it under different names). Guard with
-- IF EXISTS so this migration is idempotent across forks.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'property_tenants'
  ) THEN
    EXECUTE 'ALTER TABLE public.property_tenants ALTER COLUMN property_id DROP NOT NULL';
    EXECUTE 'ALTER TABLE public.property_tenants DROP CONSTRAINT IF EXISTS property_tenants_property_id_fkey';
    EXECUTE 'ALTER TABLE public.property_tenants ADD CONSTRAINT property_tenants_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 3. property_contacts
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE public.property_contacts
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.property_contacts
  DROP CONSTRAINT IF EXISTS property_contacts_property_id_fkey;

ALTER TABLE public.property_contacts
  ADD CONSTRAINT property_contacts_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.property_contacts.property_id IS
  'FK to properties. NULL once the property is deleted — contact
   records (tenants, keyholders, emergency contacts, managing
   agents) survive for the owner''s contact history.';

-- ────────────────────────────────────────────────────────────────────
-- 4. anonymous_reports
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE public.anonymous_reports
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.anonymous_reports
  DROP CONSTRAINT IF EXISTS anonymous_reports_property_id_fkey;

ALTER TABLE public.anonymous_reports
  ADD CONSTRAINT anonymous_reports_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.anonymous_reports.property_id IS
  'FK to properties. NULL once the property is deleted — the report
   itself stays for dispute-resolution + insurance reference. Owner
   trail is preserved via the token_id → anonymous_report_tokens
   .owner_id join (anonymous_report_tokens still cascades because
   the tokens themselves are scoped to a specific property).';

-- ────────────────────────────────────────────────────────────────────
-- 5. recurring_schedules
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE public.recurring_schedules
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.recurring_schedules
  DROP CONSTRAINT IF EXISTS recurring_schedules_property_id_fkey;

ALTER TABLE public.recurring_schedules
  ADD CONSTRAINT recurring_schedules_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.recurring_schedules.property_id IS
  'FK to properties. NULL once the property is deleted — the
   schedule row survives so the owner can see the historical cycle.
   The auto-create-job cron silently skips schedules with NULL
   property_id (would have nowhere to scope the new job).';

-- ────────────────────────────────────────────────────────────────────
-- 6. Guard the recurring-job cron: skip orphaned schedules
-- ────────────────────────────────────────────────────────────────────
-- The cron query already filters by `is_active = true AND
-- auto_create_job = true`. We add an additional `property_id IS
-- NOT NULL` guard via a partial index that the service can use to
-- locate the rows it should actually process. The service code in
-- RecurringJobCreatorService should also explicitly skip NULL rows,
-- which is handled in the same commit as this migration.
CREATE INDEX IF NOT EXISTS recurring_schedules_active_due_idx
  ON public.recurring_schedules (next_due_date)
  WHERE is_active = true
    AND auto_create_job = true
    AND property_id IS NOT NULL;

COMMIT;

-- ============================================================================
-- Rollback (manual, for reference)
-- ============================================================================
-- BEGIN;
-- ALTER TABLE public.compliance_certificates ALTER COLUMN property_id SET NOT NULL;
-- ALTER TABLE public.compliance_certificates DROP CONSTRAINT compliance_certificates_property_id_fkey;
-- ALTER TABLE public.compliance_certificates ADD CONSTRAINT compliance_certificates_property_id_fkey
--   FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
-- -- repeat for property_tenants, property_contacts, anonymous_reports, recurring_schedules
-- DROP INDEX IF EXISTS recurring_schedules_active_due_idx;
-- COMMIT;
