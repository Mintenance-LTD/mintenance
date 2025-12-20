-- Combined Platform Enhancements Migration
-- This migration includes all enhancements for lead quality, contractor onboarding,
-- payment protection, communication, and dispute resolution

-- ============================================================================
-- 1. Phone Verification
-- ============================================================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verification_code TEXT,
ADD COLUMN IF NOT EXISTS phone_verification_code_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_phone_verification_code ON users(phone_verification_code) 
WHERE phone_verification_code IS NOT NULL;

COMMENT ON COLUMN users.phone_verified IS 'Whether the user has verified their phone number via SMS';
COMMENT ON COLUMN users.phone_verification_code IS 'Hashed SMS verification code (expires in 5 minutes)';
COMMENT ON COLUMN users.phone_verification_code_expires_at IS 'Expiration timestamp for verification code';
COMMENT ON COLUMN users.phone_verified_at IS 'Timestamp when phone was verified';

-- ============================================================================
-- 2. Serious Buyer Score
-- ============================================================================
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS serious_buyer_score INTEGER DEFAULT 0 CHECK (serious_buyer_score >= 0 AND serious_buyer_score <= 100);

CREATE INDEX IF NOT EXISTS idx_jobs_serious_buyer_score ON jobs(serious_buyer_score);

COMMENT ON COLUMN jobs.serious_buyer_score IS 'Score from 0-100 indicating how serious the buyer is (phone verified, previous jobs, budget, etc.)';

-- ============================================================================
-- 3. Background Check
-- ============================================================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS background_check_status VARCHAR(50) DEFAULT 'pending' 
  CHECK (background_check_status IN ('pending', 'in_progress', 'passed', 'failed', 'not_required')),
ADD COLUMN IF NOT EXISTS background_check_provider VARCHAR(100),
ADD COLUMN IF NOT EXISTS background_check_id TEXT,
ADD COLUMN IF NOT EXISTS background_check_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS background_check_result JSONB;

CREATE INDEX IF NOT EXISTS idx_users_background_check_status ON users(background_check_status);

COMMENT ON COLUMN users.background_check_status IS 'Status of background check: pending, in_progress, passed, failed, not_required';
COMMENT ON COLUMN users.background_check_provider IS 'Background check provider name (e.g., Checkr, GoodHire, Sterling)';
COMMENT ON COLUMN users.background_check_id IS 'External background check ID from provider';
COMMENT ON COLUMN users.background_check_completed_at IS 'Timestamp when background check was completed';
COMMENT ON COLUMN users.background_check_result IS 'JSON result from background check provider';

-- ============================================================================
-- 4. Skills Verification
-- ============================================================================
ALTER TABLE contractor_skills 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS test_score INTEGER CHECK (test_score >= 0 AND test_score <= 100),
ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_contractor_skills_verified ON contractor_skills(is_verified) WHERE is_verified = true;

COMMENT ON COLUMN contractor_skills.is_verified IS 'Whether this skill has been verified by admin or through testing';
COMMENT ON COLUMN contractor_skills.verified_by IS 'Admin user ID who verified this skill';
COMMENT ON COLUMN contractor_skills.verified_at IS 'Timestamp when skill was verified';
COMMENT ON COLUMN contractor_skills.test_score IS 'Score from skills test (0-100, passing is 70+)';
COMMENT ON COLUMN contractor_skills.certifications IS 'JSON array of certifications related to this skill';

-- ============================================================================
-- 5. Portfolio Verification
-- ============================================================================
ALTER TABLE contractor_posts 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_contractor_posts_verified ON contractor_posts(is_verified) WHERE is_verified = true;

COMMENT ON COLUMN contractor_posts.is_verified IS 'Whether this portfolio item has been verified by admin';
COMMENT ON COLUMN contractor_posts.verified_by IS 'Admin user ID who verified this portfolio item';
COMMENT ON COLUMN contractor_posts.verified_at IS 'Timestamp when portfolio item was verified';

