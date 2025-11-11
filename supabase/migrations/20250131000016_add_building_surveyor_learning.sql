-- Migration: Add Building Surveyor Learning Outcome Tracking
-- Created: 2025-01-31
-- Description: Optional enhancement table for tracking learning outcomes from building assessments

-- ============================================================================
-- BUILDING ASSESSMENT OUTCOMES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS building_assessment_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES building_assessments(id) ON DELETE CASCADE,
  
  -- Outcome type
  outcome_type VARCHAR(50) NOT NULL CHECK (outcome_type IN ('validation', 'repair', 'progression', 'contractor_feedback')),
  
  -- Actual outcomes (what really happened)
  actual_damage_type VARCHAR(100),
  actual_severity VARCHAR(20) CHECK (actual_severity IN ('early', 'midway', 'full')),
  actual_cost DECIMAL(10, 2),
  actual_urgency VARCHAR(20) CHECK (actual_urgency IN ('immediate', 'urgent', 'soon', 'planned', 'monitor')),
  
  -- Accuracy metrics
  accuracy_metrics JSONB DEFAULT '{}',
  
  -- Learning metadata
  learned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  learning_successful BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- Additional context
  metadata_jsonb JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE building_assessment_outcomes IS 'Tracks learning outcomes from building assessments for nested learning system';
COMMENT ON COLUMN building_assessment_outcomes.outcome_type IS 'Type of outcome: validation (human expert), repair (actual repair), progression (follow-up), contractor_feedback';
COMMENT ON COLUMN building_assessment_outcomes.accuracy_metrics IS 'JSON object with accuracy scores: {damageTypeAccuracy, severityAccuracy, costAccuracy, urgencyAccuracy, overallAccuracy}';

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_building_assessment_outcomes_assessment_id 
  ON building_assessment_outcomes(assessment_id);

CREATE INDEX IF NOT EXISTS idx_building_assessment_outcomes_outcome_type 
  ON building_assessment_outcomes(outcome_type);

CREATE INDEX IF NOT EXISTS idx_building_assessment_outcomes_learned_at 
  ON building_assessment_outcomes(learned_at DESC);

CREATE INDEX IF NOT EXISTS idx_building_assessment_outcomes_learning_successful 
  ON building_assessment_outcomes(learning_successful) 
  WHERE learning_successful = TRUE;

-- ============================================================================
-- HELPER FUNCTION: Check if assessment has been learned from
-- ============================================================================
CREATE OR REPLACE FUNCTION has_assessment_been_learned_from(
  p_assessment_id UUID,
  p_outcome_type VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_outcome_type IS NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM building_assessment_outcomes
    WHERE assessment_id = p_assessment_id
      AND learning_successful = TRUE;
  ELSE
    SELECT COUNT(*) INTO v_count
    FROM building_assessment_outcomes
    WHERE assessment_id = p_assessment_id
      AND outcome_type = p_outcome_type
      AND learning_successful = TRUE;
  END IF;
  
  RETURN v_count > 0;
END;
$$;

COMMENT ON FUNCTION has_assessment_been_learned_from IS 'Check if an assessment has already been learned from to prevent duplicate learning';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE building_assessment_outcomes ENABLE ROW LEVEL SECURITY;

-- Admins can read all outcomes
CREATE POLICY "Admins can read all assessment outcomes"
  ON building_assessment_outcomes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- System can insert outcomes (for learning triggers)
CREATE POLICY "System can insert assessment outcomes"
  ON building_assessment_outcomes
  FOR INSERT
  WITH CHECK (true); -- Learning is triggered server-side

-- Users can read outcomes for their own assessments
CREATE POLICY "Users can read outcomes for their assessments"
  ON building_assessment_outcomes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM building_assessments
      WHERE building_assessments.id = building_assessment_outcomes.assessment_id
      AND building_assessments.user_id = auth.uid()
    )
  );

