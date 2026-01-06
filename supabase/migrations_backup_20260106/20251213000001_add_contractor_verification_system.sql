-- ============================================================================
-- CONTRACTOR VERIFICATION ENHANCEMENT SYSTEM
-- Created: 2025-12-13
-- Description: Adds DBS checks, personality assessments, and profile boost system
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DBS CHECK TRACKING (UK-Specific)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contractor_dbs_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- DBS Details
  dbs_type VARCHAR(50) NOT NULL CHECK (dbs_type IN ('basic', 'standard', 'enhanced')),
  certificate_number VARCHAR(100),
  check_date DATE,
  issue_date DATE,

  -- Provider details
  provider VARCHAR(100), -- 'dbs_online', 'gbgroup', 'ucheck'
  provider_check_id VARCHAR(255),

  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'clear', 'flagged', 'expired', 'rejected')),

  -- Results (encrypted sensitive data)
  disclosure_details JSONB,
  admin_notes TEXT, -- Private admin notes

  -- Expiry tracking (DBS checks expire after 3 years)
  expiry_date DATE,
  expiry_reminder_sent BOOLEAN DEFAULT FALSE,

  -- Profile boost tracking
  profile_boost_applied BOOLEAN DEFAULT FALSE,
  boost_percentage INTEGER DEFAULT 0 CHECK (boost_percentage BETWEEN 0 AND 25),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(contractor_id, certificate_number)
);

-- Indexes for DBS checks
CREATE INDEX idx_contractor_dbs_checks_contractor_id ON contractor_dbs_checks(contractor_id);
CREATE INDEX idx_contractor_dbs_checks_status ON contractor_dbs_checks(status);
CREATE INDEX idx_contractor_dbs_checks_expiry ON contractor_dbs_checks(expiry_date) WHERE status = 'clear';

-- Comments
COMMENT ON TABLE contractor_dbs_checks IS 'UK DBS (Disclosure and Barring Service) checks for contractors';
COMMENT ON COLUMN contractor_dbs_checks.dbs_type IS 'Basic (£18), Standard (£23), or Enhanced (£44) DBS check';
COMMENT ON COLUMN contractor_dbs_checks.disclosure_details IS 'Encrypted JSON containing sensitive disclosure information';
COMMENT ON COLUMN contractor_dbs_checks.boost_percentage IS 'Profile visibility boost: Basic=10%, Standard=15%, Enhanced=25%';

-- ============================================================================
-- 2. PERSONALITY ASSESSMENT RESULTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS contractor_personality_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Assessment type and version
  assessment_type VARCHAR(100) NOT NULL DEFAULT 'big_five_trades',
  assessment_version VARCHAR(50) DEFAULT 'v1.0',

  -- Big Five personality traits (0-100 scale)
  openness_score INTEGER CHECK (openness_score BETWEEN 0 AND 100),
  conscientiousness_score INTEGER CHECK (conscientiousness_score BETWEEN 0 AND 100),
  extraversion_score INTEGER CHECK (extraversion_score BETWEEN 0 AND 100),
  agreeableness_score INTEGER CHECK (agreeableness_score BETWEEN 0 AND 100),
  neuroticism_score INTEGER CHECK (neuroticism_score BETWEEN 0 AND 100),

  -- Derived traits for trades (0-100 scale)
  reliability_score INTEGER CHECK (reliability_score BETWEEN 0 AND 100), -- Based on conscientiousness
  communication_score INTEGER CHECK (communication_score BETWEEN 0 AND 100), -- Based on extraversion + agreeableness
  problem_solving_score INTEGER CHECK (problem_solving_score BETWEEN 0 AND 100), -- Based on openness
  stress_tolerance_score INTEGER CHECK (stress_tolerance_score BETWEEN 0 AND 100), -- Based on neuroticism (inverted)

  -- Overall compatibility
  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),

  -- Job type recommendations based on personality
  recommended_job_types TEXT[], -- e.g., ['emergency_repairs', 'large_projects', 'detailed_finishing']
  cautioned_job_types TEXT[], -- Job types to be cautious with

  -- Profile boost tracking
  profile_boost_applied BOOLEAN DEFAULT FALSE,
  boost_percentage INTEGER DEFAULT 0 CHECK (boost_percentage BETWEEN 0 AND 15),

  -- Assessment metadata
  total_questions INTEGER,
  questions_answered INTEGER,
  completion_percentage INTEGER,
  completed_at TIMESTAMPTZ,
  time_taken_minutes INTEGER,

  -- Raw response data (for analysis)
  response_data JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Only one active assessment per contractor
  UNIQUE(contractor_id)
);

