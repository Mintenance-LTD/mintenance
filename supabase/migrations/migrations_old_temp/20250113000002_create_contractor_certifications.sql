-- ============================================================================
-- Contractor Certifications Migration
-- Creates table for storing contractor certifications and licenses
-- ============================================================================

BEGIN;

-- ============================================================================
-- CONTRACTOR_CERTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contractor_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  credential_id TEXT,
  document_url TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('safety', 'electrical', 'plumbing', 'kitchen', 'general', 'other')),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_issue_date CHECK (issue_date <= CURRENT_DATE),
  CONSTRAINT valid_expiry_date CHECK (expiry_date IS NULL OR expiry_date >= issue_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contractor_certifications_contractor_id 
  ON public.contractor_certifications(contractor_id);

CREATE INDEX IF NOT EXISTS idx_contractor_certifications_category 
  ON public.contractor_certifications(category);

CREATE INDEX IF NOT EXISTS idx_contractor_certifications_expiry_date 
  ON public.contractor_certifications(expiry_date) 
  WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contractor_certifications_is_verified 
  ON public.contractor_certifications(is_verified) 
  WHERE is_verified = TRUE;

-- Comments
COMMENT ON TABLE public.contractor_certifications IS 'Stores professional certifications and licenses for contractors';
COMMENT ON COLUMN public.contractor_certifications.name IS 'Name of the certification (e.g., Gas Safe Registered)';
COMMENT ON COLUMN public.contractor_certifications.issuer IS 'Organization that issued the certification';
COMMENT ON COLUMN public.contractor_certifications.credential_id IS 'Unique credential or license number';
COMMENT ON COLUMN public.contractor_certifications.document_url IS 'URL to uploaded certificate document';
COMMENT ON COLUMN public.contractor_certifications.category IS 'Category of certification: safety, electrical, plumbing, kitchen, general, other';
COMMENT ON COLUMN public.contractor_certifications.is_verified IS 'Whether the certification has been verified by admin';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contractor_certifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_contractor_certifications_updated_at
  BEFORE UPDATE ON public.contractor_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_contractor_certifications_updated_at();

-- RLS Policies
ALTER TABLE public.contractor_certifications ENABLE ROW LEVEL SECURITY;

-- Contractors can view their own certifications
CREATE POLICY "Contractors can view their own certifications" ON public.contractor_certifications
  FOR SELECT
  USING (auth.uid() = contractor_id);

-- Contractors can insert their own certifications
CREATE POLICY "Contractors can insert their own certifications" ON public.contractor_certifications
  FOR INSERT
  WITH CHECK (auth.uid() = contractor_id);

-- Contractors can update their own certifications
CREATE POLICY "Contractors can update their own certifications" ON public.contractor_certifications
  FOR UPDATE
  USING (auth.uid() = contractor_id)
  WITH CHECK (auth.uid() = contractor_id);

-- Contractors can delete their own certifications
CREATE POLICY "Contractors can delete their own certifications" ON public.contractor_certifications
  FOR DELETE
  USING (auth.uid() = contractor_id);

-- Admins can view all certifications
CREATE POLICY "Admins can view all certifications" ON public.contractor_certifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Admins can verify certifications
CREATE POLICY "Admins can update all certifications" ON public.contractor_certifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

COMMIT;
