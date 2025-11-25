-- Migration: Add Ground Truth Feedback Table
-- Created: 2025-12-02
-- Description: Creates table for storing manually labeled ground truth data for training the BuildingSurveyorService AI agent

-- ============================================================================
-- GROUND TRUTH FEEDBACK TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS building_surveyor_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Image identification
  image_url TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  
  -- Ground truth labels
  true_class VARCHAR(100) NOT NULL, -- e.g., "Structural Crack", "Mold", "Safe"
  true_severity VARCHAR(20) CHECK (true_severity IN ('early', 'midway', 'full')),
  true_damage_type VARCHAR(100),
  critical_hazard BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Context for stratification (used in Mondrian CP)
  property_type VARCHAR(50),
  property_age INTEGER,
  region VARCHAR(100),
  
  -- Metadata
  labeled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  labeled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_feedback_filename ON building_surveyor_feedback(filename);
CREATE INDEX IF NOT EXISTS idx_feedback_property_type ON building_surveyor_feedback(property_type, property_age, region);
CREATE INDEX IF NOT EXISTS idx_feedback_true_class ON building_surveyor_feedback(true_class);
CREATE INDEX IF NOT EXISTS idx_feedback_critical_hazard ON building_surveyor_feedback(critical_hazard) WHERE critical_hazard = true;
CREATE INDEX IF NOT EXISTS idx_feedback_labeled_at ON building_surveyor_feedback(labeled_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_building_surveyor_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_building_surveyor_feedback_updated_at
  BEFORE UPDATE ON building_surveyor_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_building_surveyor_feedback_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE building_surveyor_feedback ENABLE ROW LEVEL SECURITY;

-- Service role can manage all feedback
CREATE POLICY "Service role can manage feedback"
  ON building_surveyor_feedback
  FOR ALL
  USING (auth.role() = 'service_role');

-- Users can view their own labels
CREATE POLICY "Users can view own labels"
  ON building_surveyor_feedback
  FOR SELECT
  USING (auth.uid() = labeled_by);

-- Users can create their own labels
CREATE POLICY "Users can create own labels"
  ON building_surveyor_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = labeled_by);

-- Admins can view all labels
CREATE POLICY "Admins can view all labels"
  ON building_surveyor_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE building_surveyor_feedback IS 'Stores manually labeled ground truth data for training the BuildingSurveyorService AI agent';
COMMENT ON COLUMN building_surveyor_feedback.true_class IS 'Ground truth damage class (e.g., "Structural Crack", "Mold", "Safe")';
COMMENT ON COLUMN building_surveyor_feedback.critical_hazard IS 'Whether the image contains a dangerous fault that must not be missed';
COMMENT ON COLUMN building_surveyor_feedback.property_type IS 'Property type for Mondrian stratification (residential, commercial, rail, etc.)';
COMMENT ON COLUMN building_surveyor_feedback.property_age IS 'Property age in years for stratification';
COMMENT ON COLUMN building_surveyor_feedback.region IS 'Geographic region for stratification';

