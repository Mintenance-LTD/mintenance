-- ============================================================================
-- 20260521150000_property_contacts_recurring_schedules_retention.sql
--
-- Closes the remaining gap from the 2026-05-10 audit P2.28 finding.
--
-- The larger 20260520000002_landlord_fk_retention.sql migration sits in
-- the repo but was never applied live; only the three single-table
-- follow-up patches (compliance_certificates, property_tenants,
-- anonymous_reports) actually ran. Live FK state confirmed via
-- pg_constraint on 2026-05-21:
--
--     property_contacts     →  ON DELETE CASCADE   ← still wrong
--     recurring_schedules   →  ON DELETE CASCADE   ← still wrong
--
-- The /api/properties/[id]/delete-preview route already promises the
-- homeowner that both tables will be **preserved** when the property
-- is deleted (so they can keep keyholder contact history + the
-- recurring-maintenance cycle definition). Today that promise is a
-- lie — the FK still cascades.
--
-- This migration honours the promise. Both tables become nullable +
-- SET NULL, matching the pattern already applied to the other four.
-- Existing rows: zero on both tables in production (verified live
-- 2026-05-21), so no nullify backfill is needed.
--
-- Cron compatibility: the recurring-job creator (RecurringJobCreatorService
-- .processSchedules) already filters `.not('property_id', 'is', null)`
-- in its query (apps/web/lib/services/recurring/RecurringJobCreatorService.ts
-- line 83), so orphaned schedules are silently skipped — exactly the
-- behaviour the original migration's partial index aimed for.
--
-- After this migration `owner_id` is the authoritative ownership key
-- on both tables. The existing RLS policies already gate on owner_id,
-- so RLS continues to work with property_id = NULL rows.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- property_contacts (keyholder / managing agent / emergency contacts)
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE public.property_contacts
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.property_contacts
  DROP CONSTRAINT IF EXISTS property_contacts_property_id_fkey;

ALTER TABLE public.property_contacts
  ADD CONSTRAINT property_contacts_property_id_fkey
  FOREIGN KEY (property_id)
  REFERENCES public.properties(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.property_contacts.property_id IS
  'FK to properties. NULL once the property is deleted — keyholder
   and managing-agent contact history survives for the owner''s
   record. owner_id is the authoritative ownership key.';

-- ────────────────────────────────────────────────────────────────────
-- recurring_schedules (cycle definitions)
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE public.recurring_schedules
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.recurring_schedules
  DROP CONSTRAINT IF EXISTS recurring_schedules_property_id_fkey;

ALTER TABLE public.recurring_schedules
  ADD CONSTRAINT recurring_schedules_property_id_fkey
  FOREIGN KEY (property_id)
  REFERENCES public.properties(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.recurring_schedules.property_id IS
  'FK to properties. NULL once the property is deleted — the schedule
   row survives so the owner can see their historical cycle. The
   recurring-job cron skips schedules with NULL property_id (the new
   job would have nowhere to scope to).';

COMMIT;
