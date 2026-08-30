-- Adds insurance_expiry + dbs_expiry columns on profiles so the
-- Phase 3 trust-badge ladder (§5.5 of the 2026-04-19 mobile
-- onboarding audit) can flip the "Insured" and "DBS Checked"
-- badges on for contractors who submit the evidence.
--
-- The mobile `contractorBadges` utility (d6fef59e) already reads
-- these fields as OPTIONAL — today it treats undefined values
-- as "not earned". Landing these columns + starting to populate
-- them turns the two dormant badges on with zero mobile-code
-- change.
--
-- Both are TIMESTAMP WITH TIME ZONE so the utility's
-- isValidFutureDate check (based on Date.parse()) lines up with
-- Postgres' native timestamptz semantics. Matches license_expiry
-- which is currently TEXT in `DD/MM/YYYY` or `YYYY-MM-DD` — we
-- pick timestamptz here to avoid baking in another format-drift
-- bug like the one ContractorVerificationScreen hit.
--
-- RLS note: the existing `profiles` row-level policies cover
-- SELECT (own row + public), UPDATE (own row), INSERT (via
-- trigger). No policy change needed — the new columns inherit
-- the row-level gates. Admin reviewers already hit this table
-- via the admin-verification flow and continue to work.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS insurance_expiry TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dbs_expiry TIMESTAMP WITH TIME ZONE;

-- Indexes on (expiry IS NOT NULL, expiry) make it cheap to
-- surface "who needs a renewal nudge" queries from the admin
-- dashboard. Partial so we don't index the 0-rows-have-this
-- case for every contractor.
CREATE INDEX IF NOT EXISTS idx_profiles_insurance_expiry_active
  ON public.profiles (insurance_expiry)
  WHERE insurance_expiry IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_dbs_expiry_active
  ON public.profiles (dbs_expiry)
  WHERE dbs_expiry IS NOT NULL;

COMMIT;;