-- Indexes for personality assessments
CREATE INDEX idx_contractor_personality_contractor_id ON contractor_personality_assessments(contractor_id);
CREATE INDEX idx_contractor_personality_completed ON contractor_personality_assessments(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_contractor_personality_overall_score ON contractor_personality_assessments(overall_score DESC);

-- Comments
COMMENT ON TABLE contractor_personality_assessments IS 'Big Five personality assessments tailored for trades industry';
COMMENT ON COLUMN contractor_personality_assessments.reliability_score IS 'Predicts on-time completion and follow-through';
COMMENT ON COLUMN contractor_personality_assessments.communication_score IS 'Predicts customer interaction quality';
COMMENT ON COLUMN contractor_personality_assessments.problem_solving_score IS 'Predicts handling of complex/unexpected issues';
COMMENT ON COLUMN contractor_personality_assessments.stress_tolerance_score IS 'Predicts performance under pressure/emergency situations';

-- ============================================================================
-- 3. UNIFIED PROFILE BOOST CALCULATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS contractor_profile_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Base trust score from existing TrustScoreService (0.0 - 1.0)
  base_trust_score DECIMAL(3,2) DEFAULT 0.50 CHECK (base_trust_score BETWEEN 0 AND 1),

  -- Verification boosts (percentages)
  dbs_check_boost INTEGER DEFAULT 0 CHECK (dbs_check_boost BETWEEN 0 AND 25),
  admin_verified_boost INTEGER DEFAULT 0 CHECK (admin_verified_boost BETWEEN 0 AND 15),
  phone_verified_boost INTEGER DEFAULT 0 CHECK (phone_verified_boost BETWEEN 0 AND 5),
  email_verified_boost INTEGER DEFAULT 0 CHECK (email_verified_boost BETWEEN 0 AND 5),

  -- Quality boosts (percentages)
  personality_assessment_boost INTEGER DEFAULT 0 CHECK (personality_assessment_boost BETWEEN 0 AND 15),
  portfolio_completeness_boost INTEGER DEFAULT 0 CHECK (portfolio_completeness_boost BETWEEN 0 AND 10),
  certifications_boost INTEGER DEFAULT 0 CHECK (certifications_boost BETWEEN 0 AND 10),
  insurance_verified_boost INTEGER DEFAULT 0 CHECK (insurance_verified_boost BETWEEN 0 AND 10),

  -- Calculated fields
  total_boost_percentage INTEGER GENERATED ALWAYS AS (
    dbs_check_boost +
    admin_verified_boost +
    phone_verified_boost +
    email_verified_boost +
    personality_assessment_boost +
    portfolio_completeness_boost +
    certifications_boost +
    insurance_verified_boost
  ) STORED,

  -- Final ranking score (0-100)
  -- Base trust (0-50 points) + Verification boosts (0-50 points) = Max 100
  ranking_score INTEGER GENERATED ALWAYS AS (
    LEAST(100, ROUND((base_trust_score * 50)::numeric + total_boost_percentage))
  ) STORED,

  -- Tier classification based on ranking score
  tier VARCHAR(20) GENERATED ALWAYS AS (
    CASE
      WHEN ROUND((base_trust_score * 50)::numeric + total_boost_percentage) >= 80 THEN 'elite'
      WHEN ROUND((base_trust_score * 50)::numeric + total_boost_percentage) >= 60 THEN 'premium'
      WHEN ROUND((base_trust_score * 50)::numeric + total_boost_percentage) >= 40 THEN 'verified'
      ELSE 'standard'
    END
  ) STORED,

  -- Metadata
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculation_details JSONB, -- Breakdown of how score was calculated

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profile boosts
CREATE INDEX idx_contractor_profile_boosts_ranking ON contractor_profile_boosts(ranking_score DESC);
CREATE INDEX idx_contractor_profile_boosts_tier ON contractor_profile_boosts(tier);
CREATE INDEX idx_contractor_profile_boosts_contractor ON contractor_profile_boosts(contractor_id);

-- Comments
COMMENT ON TABLE contractor_profile_boosts IS 'Unified profile boost and ranking system for contractors';
COMMENT ON COLUMN contractor_profile_boosts.base_trust_score IS 'From existing TrustScoreService: completion rate, disputes, ratings, tenure';
COMMENT ON COLUMN contractor_profile_boosts.ranking_score IS 'Final 0-100 score used for search ranking and visibility';
COMMENT ON COLUMN contractor_profile_boosts.tier IS 'Elite (80+), Premium (60-79), Verified (40-59), Standard (<40)';

-- ============================================================================
-- 4. PERSONALITY ASSESSMENT QUESTIONS LIBRARY
-- ============================================================================

CREATE TABLE IF NOT EXISTS personality_assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Question details
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_category VARCHAR(50), -- 'reliability', 'communication', 'problem_solving', 'stress_tolerance'

  -- Scoring
  trait VARCHAR(50) NOT NULL, -- 'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'
  reverse_scored BOOLEAN DEFAULT FALSE, -- If true, answer is inverted (1=5, 2=4, 3=3, 4=2, 5=1)

  -- Assessment version
  assessment_version VARCHAR(50) DEFAULT 'v1.0',

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(question_number, assessment_version)
);