-- ============================================================================
-- 6. Guarantee Program
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_job_guarantees_job_id ON job_guarantees(job_id);
CREATE INDEX IF NOT EXISTS idx_job_guarantees_contractor_id ON job_guarantees(contractor_id);
CREATE INDEX IF NOT EXISTS idx_job_guarantees_homeowner_id ON job_guarantees(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_job_guarantees_status ON job_guarantees(status);
CREATE INDEX IF NOT EXISTS idx_job_guarantees_end_date ON job_guarantees(guarantee_end_date);

COMMENT ON TABLE job_guarantees IS 'Platform-backed guarantee program (up to £2,500 per job, 30-day period)';
COMMENT ON COLUMN job_guarantees.guarantee_amount IS 'Guarantee amount (max £2,500)';
COMMENT ON COLUMN job_guarantees.guarantee_period_days IS 'Guarantee period in days (default 30)';
COMMENT ON COLUMN job_guarantees.claim_evidence IS 'JSON array of evidence (photos, documents) for claim';

-- ============================================================================
-- 7. Payout Tiers
-- ============================================================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS payout_tier VARCHAR(50) DEFAULT 'standard' 
  CHECK (payout_tier IN ('elite', 'trusted', 'standard')),
ADD COLUMN IF NOT EXISTS payout_speed_hours INTEGER DEFAULT 168 CHECK (payout_speed_hours > 0);

CREATE INDEX IF NOT EXISTS idx_users_payout_tier ON users(payout_tier);

COMMENT ON COLUMN users.payout_tier IS 'Payout tier: elite (24h), trusted (48h), standard (7 days)';
COMMENT ON COLUMN users.payout_speed_hours IS 'Payout speed in hours based on tier';

-- ============================================================================
-- 8. Dispute Workflow
-- ============================================================================
ALTER TABLE escrow_payments 
ADD COLUMN IF NOT EXISTS dispute_priority VARCHAR(50) DEFAULT 'medium' 
  CHECK (dispute_priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0 CHECK (escalation_level >= 0),
ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_escrow_payments_sla_deadline ON escrow_payments(sla_deadline) WHERE sla_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escrow_payments_priority ON escrow_payments(dispute_priority) WHERE status = 'disputed';

COMMENT ON COLUMN escrow_payments.dispute_priority IS 'Dispute priority: low (14 days), medium (7 days), high (3 days), critical (24 hours)';
COMMENT ON COLUMN escrow_payments.escalation_level IS 'Escalation level (0 = initial, increases with auto-escalation)';
COMMENT ON COLUMN escrow_payments.sla_deadline IS 'SLA deadline for dispute resolution';

-- ============================================================================
-- 9. Mediation
-- ============================================================================
ALTER TABLE escrow_payments 
ADD COLUMN IF NOT EXISTS mediation_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mediation_requested_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS mediation_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mediation_scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mediation_status VARCHAR(50) 
  CHECK (mediation_status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS mediation_mediator_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS mediation_outcome TEXT,
ADD COLUMN IF NOT EXISTS mediation_completed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_escrow_payments_mediation_status ON escrow_payments(mediation_status) WHERE mediation_requested = true;

COMMENT ON COLUMN escrow_payments.mediation_requested IS 'Whether mediation has been requested';
COMMENT ON COLUMN escrow_payments.mediation_requested_by IS 'User ID who requested mediation';
COMMENT ON COLUMN escrow_payments.mediation_scheduled_at IS 'Scheduled date/time for mediation session';
COMMENT ON COLUMN escrow_payments.mediation_status IS 'Status of mediation process';
COMMENT ON COLUMN escrow_payments.mediation_mediator_id IS 'Admin or third-party mediator assigned';
COMMENT ON COLUMN escrow_payments.mediation_outcome IS 'Outcome/result of mediation session';

