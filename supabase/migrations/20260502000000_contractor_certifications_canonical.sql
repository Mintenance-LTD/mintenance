-- 2026-05-02 audit follow-up — settle the long-running drift between
-- the historical `contractor_certifications` migration on disk and
-- the live production schema.
--
-- Live DB state (verified 2026-05-02 via Supabase MCP):
--   public.contractor_certifications has columns:
--     id, contractor_id, name, issuer, issue_date, expiry_date,
--     credential_id, document_url, category, is_verified, verified_at,
--     verified_by, created_at, updated_at
--
-- Historical migration state on disk (009_missing_core_tables.sql:28):
--   CREATE TABLE contractor_certifications (
--     id, contractor_id, name, issuing_body, certificate_number,
--     issue_date, expiry_date, document_url, verified, created_at,
--     updated_at
--   )
--
-- The two schemas can't both be true on a fresh checkout. The live DB
-- diverged from the migration files at some point (likely a manual
-- ALTER applied via dashboard before MCP-based migration tracking).
-- This migration locks the canonical column names to match live for
-- every environment going forward:
--
--   1. Rename `issuing_body` → `issuer`           (if old name exists)
--   2. Rename `certificate_number` → `credential_id` (if old name exists)
--   3. Rename `verified` → `is_verified`         (if old name exists)
--   4. Add `category text NOT NULL DEFAULT 'general'`  (if missing)
--   5. Add `verified_at timestamptz`             (if missing)
--   6. Add `verified_by uuid REFERENCES profiles(id)` (if missing)
--
-- All steps guarded by `information_schema.columns` lookups so the
-- migration is idempotent and safe to re-run. No-op on production
-- (already in the target state); brings every fresh local DB / CI
-- ephemeral DB / disaster restore into the same shape as live.

BEGIN;

DO $$
BEGIN
  -- (1) issuing_body → issuer
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contractor_certifications'
      AND column_name = 'issuing_body'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contractor_certifications'
      AND column_name = 'issuer'
  ) THEN
    EXECUTE 'ALTER TABLE public.contractor_certifications RENAME COLUMN issuing_body TO issuer';
  END IF;

  -- (2) certificate_number → credential_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contractor_certifications'
      AND column_name = 'certificate_number'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contractor_certifications'
      AND column_name = 'credential_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.contractor_certifications RENAME COLUMN certificate_number TO credential_id';
  END IF;

  -- (3) verified → is_verified
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contractor_certifications'
      AND column_name = 'verified'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contractor_certifications'
      AND column_name = 'is_verified'
  ) THEN
    EXECUTE 'ALTER TABLE public.contractor_certifications RENAME COLUMN verified TO is_verified';
  END IF;

  -- The `issuer` column is NOT NULL on live, but the historical
  -- migration left `issuing_body` nullable. After the rename above
  -- (greenfield path) we tighten the constraint, but ONLY if every
  -- existing row already has a non-null value. Otherwise the rename
  -- alone is sufficient and the constraint can be added in a follow-
  -- up after a backfill.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contractor_certifications'
      AND column_name = 'issuer'
      AND is_nullable = 'YES'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.contractor_certifications WHERE issuer IS NULL
  ) THEN
    EXECUTE 'ALTER TABLE public.contractor_certifications ALTER COLUMN issuer SET NOT NULL';
  END IF;
END $$;

-- (4) category column with same default and not-null shape live has.
ALTER TABLE public.contractor_certifications
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';

-- (5) verified_at timestamp.
ALTER TABLE public.contractor_certifications
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- (6) verified_by FK to profiles.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contractor_certifications'
      AND column_name = 'verified_by'
  ) THEN
    EXECUTE 'ALTER TABLE public.contractor_certifications ADD COLUMN verified_by UUID REFERENCES public.profiles(id)';
  END IF;
END $$;

COMMIT;

-- Reviewer note: the historical 009_missing_core_tables.sql is left
-- unmodified by design — that file represents the schema state at
-- bootstrap time. This migration owns the rename forward; the type
-- definition in packages/types/src/contractor.ts and every runtime
-- consumer have been aligned to the canonical names in the same
-- commit.
