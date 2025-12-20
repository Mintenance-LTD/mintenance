-- Migration: Add Building Surveyor AI Assessment Tables
-- Created: 2025-01-XX
-- Description: Creates tables for Building Surveyor AI - damage assessments, images, and validation workflow

-- ============================================================================
-- BUILDING ASSESSMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS building_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Cache key for deduplication (hash of image URLs)
  cache_key VARCHAR(64) UNIQUE,
  
  -- Core assessment data
  damage_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('early', 'midway', 'full')),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  
  -- Scores
  safety_score INTEGER NOT NULL CHECK (safety_score >= 0 AND safety_score <= 100),
  compliance_score INTEGER NOT NULL CHECK (compliance_score >= 0 AND compliance_score <= 100),
  insurance_risk_score INTEGER NOT NULL CHECK (insurance_risk_score >= 0 AND insurance_risk_score <= 100),
  urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('immediate', 'urgent', 'soon', 'planned', 'monitor')),
  
  -- Full assessment JSON (stores complete Phase1BuildingAssessment)
  assessment_data JSONB NOT NULL DEFAULT '{}',
  
  -- Validation workflow
  validation_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'rejected', 'needs_review')),
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMP WITH TIME ZONE,
  validation_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE building_assessments IS 'Stores AI building damage assessments from GPT-4 Vision';
COMMENT ON COLUMN building_assessments.cache_key IS 'SHA256 hash of image URLs for caching duplicate assessments';
COMMENT ON COLUMN building_assessments.assessment_data IS 'Complete Phase1BuildingAssessment JSON structure';
COMMENT ON COLUMN building_assessments.validation_status IS 'Status in human validation workflow for training data';

-- ============================================================================
-- ASSESSMENT IMAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assessment_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES building_assessments(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_index INTEGER NOT NULL CHECK (image_index >= 0 AND image_index < 4),
  
  -- Image metadata
  image_hash VARCHAR(64), -- SHA256 hash of image for deduplication
  file_size INTEGER, -- Size in bytes
  mime_type VARCHAR(50),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE assessment_images IS 'Links images to building assessments';
COMMENT ON COLUMN assessment_images.image_index IS 'Order of image in assessment (0-3)';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for building_assessments
CREATE INDEX IF NOT EXISTS idx_building_assessments_user_id ON building_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_building_assessments_cache_key ON building_assessments(cache_key);
CREATE INDEX IF NOT EXISTS idx_building_assessments_validation_status ON building_assessments(validation_status);
CREATE INDEX IF NOT EXISTS idx_building_assessments_damage_type ON building_assessments(damage_type);
CREATE INDEX IF NOT EXISTS idx_building_assessments_severity ON building_assessments(severity);
CREATE INDEX IF NOT EXISTS idx_building_assessments_urgency ON building_assessments(urgency);
CREATE INDEX IF NOT EXISTS idx_building_assessments_created_at ON building_assessments(created_at DESC);

-- Indexes for assessment_images
CREATE INDEX IF NOT EXISTS idx_assessment_images_assessment_id ON assessment_images(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_images_image_hash ON assessment_images(image_hash);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_building_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_building_assessments_updated_at
  BEFORE UPDATE ON building_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_building_assessments_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE building_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_images ENABLE ROW LEVEL SECURITY;

-- Users can view their own assessments
CREATE POLICY "Users can view own assessments"
  ON building_assessments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own assessments
CREATE POLICY "Users can create own assessments"
  ON building_assessments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all assessments
CREATE POLICY "Admins can view all assessments"
  ON building_assessments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update validation status
CREATE POLICY "Admins can update assessments"
  ON building_assessments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can view images for their assessments
CREATE POLICY "Users can view own assessment images"
  ON assessment_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM building_assessments
      WHERE building_assessments.id = assessment_images.assessment_id
      AND building_assessments.user_id = auth.uid()
    )
  );

-- Users can create images for their assessments
CREATE POLICY "Users can create own assessment images"
  ON assessment_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM building_assessments
      WHERE building_assessments.id = assessment_images.assessment_id
      AND building_assessments.user_id = auth.uid()
    )
  );

-- Admins can view all assessment images
CREATE POLICY "Admins can view all assessment images"
  ON assessment_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