CREATE INDEX idx_personality_questions_version ON personality_assessment_questions(assessment_version, is_active);
CREATE INDEX idx_personality_questions_trait ON personality_assessment_questions(trait);

COMMENT ON TABLE personality_assessment_questions IS 'Question library for personality assessments';

-- ============================================================================
-- 5. VERIFICATION EVENTS LOG (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contractor_verification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event details
  event_type VARCHAR(100) NOT NULL, -- 'dbs_check_initiated', 'personality_test_completed', 'boost_calculated', etc.
  event_category VARCHAR(50), -- 'dbs', 'personality', 'boost', 'verification'

  -- Event data
  event_data JSONB,

  -- Actor (who triggered the event)
  triggered_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for system events
  trigger_source VARCHAR(50), -- 'contractor_portal', 'admin_panel', 'system_automated', 'api'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_events_contractor ON contractor_verification_events(contractor_id, created_at DESC);
CREATE INDEX idx_verification_events_type ON contractor_verification_events(event_type);
CREATE INDEX idx_verification_events_category ON contractor_verification_events(event_category);

COMMENT ON TABLE contractor_verification_events IS 'Audit log for all verification-related events';

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- DBS Checks: Contractors can view/manage their own, admins can view all
ALTER TABLE contractor_dbs_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can view their own DBS checks" ON contractor_dbs_checks
  FOR SELECT USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can insert their own DBS checks" ON contractor_dbs_checks
  FOR INSERT WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "Contractors can update their own DBS checks" ON contractor_dbs_checks
  FOR UPDATE USING (contractor_id = auth.uid());

-- Personality Assessments: Contractors only, private data
ALTER TABLE contractor_personality_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can view their own personality assessments" ON contractor_personality_assessments
  FOR SELECT USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can insert their own personality assessments" ON contractor_personality_assessments
  FOR INSERT WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "Contractors can update their own personality assessments" ON contractor_personality_assessments
  FOR UPDATE USING (contractor_id = auth.uid());

-- Profile Boosts: Contractors can view their own, everyone can see ranking for search
ALTER TABLE contractor_profile_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can view their own profile boosts" ON contractor_profile_boosts
  FOR SELECT USING (contractor_id = auth.uid());

CREATE POLICY "Public can view ranking scores for search" ON contractor_profile_boosts
  FOR SELECT USING (true)
  WITH CHECK (false); -- Read-only for public, write is system-only

-- Questions: Public read for assessment taking
ALTER TABLE personality_assessment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active assessment questions" ON personality_assessment_questions
  FOR SELECT USING (is_active = true);

-- Verification Events: Contractors can view their own history
ALTER TABLE contractor_verification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can view their own verification events" ON contractor_verification_events
  FOR SELECT USING (contractor_id = auth.uid());

-- ============================================================================
-- 7. AUTOMATIC UPDATE TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE TRIGGER update_contractor_dbs_checks_updated_at
  BEFORE UPDATE ON contractor_dbs_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_personality_updated_at
  BEFORE UPDATE ON contractor_personality_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_profile_boosts_updated_at
  BEFORE UPDATE ON contractor_profile_boosts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personality_questions_updated_at
  BEFORE UPDATE ON personality_assessment_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate profile boost for a contractor
CREATE OR REPLACE FUNCTION calculate_contractor_profile_boost(p_contractor_id UUID)
RETURNS TABLE(
  contractor_id UUID,
  ranking_score INTEGER,
  tier VARCHAR(20),
  boosts JSONB
) AS $$
DECLARE
  v_dbs_boost INTEGER := 0;
  v_personality_boost INTEGER := 0;
  v_admin_boost INTEGER := 0;
  v_phone_boost INTEGER := 0;
  v_email_boost INTEGER := 0;
  v_portfolio_boost INTEGER := 0;
  v_certs_boost INTEGER := 0;
  v_insurance_boost INTEGER := 0;
  v_base_trust DECIMAL(3,2) := 0.50;
BEGIN
  -- Check DBS verification
  SELECT
    CASE
      WHEN dbs_type = 'enhanced' AND status = 'clear' THEN 25
      WHEN dbs_type = 'standard' AND status = 'clear' THEN 15
      WHEN dbs_type = 'basic' AND status = 'clear' THEN 10
      ELSE 0
    END
  INTO v_dbs_boost
  FROM contractor_dbs_checks
  WHERE contractor_dbs_checks.contractor_id = p_contractor_id
    AND status = 'clear'
    AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check personality assessment (15% if completed with good score)
  SELECT
    CASE
      WHEN overall_score >= 70 THEN 15
      WHEN overall_score >= 50 THEN 10
      WHEN overall_score >= 30 THEN 5
      ELSE 0
    END
  INTO v_personality_boost
  FROM contractor_personality_assessments
  WHERE contractor_personality_assessments.contractor_id = p_contractor_id
    AND completed_at IS NOT NULL;

  -- Check admin verification
  SELECT
    CASE WHEN admin_verified = true THEN 15 ELSE 0 END
  INTO v_admin_boost
  FROM users
  WHERE id = p_contractor_id;

  -- Check phone verification
  SELECT
    CASE WHEN phone_verified_at IS NOT NULL THEN 5 ELSE 0 END
  INTO v_phone_boost
  FROM users
  WHERE id = p_contractor_id;

  -- Check email verification
  SELECT
    CASE WHEN email_verified = true THEN 5 ELSE 0 END
  INTO v_email_boost
  FROM users
  WHERE id = p_contractor_id;

  -- Check portfolio completeness (10% if 5+ items)
  SELECT
    CASE WHEN COUNT(*) >= 5 THEN 10
         WHEN COUNT(*) >= 3 THEN 7
         WHEN COUNT(*) >= 1 THEN 3
         ELSE 0
    END
  INTO v_portfolio_boost
  FROM contractor_posts
  WHERE contractor_posts.contractor_id = p_contractor_id
    AND is_public = true;

  -- Check certifications (10% if 3+ verified skills)
  SELECT
    CASE WHEN COUNT(*) >= 3 THEN 10
         WHEN COUNT(*) >= 1 THEN 5
         ELSE 0
    END
  INTO v_certs_boost
  FROM contractor_skills
  WHERE contractor_skills.contractor_id = p_contractor_id
    AND is_verified = true;

  -- Get base trust score from contractor_trust_scores
  SELECT COALESCE(trust_score, 0.50)
  INTO v_base_trust
  FROM contractor_trust_scores
  WHERE contractor_trust_scores.contractor_id = p_contractor_id;

  -- Upsert into profile boosts table
  INSERT INTO contractor_profile_boosts (
    contractor_id,
    base_trust_score,
    dbs_check_boost,
    admin_verified_boost,
    phone_verified_boost,
    email_verified_boost,
    personality_assessment_boost,
    portfolio_completeness_boost,
    certifications_boost,
    insurance_verified_boost,
    last_calculated_at,
    calculation_details
  ) VALUES (
    p_contractor_id,
    v_base_trust,
    v_dbs_boost,
    v_admin_boost,
    v_phone_boost,
    v_email_boost,
    v_personality_boost,
    v_portfolio_boost,
    v_certs_boost,
    v_insurance_boost,
    NOW(),
    jsonb_build_object(
      'dbs_boost', v_dbs_boost,
      'personality_boost', v_personality_boost,
      'admin_boost', v_admin_boost,
      'phone_boost', v_phone_boost,
      'email_boost', v_email_boost,
      'portfolio_boost', v_portfolio_boost,
      'certs_boost', v_certs_boost,
      'insurance_boost', v_insurance_boost,
      'base_trust_score', v_base_trust
    )
  )
  ON CONFLICT (contractor_id)
  DO UPDATE SET
    base_trust_score = EXCLUDED.base_trust_score,
    dbs_check_boost = EXCLUDED.dbs_check_boost,
    admin_verified_boost = EXCLUDED.admin_verified_boost,
    phone_verified_boost = EXCLUDED.phone_verified_boost,
    email_verified_boost = EXCLUDED.email_verified_boost,
    personality_assessment_boost = EXCLUDED.personality_assessment_boost,
    portfolio_completeness_boost = EXCLUDED.portfolio_completeness_boost,
    certifications_boost = EXCLUDED.certifications_boost,
    insurance_verified_boost = EXCLUDED.insurance_verified_boost,
    last_calculated_at = NOW(),
    calculation_details = EXCLUDED.calculation_details;

  -- Return results
  RETURN QUERY
  SELECT
    cpb.contractor_id,
    cpb.ranking_score,
    cpb.tier,
    cpb.calculation_details as boosts
  FROM contractor_profile_boosts cpb
  WHERE cpb.contractor_id = p_contractor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_contractor_profile_boost IS 'Calculates and updates profile boost score for a contractor based on all verification factors';

-- ============================================================================
-- 9. GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON contractor_dbs_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON contractor_personality_assessments TO authenticated;
GRANT SELECT ON contractor_profile_boosts TO authenticated;
GRANT SELECT ON personality_assessment_questions TO authenticated;
GRANT SELECT ON contractor_verification_events TO authenticated;

COMMIT;
