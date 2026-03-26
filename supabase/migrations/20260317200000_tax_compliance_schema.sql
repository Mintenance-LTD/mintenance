-- Migration: 1099-NEC Tax Compliance Schema
-- Date: 2026-03-17
-- Purpose: Add tables for US contractor tax reporting (W-9 data, annual summaries, payment records)
--
-- Tables created:
--   1. contractor_tax_profiles  - W-9 data collection (encrypted TIN, address, classification)
--   2. tax_year_summaries       - Annual earnings per contractor with 1099 threshold tracking
--   3. tax_payment_records      - Individual payment line items for 1099 generation
--
-- Security:
--   - RLS enabled on all tables
--   - Contractors can only read their own data
--   - Admins have full read access
--   - Service role has full CRUD (for backend/cron operations)
--   - TIN is stored encrypted; only last 4 digits in plaintext for display

BEGIN;

-- =============================================================================
-- 1. CONTRACTOR TAX PROFILES (W-9 data)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contractor_tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  tax_name TEXT NOT NULL,
  business_name TEXT,
  tax_classification TEXT NOT NULL CHECK (tax_classification IN (
    'individual', 'llc_single', 'llc_c', 'llc_s',
    'c_corp', 's_corp', 'partnership', 'trust', 'other'
  )),
  tin_type TEXT NOT NULL CHECK (tin_type IN ('ssn', 'ein')),
  tin_encrypted TEXT NOT NULL,
  tin_last_four TEXT NOT NULL CHECK (char_length(tin_last_four) = 4 AND tin_last_four ~ '^\d{4}$'),
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL CHECK (char_length(state) = 2 AND state ~ '^[A-Z]{2}$'),
  zip_code TEXT NOT NULL CHECK (zip_code ~ '^\d{5}(-\d{4})?$'),
  w9_submitted_at TIMESTAMPTZ,
  w9_verified BOOLEAN DEFAULT false,
  w9_verified_at TIMESTAMPTZ,
  w9_document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.contractor_tax_profiles IS 'W-9 data for US contractor 1099-NEC tax reporting';
COMMENT ON COLUMN public.contractor_tax_profiles.tin_encrypted IS 'AES-256 encrypted TIN (SSN or EIN). NEVER store or return plaintext.';
COMMENT ON COLUMN public.contractor_tax_profiles.tin_last_four IS 'Last 4 digits of TIN for display purposes only (e.g. ***-**-1234)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contractor_tax_profiles_contractor_id
  ON public.contractor_tax_profiles(contractor_id);

CREATE INDEX IF NOT EXISTS idx_contractor_tax_profiles_w9_verified
  ON public.contractor_tax_profiles(w9_verified)
  WHERE w9_verified = false;

-- =============================================================================
-- 2. TAX YEAR SUMMARIES (annual earnings per contractor)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tax_year_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL CHECK (tax_year >= 2024 AND tax_year <= 2100),
  total_earnings DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_earnings >= 0),
  total_platform_fees DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_platform_fees >= 0),
  total_stripe_fees DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_stripe_fees >= 0),
  net_payments DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (net_payments >= 0),
  job_count INTEGER NOT NULL DEFAULT 0 CHECK (job_count >= 0),
  requires_1099 BOOLEAN GENERATED ALWAYS AS (total_earnings >= 600) STORED,
  form_1099_generated BOOLEAN DEFAULT false,
  form_1099_generated_at TIMESTAMPTZ,
  form_1099_filed BOOLEAN DEFAULT false,
  form_1099_filed_at TIMESTAMPTZ,
  form_1099_document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tax_year_summaries_contractor_year UNIQUE (contractor_id, tax_year)
);

COMMENT ON TABLE public.tax_year_summaries IS 'Annual earnings summary per contractor for 1099-NEC threshold tracking';
COMMENT ON COLUMN public.tax_year_summaries.requires_1099 IS 'Auto-computed: true when total_earnings >= $600 (IRS 1099-NEC threshold)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tax_year_summaries_contractor_id
  ON public.tax_year_summaries(contractor_id);

CREATE INDEX IF NOT EXISTS idx_tax_year_summaries_tax_year
  ON public.tax_year_summaries(tax_year);

