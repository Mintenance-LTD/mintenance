-- 2026-05-02 audit follow-up — settle the long-running drift between
-- the historical `contractor_certifications` migration on disk and
-- the live production schema. Idempotent and safe to re-run.

BEGIN;

DO $$
BEGIN
  -- (1) issuing_body -> issuer
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

  -- (2) certificate_number -> credential_id
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

  -- (3) verified -> is_verified
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

ALTER TABLE public.contractor_certifications
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';

ALTER TABLE public.contractor_certifications
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

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
