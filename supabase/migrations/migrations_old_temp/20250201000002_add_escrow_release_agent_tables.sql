-- Migration: Add Escrow Release Agent Tables
-- Created: 2025-02-01
-- Description: Creates tables for Smart Escrow Release Agent - photo verification and risk-based holds

-- ============================================================================
-- UPDATE ESCROW PAYMENTS TABLE
-- ============================================================================
-- Note: auto_release_date already exists in escrow_payments table
ALTER TABLE escrow_payments 
ADD COLUMN IF NOT EXISTS auto_release_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS photo_verification_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS photo_verification_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS risk_hold_extended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS risk_hold_reason TEXT,
ADD COLUMN IF NOT EXISTS homeowner_id UUID REFERENCES users(id); -- Alias for client_id for consistency

-- Set homeowner_id from client_id if it exists and homeowner_id is null
UPDATE escrow_payments 
SET homeowner_id = client_id 
WHERE homeowner_id IS NULL AND client_id IS NOT NULL;

COMMENT ON COLUMN escrow_payments.auto_release_enabled IS 'Whether automatic release is enabled for this escrow';
COMMENT ON COLUMN escrow_payments.auto_release_date IS 'Date when escrow will be automatically released';
COMMENT ON COLUMN escrow_payments.photo_verification_status IS 'Status of photo verification: pending, verified, failed, manual_review';
COMMENT ON COLUMN escrow_payments.photo_verification_score IS 'AI confidence score for photo verification (0-1)';
COMMENT ON COLUMN escrow_payments.risk_hold_extended IS 'Whether hold period was extended due to risk';
COMMENT ON COLUMN escrow_payments.risk_hold_reason IS 'Reason for risk-based hold extension';

-- ============================================================================
-- ESCROW PHOTO VERIFICATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS escrow_photo_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES escrow_payments(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  
  -- Verification results
  verification_score DECIMAL(3,2), -- 0-1 confidence score
  verification_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'manual_review')),
  verification_method VARCHAR(50) DEFAULT 'ai_analysis', -- 'ai_analysis', 'manual', 'auto'
  
  -- AI Analysis results
  ai_analysis JSONB DEFAULT '{}', -- Detailed AI analysis results
  matches_job_description BOOLEAN,
  completion_indicators JSONB DEFAULT '[]', -- List of completion indicators found
  quality_score DECIMAL(3,2), -- Photo quality score
  
  -- Timestamps
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for escrow_photo_verification
CREATE INDEX IF NOT EXISTS idx_escrow_photo_verification_escrow_id ON escrow_photo_verification(escrow_id);
CREATE INDEX IF NOT EXISTS idx_escrow_photo_verification_job_id ON escrow_photo_verification(job_id);
CREATE INDEX IF NOT EXISTS idx_escrow_photo_verification_status ON escrow_photo_verification(verification_status);
CREATE INDEX IF NOT EXISTS idx_escrow_photo_verification_verified_at ON escrow_photo_verification(verified_at);

-- ============================================================================
-- ESCROW AUTO-RELEASE RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS escrow_auto_release_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_tier VARCHAR(50), -- 'bronze', 'silver', 'gold', 'platinum', NULL for all
  job_value_min DECIMAL(10,2),
  job_value_max DECIMAL(10,2),
  job_category VARCHAR(100),
  
  -- Release rules
  hold_period_days INTEGER NOT NULL DEFAULT 7, -- Days to hold after completion
  require_photo_verification BOOLEAN DEFAULT TRUE,
  require_review BOOLEAN DEFAULT FALSE,
  min_photo_score DECIMAL(3,2) DEFAULT 0.7, -- Minimum photo verification score
  
  -- Risk adjustments
  risk_multiplier DECIMAL(3,2) DEFAULT 1.0, -- Multiply hold period for high-risk jobs
  dispute_history_penalty_days INTEGER DEFAULT 0, -- Additional days if contractor has disputes
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0, -- Higher priority rules checked first
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for escrow_auto_release_rules
CREATE INDEX IF NOT EXISTS idx_escrow_auto_release_rules_active ON escrow_auto_release_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_escrow_auto_release_rules_priority ON escrow_auto_release_rules(priority DESC);

-- Insert default rules
INSERT INTO escrow_auto_release_rules (
  contractor_tier,
  hold_period_days,
  require_photo_verification,
  min_photo_score,
  priority,
  is_active
) VALUES
  ('platinum', 1, TRUE, 0.6, 100, TRUE),
  ('gold', 3, TRUE, 0.7, 90, TRUE),
  ('silver', 5, TRUE, 0.7, 80, TRUE),
  ('bronze', 7, TRUE, 0.8, 70, TRUE),
  (NULL, 7, TRUE, 0.7, 50, TRUE) -- Default rule for all contractors
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE escrow_photo_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_auto_release_rules ENABLE ROW LEVEL SECURITY;

-- Escrow photo verification policies
CREATE POLICY "Users can view photo verification for their escrows"
  ON escrow_photo_verification FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM escrow_payments ep
      WHERE ep.id = escrow_photo_verification.escrow_id
      AND (ep.homeowner_id = auth.uid() OR ep.contractor_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Escrow auto-release rules (admin only, but visible to all for transparency)
CREATE POLICY "Everyone can view auto-release rules"
  ON escrow_auto_release_rules FOR SELECT
  USING (TRUE);

CREATE POLICY "Only admins can modify auto-release rules"
  ON escrow_auto_release_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE escrow_photo_verification IS 'Photo verification results for escrow release';
COMMENT ON TABLE escrow_auto_release_rules IS 'Rules for automatic escrow release based on contractor tier and job characteristics';

COMMENT ON COLUMN escrow_photo_verification.verification_score IS 'AI confidence score (0-1) indicating how well photo matches job description';
COMMENT ON COLUMN escrow_photo_verification.completion_indicators IS 'JSON array of completion indicators found in photo (e.g., ["clean_surface", "tools_removed", "work_completed"])';
COMMENT ON COLUMN escrow_auto_release_rules.hold_period_days IS 'Number of days to hold escrow after job completion before auto-release';
COMMENT ON COLUMN escrow_auto_release_rules.risk_multiplier IS 'Multiplier for hold period based on job risk level';

