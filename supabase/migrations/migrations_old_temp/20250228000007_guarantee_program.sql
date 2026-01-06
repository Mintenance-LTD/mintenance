-- Guarantee Program Migration
-- Creates job_guarantees table for platform-backed guarantee program

CREATE TABLE IF NOT EXISTS job_guarantees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  homeowner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Guarantee details
  guarantee_amount DECIMAL(10, 2) NOT NULL CHECK (guarantee_amount > 0 AND guarantee_amount <= 2500),
  guarantee_period_days INTEGER DEFAULT 30 CHECK (guarantee_period_days > 0),
  guarantee_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  guarantee_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'resolved', 'expired')),
  
  -- Claim information
  claim_submitted_at TIMESTAMP WITH TIME ZONE,
  claim_reason TEXT,
  claim_evidence JSONB DEFAULT '[]'::jsonb,
  claim_resolution TEXT,
  claim_resolved_at TIMESTAMP WITH TIME ZONE,
  claim_resolved_by UUID REFERENCES users(id),
  claim_payout_amount DECIMAL(10, 2),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_guarantees_job_id ON job_guarantees(job_id);
CREATE INDEX IF NOT EXISTS idx_job_guarantees_contractor_id ON job_guarantees(contractor_id);
CREATE INDEX IF NOT EXISTS idx_job_guarantees_homeowner_id ON job_guarantees(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_job_guarantees_status ON job_guarantees(status);
CREATE INDEX IF NOT EXISTS idx_job_guarantees_end_date ON job_guarantees(guarantee_end_date);

-- Add comments
COMMENT ON TABLE job_guarantees IS 'Platform-backed guarantee program (up to £2,500 per job, 30-day period)';
COMMENT ON COLUMN job_guarantees.guarantee_amount IS 'Guarantee amount (max £2,500)';
COMMENT ON COLUMN job_guarantees.guarantee_period_days IS 'Guarantee period in days (default 30)';
COMMENT ON COLUMN job_guarantees.claim_evidence IS 'JSON array of evidence (photos, documents) for claim';