CREATE INDEX IF NOT EXISTS idx_tax_year_summaries_requires_1099
  ON public.tax_year_summaries(tax_year, contractor_id)
  WHERE (total_earnings >= 600);

CREATE INDEX IF NOT EXISTS idx_tax_year_summaries_unfiled
  ON public.tax_year_summaries(tax_year)
  WHERE (total_earnings >= 600) AND form_1099_filed = false;

-- =============================================================================
-- 3. TAX PAYMENT RECORDS (individual payment line items for 1099)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tax_payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL CHECK (tax_year >= 2024 AND tax_year <= 2100),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  escrow_transaction_id UUID REFERENCES public.escrow_transactions(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL CHECK (gross_amount > 0),
  platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  net_amount DECIMAL(10,2) NOT NULL CHECK (net_amount > 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tax_payment_records IS 'Individual payment line items linked to jobs/escrow for 1099-NEC generation';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tax_payment_records_contractor_id
  ON public.tax_payment_records(contractor_id);

CREATE INDEX IF NOT EXISTS idx_tax_payment_records_contractor_year
  ON public.tax_payment_records(contractor_id, tax_year);

CREATE INDEX IF NOT EXISTS idx_tax_payment_records_tax_year
  ON public.tax_payment_records(tax_year);

CREATE INDEX IF NOT EXISTS idx_tax_payment_records_job_id
  ON public.tax_payment_records(job_id)
  WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tax_payment_records_escrow_id
  ON public.tax_payment_records(escrow_transaction_id)
  WHERE escrow_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tax_payment_records_payment_date
  ON public.tax_payment_records(payment_date);

-- =============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.contractor_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_year_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_payment_records ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. RLS POLICIES: contractor_tax_profiles
-- =============================================================================

-- Contractors can view their own tax profile
DROP POLICY IF EXISTS "contractors_select_own_tax_profile" ON public.contractor_tax_profiles;
CREATE POLICY "contractors_select_own_tax_profile" ON public.contractor_tax_profiles
  FOR SELECT
  TO authenticated
  USING (contractor_id = auth.uid());

-- Contractors can insert their own tax profile
DROP POLICY IF EXISTS "contractors_insert_own_tax_profile" ON public.contractor_tax_profiles;
CREATE POLICY "contractors_insert_own_tax_profile" ON public.contractor_tax_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (contractor_id = auth.uid());

-- Contractors can update their own tax profile
DROP POLICY IF EXISTS "contractors_update_own_tax_profile" ON public.contractor_tax_profiles;
CREATE POLICY "contractors_update_own_tax_profile" ON public.contractor_tax_profiles
  FOR UPDATE
  TO authenticated
  USING (contractor_id = auth.uid())
  WITH CHECK (contractor_id = auth.uid());

-- Admins can view all tax profiles
DROP POLICY IF EXISTS "admins_select_all_tax_profiles" ON public.contractor_tax_profiles;
CREATE POLICY "admins_select_all_tax_profiles" ON public.contractor_tax_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any tax profile (e.g., mark as verified)
DROP POLICY IF EXISTS "admins_update_all_tax_profiles" ON public.contractor_tax_profiles;
CREATE POLICY "admins_update_all_tax_profiles" ON public.contractor_tax_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role has full access (backend operations)
DROP POLICY IF EXISTS "service_all_tax_profiles" ON public.contractor_tax_profiles;
CREATE POLICY "service_all_tax_profiles" ON public.contractor_tax_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 6. RLS POLICIES: tax_year_summaries
-- =============================================================================

-- Contractors can view their own summaries
DROP POLICY IF EXISTS "contractors_select_own_tax_summaries" ON public.tax_year_summaries;
CREATE POLICY "contractors_select_own_tax_summaries" ON public.tax_year_summaries
  FOR SELECT
  TO authenticated
  USING (contractor_id = auth.uid());

-- Admins can view all summaries
DROP POLICY IF EXISTS "admins_select_all_tax_summaries" ON public.tax_year_summaries;
CREATE POLICY "admins_select_all_tax_summaries" ON public.tax_year_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update summaries (e.g., mark 1099 as filed)
DROP POLICY IF EXISTS "admins_update_all_tax_summaries" ON public.tax_year_summaries;
CREATE POLICY "admins_update_all_tax_summaries" ON public.tax_year_summaries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role has full access (cron jobs, payment processing)
DROP POLICY IF EXISTS "service_all_tax_summaries" ON public.tax_year_summaries;
CREATE POLICY "service_all_tax_summaries" ON public.tax_year_summaries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 7. RLS POLICIES: tax_payment_records
-- =============================================================================

-- Contractors can view their own payment records
DROP POLICY IF EXISTS "contractors_select_own_tax_payments" ON public.tax_payment_records;
CREATE POLICY "contractors_select_own_tax_payments" ON public.tax_payment_records
  FOR SELECT
  TO authenticated
  USING (contractor_id = auth.uid());

-- Admins can view all payment records
DROP POLICY IF EXISTS "admins_select_all_tax_payments" ON public.tax_payment_records;
CREATE POLICY "admins_select_all_tax_payments" ON public.tax_payment_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role has full access (insert records when escrow releases)
DROP POLICY IF EXISTS "service_all_tax_payments" ON public.tax_payment_records;
CREATE POLICY "service_all_tax_payments" ON public.tax_payment_records
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 8. UPDATED_AT TRIGGERS
-- =============================================================================

-- Reuse the existing update_updated_at() or update_updated_at_column() function
-- Both exist in the codebase; we use update_updated_at_column() for consistency
-- with recent migrations (20260303*, 20260225*)

DROP TRIGGER IF EXISTS set_updated_at_contractor_tax_profiles ON public.contractor_tax_profiles;
CREATE TRIGGER set_updated_at_contractor_tax_profiles
  BEFORE UPDATE ON public.contractor_tax_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_tax_year_summaries ON public.tax_year_summaries;
CREATE TRIGGER set_updated_at_tax_year_summaries
  BEFORE UPDATE ON public.tax_year_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- tax_payment_records has no updated_at column (append-only by design)

-- =============================================================================
-- 9. HELPER FUNCTION: Refresh tax year summary from payment records
-- =============================================================================

CREATE OR REPLACE FUNCTION public.refresh_tax_year_summary(
  p_contractor_id UUID,
  p_tax_year INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_earnings DECIMAL(12,2);
  v_total_platform_fees DECIMAL(12,2);
  v_net_payments DECIMAL(12,2);
  v_job_count INTEGER;
BEGIN
  -- Aggregate from tax_payment_records
  SELECT
    COALESCE(SUM(gross_amount), 0),
    COALESCE(SUM(platform_fee), 0),
    COALESCE(SUM(net_amount), 0),
    COUNT(DISTINCT job_id)
  INTO v_total_earnings, v_total_platform_fees, v_net_payments, v_job_count
  FROM public.tax_payment_records
  WHERE contractor_id = p_contractor_id
    AND tax_year = p_tax_year;

  -- Upsert the summary row
  INSERT INTO public.tax_year_summaries (
    contractor_id, tax_year, total_earnings, total_platform_fees,
    net_payments, job_count
  )
  VALUES (
    p_contractor_id, p_tax_year, v_total_earnings, v_total_platform_fees,
    v_net_payments, v_job_count
  )
  ON CONFLICT (contractor_id, tax_year) DO UPDATE SET
    total_earnings = EXCLUDED.total_earnings,
    total_platform_fees = EXCLUDED.total_platform_fees,
    net_payments = EXCLUDED.net_payments,
    job_count = EXCLUDED.job_count;
END;
$$;

COMMENT ON FUNCTION public.refresh_tax_year_summary IS 'Recalculates tax_year_summaries from tax_payment_records for a given contractor and year. Call after inserting/updating payment records.';

-- =============================================================================
-- 10. TRIGGER: Auto-refresh summary when a payment record is inserted
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tax_payment_record_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_tax_year_summary(NEW.contractor_id, NEW.tax_year);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tax_payment_record_refresh_summary ON public.tax_payment_records;
CREATE TRIGGER trg_tax_payment_record_refresh_summary
  AFTER INSERT ON public.tax_payment_records
  FOR EACH ROW EXECUTE FUNCTION public.tax_payment_record_after_insert();

COMMIT;
