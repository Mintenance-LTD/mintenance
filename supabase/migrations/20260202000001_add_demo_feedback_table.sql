-- Migration: Add Demo Feedback Table for Training Data Collection
-- Created: 2026-02-02
-- Description: Captures user feedback on demo assessments for model training

-- ============================================================================
-- DEMO FEEDBACK TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS demo_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES building_assessments(id) ON DELETE CASCADE,

  -- Feedback type
  is_accurate BOOLEAN NOT NULL, -- true = "Yes, accurate", false = "No, needs correction"

  -- Correction details (if is_accurate = false)
  corrected_damage_type VARCHAR(100),
  corrected_severity VARCHAR(20) CHECK (corrected_severity IN ('early', 'midway', 'full') OR corrected_severity IS NULL),
  corrected_cost_min DECIMAL(10, 2),
  corrected_cost_max DECIMAL(10, 2),
  correction_notes TEXT,

  -- Additional feedback
  feedback_text TEXT,
  user_email VARCHAR(255), -- Optional: for follow-up on valuable corrections

  -- Metadata
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE demo_feedback IS 'User feedback on demo assessments for training GPT-4 Vision model';
COMMENT ON COLUMN demo_feedback.is_accurate IS 'True if user confirms assessment is accurate, false if corrections needed';
COMMENT ON COLUMN demo_feedback.corrected_damage_type IS 'User-provided correct damage type if AI was wrong';
COMMENT ON COLUMN demo_feedback.correction_notes IS 'Detailed explanation of what was wrong and why';

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_demo_feedback_assessment_id ON demo_feedback(assessment_id);
CREATE INDEX IF NOT EXISTS idx_demo_feedback_is_accurate ON demo_feedback(is_accurate);
CREATE INDEX IF NOT EXISTS idx_demo_feedback_created_at ON demo_feedback(created_at DESC);

-- Index for finding assessments needing review (inaccurate feedback)
CREATE INDEX IF NOT EXISTS idx_demo_feedback_needs_review
  ON demo_feedback(is_accurate, created_at DESC)
  WHERE is_accurate = false;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
-- Enable RLS
ALTER TABLE demo_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (demo users can submit feedback)
CREATE POLICY "Allow anonymous demo feedback submission"
  ON demo_feedback
  FOR INSERT
  WITH CHECK (true);

-- Only admins can view feedback
CREATE POLICY "Admins can view all feedback"
  ON demo_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- FUNCTION: Get Training Labels from Demo Feedback
-- ============================================================================
-- This function helps convert demo feedback into training labels for model improvement
CREATE OR REPLACE FUNCTION get_demo_training_labels(
  min_confidence_threshold INTEGER DEFAULT 80
)
RETURNS TABLE (
  assessment_id UUID,
  image_urls TEXT[],
  true_damage_type VARCHAR(100),
  true_severity VARCHAR(20),
  true_cost_min DECIMAL(10, 2),
  true_cost_max DECIMAL(10, 2),
  ai_damage_type VARCHAR(100),
  ai_severity VARCHAR(20),
  ai_confidence INTEGER,
  feedback_count INTEGER,
  accurate_count INTEGER,
  inaccurate_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ba.id as assessment_id,
    ARRAY_AGG(DISTINCT ai.image_url) as image_urls,
    -- Use corrected values if available, otherwise use AI values
    COALESCE(
      (SELECT df.corrected_damage_type
       FROM demo_feedback df
       WHERE df.assessment_id = ba.id
         AND df.is_accurate = false
         AND df.corrected_damage_type IS NOT NULL
       LIMIT 1),
      ba.damage_type
    ) as true_damage_type,
    COALESCE(
      (SELECT df.corrected_severity
       FROM demo_feedback df
       WHERE df.assessment_id = ba.id
         AND df.is_accurate = false
         AND df.corrected_severity IS NOT NULL
       LIMIT 1),
      ba.severity
    ) as true_severity,
    (SELECT df.corrected_cost_min
     FROM demo_feedback df
     WHERE df.assessment_id = ba.id
       AND df.is_accurate = false
       AND df.corrected_cost_min IS NOT NULL
     LIMIT 1) as true_cost_min,
    (SELECT df.corrected_cost_max
     FROM demo_feedback df
     WHERE df.assessment_id = ba.id
       AND df.is_accurate = false
       AND df.corrected_cost_max IS NOT NULL
     LIMIT 1) as true_cost_max,
    ba.damage_type as ai_damage_type,
    ba.severity as ai_severity,
    ba.confidence as ai_confidence,
    COUNT(df.id)::INTEGER as feedback_count,
    SUM(CASE WHEN df.is_accurate THEN 1 ELSE 0 END)::INTEGER as accurate_count,
    SUM(CASE WHEN NOT df.is_accurate THEN 1 ELSE 0 END)::INTEGER as inaccurate_count
  FROM building_assessments ba
  LEFT JOIN demo_feedback df ON df.assessment_id = ba.id
  LEFT JOIN assessment_images ai ON ai.assessment_id = ba.id
  WHERE ba.shadow_mode = true
    AND ba.confidence >= min_confidence_threshold
  GROUP BY ba.id, ba.damage_type, ba.severity, ba.confidence
  HAVING COUNT(df.id) > 0; -- Only include assessments with feedback
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_demo_training_labels IS 'Converts demo feedback into training labels for model improvement';
