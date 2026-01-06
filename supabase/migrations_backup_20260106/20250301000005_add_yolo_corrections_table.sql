-- Migration: Add YOLO Corrections Table for Continuous Learning
-- Created: 2025-03-01
-- Description: Stores user corrections on YOLO detections for continuous model improvement
--
-- This enables the system to:
-- 1. Collect user feedback on AI detections
-- 2. Store corrected bounding boxes in YOLO format
-- 3. Merge with base training dataset
-- 4. Retrain model periodically

-- ============================================================================
-- YOLO CORRECTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS yolo_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to assessment
  assessment_id UUID NOT NULL REFERENCES building_assessments(id) ON DELETE CASCADE,
  
  -- Image information
  image_url TEXT NOT NULL,
  image_index INTEGER DEFAULT 0, -- Order in assessment
  
  -- Original AI detections (stored as JSONB for flexibility)
  original_detections JSONB NOT NULL DEFAULT '[]',
  -- Format: [{"class": "crack", "confidence": 0.85, "bbox": {"x": 100, "y": 200, "width": 50, "height": 30}}]
  
  -- User-corrected detections (YOLO format string)
  corrected_labels TEXT,
  -- Format: "0 0.5 0.5 0.1 0.1\n1 0.3 0.4 0.2 0.15"
  -- Each line: "class_id x_center y_center width height" (normalized 0-1)
  
  -- Correction metadata
  corrected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  corrected_at TIMESTAMP WITH TIME ZONE,
  
  -- Correction details
  corrections_made JSONB DEFAULT '{}',
  -- Format: {
  --   "added": [{"class": "crack", "bbox": {...}}],
  --   "removed": [{"class": "mold", "bbox": {...}}],
  --   "adjusted": [{"original": {...}, "corrected": {...}}],
  --   "class_changed": [{"original": {...}, "corrected": {...}}]
  -- }
  
  -- Quality metrics
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  correction_quality VARCHAR(20) CHECK (correction_quality IN ('expert', 'verified', 'user')),
  
  -- Status workflow
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'needs_review')
  ),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- Training metadata
  used_in_training BOOLEAN DEFAULT FALSE,
  training_version VARCHAR(50), -- Which model version used this correction
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_yolo_corrections_assessment 
ON yolo_corrections(assessment_id);

CREATE INDEX IF NOT EXISTS idx_yolo_corrections_status 
ON yolo_corrections(status) WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_yolo_corrections_training 
ON yolo_corrections(used_in_training, training_version);

CREATE INDEX IF NOT EXISTS idx_yolo_corrections_created 
ON yolo_corrections(created_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE yolo_corrections IS 
  'Stores user corrections on YOLO detections for continuous model learning. Corrections are exported to YOLO format and merged with base training dataset for retraining.';

COMMENT ON COLUMN yolo_corrections.original_detections IS 
  'Original AI detections in JSON format. Used for comparison and learning.';

COMMENT ON COLUMN yolo_corrections.corrected_labels IS 
  'User-corrected detections in YOLO format (class_id x_center y_center width height per line, normalized 0-1).';

COMMENT ON COLUMN yolo_corrections.corrections_made IS 
  'Detailed breakdown of what corrections were made: added, removed, adjusted, class_changed.';

COMMENT ON COLUMN yolo_corrections.used_in_training IS 
  'Whether this correction has been used in a training run. Prevents duplicate usage.';

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_yolo_corrections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_yolo_corrections_updated_at
BEFORE UPDATE ON yolo_corrections
FOR EACH ROW
EXECUTE FUNCTION update_yolo_corrections_updated_at();

-- ============================================================================
-- RLS POLICIES (if needed)
-- ============================================================================
-- Users can view their own corrections
-- Service role can manage all corrections

