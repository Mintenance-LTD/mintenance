-- ============================================================================
-- 20260520000003_property_access_fields.sql
--
-- Unblocks the "How contractors get in" UI on /properties/[id] and the
-- corresponding "Access details" card on /contractor/jobs/[id] (added
-- in the Phase-4 Mint Editorial port).
--
-- Before this migration: `MintEditorialPropertyAccess.tsx` rendered the
-- Key safe / Smart lock / "You'll be home" picker as read-only with a
-- "Setup coming soon" banner because the canonical fields had no DB
-- home (see file comment ~line 10). Contractors had to ask homeowners
-- for access details in the message thread on every job.
--
-- After this migration:
--   - `properties.access_mode` enum field stores the homeowner's chosen
--     default (key safe / smart lock / in-person).
--   - `properties.key_safe_code` text holds the code (revealed to the
--     assigned contractor 1h before the scheduled start via a future
--     `/api/contractor/jobs/[id]/access` endpoint).
--   - `properties.access_notes` free-text for instructions ("Keys with
--     neighbour at no. 22. Cat in kitchen, please keep door closed.").
--   - `properties.stopcock_location` + `properties.gas_isolator_location`
--     + `properties.consumer_unit_location` complete the "Stopcock &
--     isolators" card on the same Access tab.
--
-- RLS: the existing `properties_select_own_or_assigned_contractor` policy
-- already covers contractor access (assigned contractor can SELECT their
-- jobs' properties). No new policies needed — the new columns inherit
-- row-level access from the table-level policy.
-- ============================================================================

BEGIN;

-- access_mode: 3-way pick + null for "not set yet"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'property_access_mode'
  ) THEN
    CREATE TYPE public.property_access_mode AS ENUM (
      'key_safe',
      'smart_lock',
      'in_person'
    );
  END IF;
END $$;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS access_mode public.property_access_mode,
  ADD COLUMN IF NOT EXISTS key_safe_code text,
  ADD COLUMN IF NOT EXISTS access_notes text,
  ADD COLUMN IF NOT EXISTS stopcock_location text,
  ADD COLUMN IF NOT EXISTS gas_isolator_location text,
  ADD COLUMN IF NOT EXISTS consumer_unit_location text;

COMMENT ON COLUMN public.properties.access_mode IS
  'How contractors get in for assigned jobs. NULL = not set yet (UI
   shows the picker as empty). Surface on /contractor/jobs/[id]
   sidebar under "Access details" once non-null.';

COMMENT ON COLUMN public.properties.key_safe_code IS
  'Lock-box code. Sensitive — only surface to the assigned contractor
   within 1h of scheduled job start, and only if access_mode =
   key_safe. The contractor-side API should mask this value in any
   logs (use sentry-redaction config).';

COMMENT ON COLUMN public.properties.access_notes IS
  'Free-text instructions ("keys with neighbour", "cat in kitchen").
   Always visible to the assigned contractor on the job detail.';

-- ────────────────────────────────────────────────────────────────────
-- Backfill check: any properties with the legacy `access_code` text
-- column from a pre-Phase-4 prototype? If so, migrate to the new
-- columns. (Defensive — column may not exist on every install.)
-- ────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'properties'
      AND column_name = 'access_code'
  ) THEN
    EXECUTE 'UPDATE public.properties
             SET key_safe_code = access_code,
                 access_mode = ''key_safe''
             WHERE access_code IS NOT NULL
               AND key_safe_code IS NULL
               AND access_mode IS NULL';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Rollback (manual, for reference)
-- ============================================================================
-- BEGIN;
-- ALTER TABLE public.properties
--   DROP COLUMN IF EXISTS access_mode,
--   DROP COLUMN IF EXISTS key_safe_code,
--   DROP COLUMN IF EXISTS access_notes,
--   DROP COLUMN IF EXISTS stopcock_location,
--   DROP COLUMN IF EXISTS gas_isolator_location,
--   DROP COLUMN IF EXISTS consumer_unit_location;
-- DROP TYPE IF EXISTS public.property_access_mode;
-- COMMIT;
