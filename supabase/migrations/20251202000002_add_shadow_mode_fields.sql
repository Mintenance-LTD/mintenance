-- Migration: Add Shadow Mode Fields to building_assessments
-- Created: 2025-12-02
-- Description: Extends building_assessments table to store shadow mode predictions and ground truth for training

-- ============================================================================
-- SHADOW MODE FIELDS
-- ============================================================================
ALTER TABLE building_assessments
  ADD COLUMN IF NOT EXISTS shadow_mode BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS predicted_class VARCHAR(100),
  ADD COLUMN IF NOT EXISTS predicted_severity VARCHAR(20),
  ADD COLUMN IF NOT EXISTS raw_probability DECIMAL(5,4),
  ADD COLUMN IF NOT EXISTS fusion_variance DECIMAL(5,4),
  ADD COLUMN IF NOT EXISTS context_features JSONB,
  ADD COLUMN IF NOT EXISTS sam3_evidence JSONB,
  ADD COLUMN IF NOT EXISTS gpt4_assessment JSONB,
  ADD COLUMN IF NOT EXISTS scene_graph_features JSONB,
  ADD COLUMN IF NOT EXISTS true_class VARCHAR(100),
  ADD COLUMN IF NOT EXISTS critical_hazard BOOLEAN;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_assessments_shadow_mode 
  ON building_assessments(shadow_mode) 
  WHERE shadow_mode = true;

CREATE INDEX IF NOT EXISTS idx_assessments_true_class 
  ON building_assessments(true_class) 
  WHERE true_class IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_shadow_mode_true_class 
  ON building_assessments(shadow_mode, true_class) 
  WHERE shadow_mode = true AND true_class IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN building_assessments.shadow_mode IS 'Indicates this assessment was run in shadow mode for training (predictions stored but not used for automation)';
COMMENT ON COLUMN building_assessments.predicted_class IS 'AI predicted damage class (from shadow mode execution)';
COMMENT ON COLUMN building_assessments.raw_probability IS 'Fusion mean from Bayesian Fusion (raw probability score)';
COMMENT ON COLUMN building_assessments.fusion_variance IS 'Fusion variance from Bayesian Fusion (uncertainty measure)';
COMMENT ON COLUMN building_assessments.context_features IS '12-dimensional context vector used by Safe-LUCB Critic';
COMMENT ON COLUMN building_assessments.sam3_evidence IS 'SAM 3 segmentation evidence stored for training';
COMMENT ON COLUMN building_assessments.gpt4_assessment IS 'GPT-4 assessment data stored for training';
COMMENT ON COLUMN building_assessments.scene_graph_features IS 'Scene graph features stored for training';
COMMENT ON COLUMN building_assessments.true_class IS 'Ground truth class label (from building_surveyor_feedback)';
COMMENT ON COLUMN building_assessments.critical_hazard IS 'Ground truth critical hazard flag (from building_surveyor_feedback)';

