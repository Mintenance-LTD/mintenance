-- Skills Verification Migration
-- Adds verification fields to contractor_skills table

ALTER TABLE contractor_skills 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS test_score INTEGER CHECK (test_score >= 0 AND test_score <= 100),
ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;

-- Index for verified skills
CREATE INDEX IF NOT EXISTS idx_contractor_skills_verified ON contractor_skills(is_verified) WHERE is_verified = true;

-- Add comments
COMMENT ON COLUMN contractor_skills.is_verified IS 'Whether this skill has been verified by admin or through testing';
COMMENT ON COLUMN contractor_skills.verified_by IS 'Admin user ID who verified this skill';
COMMENT ON COLUMN contractor_skills.verified_at IS 'Timestamp when skill was verified';
COMMENT ON COLUMN contractor_skills.test_score IS 'Score from skills test (0-100, passing is 70+)';
COMMENT ON COLUMN contractor_skills.certifications IS 'JSON array of certifications related to this skill';

