-- Migration: Add geolocation_verified to job_photos_metadata
-- and license/insurance verification tables
-- Date: 2026-02-18

-- 1. Add geolocation_verified column to job_photos_metadata
ALTER TABLE public.job_photos_metadata
  ADD COLUMN IF NOT EXISTS geolocation_verified boolean DEFAULT NULL;

COMMENT ON COLUMN public.job_photos_metadata.geolocation_verified
  IS 'Whether the photo geolocation was within 100m of the job location. NULL if no geolocation provided.';

-- 2. License verification table
CREATE TABLE IF NOT EXISTS public.license_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  license_type text NOT NULL, -- 'gas_safe', 'niceic', 'napit', 'oftec', 'other'
  license_number text NOT NULL,
  trade_body text, -- 'Gas Safe Register', 'NICEIC', 'NAPIT', 'OFTEC'
  holder_name text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'failed', 'expired'
  verification_method text NOT NULL DEFAULT 'manual', -- 'manual', 'api_lookup', 'document_upload'
  verified_at timestamptz,
  expires_at timestamptz,
  document_url text, -- uploaded certificate/license image
  external_lookup_data jsonb, -- raw response from external verification API
  admin_reviewer_id uuid REFERENCES public.profiles(id),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_license_verifications_contractor
  ON public.license_verifications(contractor_id);
CREATE INDEX IF NOT EXISTS idx_license_verifications_status
  ON public.license_verifications(status);

ALTER TABLE public.license_verifications ENABLE ROW LEVEL SECURITY;

-- Contractors can view their own license verifications
CREATE POLICY "Contractors can view own license verifications"
  ON public.license_verifications FOR SELECT
  USING (auth.uid() = contractor_id);

-- Contractors can insert their own license verifications
CREATE POLICY "Contractors can insert own license verifications"
  ON public.license_verifications FOR INSERT
  WITH CHECK (auth.uid() = contractor_id);

-- Admins can do everything
CREATE POLICY "Admins can manage all license verifications"
  ON public.license_verifications FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Insurance verification table
CREATE TABLE IF NOT EXISTS public.insurance_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  insurance_type text NOT NULL, -- 'public_liability', 'professional_indemnity', 'employers_liability', 'all_risks'
  provider_name text NOT NULL,
  policy_number text,
  coverage_amount integer, -- in pence
  excess_amount integer, -- in pence
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'failed', 'expired'
  verification_method text NOT NULL DEFAULT 'document_upload', -- 'document_upload', 'manual'
  verified_at timestamptz,
  policy_start_date date,
  policy_expiry_date date NOT NULL,
  document_url text NOT NULL, -- uploaded insurance certificate
  admin_reviewer_id uuid REFERENCES public.profiles(id),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurance_verifications_contractor
  ON public.insurance_verifications(contractor_id);
CREATE INDEX IF NOT EXISTS idx_insurance_verifications_status
  ON public.insurance_verifications(status);
CREATE INDEX IF NOT EXISTS idx_insurance_verifications_expiry
  ON public.insurance_verifications(policy_expiry_date);

ALTER TABLE public.insurance_verifications ENABLE ROW LEVEL SECURITY;

-- Contractors can view their own insurance verifications
CREATE POLICY "Contractors can view own insurance verifications"
  ON public.insurance_verifications FOR SELECT
  USING (auth.uid() = contractor_id);

-- Contractors can insert their own insurance verifications
CREATE POLICY "Contractors can insert own insurance verifications"
  ON public.insurance_verifications FOR INSERT
  WITH CHECK (auth.uid() = contractor_id);

-- Admins can do everything
CREATE POLICY "Admins can manage all insurance verifications"
  ON public.insurance_verifications FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
