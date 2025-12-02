-- Migration: SAM3-Enhanced Knowledge Distillation System
-- Created: 2025-12-03
-- Description: Tables for capturing SAM3 segmentation outputs and GPT-4 Vision labels for training
--
-- This enables:
-- 1. Store SAM3 precise segmentation masks alongside YOLO detections
-- 2. Capture GPT-4 Vision outputs as training labels for internal classifier
-- 3. Generate pseudo-labels using SAM3 for unlabeled images
-- 4. Export SAM3-enhanced YOLO training data with better ground truth

-- ============================================================================
-- GPT-4 TRAINING LABELS TABLE
-- ============================================================================
-- Store GPT-4 Vision outputs to train internal damage classification model
CREATE TABLE IF NOT EXISTS gpt4_training_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to assessment
  assessment_id UUID REFERENCES building_assessments(id) ON DELETE CASCADE,

  -- Images analyzed
  image_urls TEXT[] NOT NULL,

  -- Complete GPT-4 Vision response
  gpt4_response JSONB NOT NULL,
  -- Format: Full Phase1BuildingAssessment structure

  -- Extracted classification labels
  damage_type TEXT NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('early', 'midway', 'full')),
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 100),

  -- Safety and compliance data
  safety_hazards JSONB DEFAULT '[]',
  compliance_issues JSONB DEFAULT '[]',
  insurance_risk JSONB DEFAULT '{}',

  -- Context that GPT-4 had access to
  context_data JSONB DEFAULT '{}',
  -- Format: { location, propertyType, ageOfProperty, etc. }

  -- Training metadata
  used_in_training BOOLEAN DEFAULT FALSE,
  training_version TEXT,
  training_job_id TEXT,

  -- Quality indicators
  response_quality VARCHAR(20) CHECK (response_quality IN ('high', 'medium', 'low', 'uncertain')),
  human_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SAM3 TRAINING MASKS TABLE
-- ============================================================================
-- Store SAM3 segmentation outputs for enhanced YOLO training
CREATE TABLE IF NOT EXISTS sam3_training_masks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to assessment
  assessment_id UUID REFERENCES building_assessments(id) ON DELETE CASCADE,

  -- Image information
  image_url TEXT NOT NULL,
  image_index INTEGER DEFAULT 0,

  -- Damage type being segmented
  damage_type TEXT NOT NULL,

  -- SAM3 segmentation outputs
  masks JSONB NOT NULL,
  -- Format: [[[pixel arrays]]] - 3D array of binary masks

  boxes JSONB NOT NULL,
  -- Format: [[x, y, w, h]] - bounding boxes for each instance

  scores FLOAT[] NOT NULL,
  -- Confidence scores for each mask/box pair

  num_instances INTEGER NOT NULL DEFAULT 0,
  -- Number of detected instances

  -- Derived metrics
  total_affected_area INTEGER,
  -- Sum of all mask pixels

  average_confidence FLOAT,
  -- Average of scores array

  -- Link to YOLO detection (if available)
  yolo_correction_id UUID REFERENCES yolo_corrections(id) ON DELETE SET NULL,

  -- Training metadata
  used_in_training BOOLEAN DEFAULT FALSE,
  training_version TEXT,
  training_job_id TEXT,

  -- Quality indicators
  segmentation_quality VARCHAR(20) CHECK (segmentation_quality IN ('excellent', 'good', 'fair', 'poor')),
  human_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- KNOWLEDGE DISTILLATION JOBS TABLE
-- ============================================================================
-- Track training jobs for knowledge distillation
CREATE TABLE IF NOT EXISTS knowledge_distillation_jobs (
  id TEXT PRIMARY KEY,
  -- Format: "kd-{timestamp}-{type}"

  -- Job type and status
  job_type TEXT NOT NULL CHECK (job_type IN ('damage_classifier', 'segmentation_model', 'yolo_enhancement')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

  -- Training configuration
  config JSONB NOT NULL DEFAULT '{}',
  -- Format: { learning_rate, batch_size, epochs, etc. }

  -- Training data
  training_samples_count INTEGER NOT NULL DEFAULT 0,
  validation_samples_count INTEGER DEFAULT 0,

  -- GPT-4 labels used (for damage classifier)
  gpt4_label_ids UUID[],

  -- SAM3 masks used (for segmentation model)
  sam3_mask_ids UUID[],

  -- YOLO corrections used (for YOLO enhancement)
  yolo_correction_ids UUID[],

  -- Model versioning
  model_version TEXT NOT NULL,
  base_model_version TEXT,
  -- Previous model version we're improving upon

  -- Results
  metrics_jsonb JSONB DEFAULT '{}',
  -- Format: { accuracy, precision, recall, f1_score, loss, val_loss, etc. }

  output_model_path TEXT,
  -- Path to trained model artifact

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,

  -- Error handling
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  triggered_by TEXT,
  -- 'scheduled' | 'manual' | 'accuracy_drop' | 'threshold_reached'

  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PSEUDO LABELS TABLE
-- ============================================================================
-- Store SAM3-generated pseudo-labels for unlabeled images
CREATE TABLE IF NOT EXISTS sam3_pseudo_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Image information
  image_url TEXT NOT NULL,
  image_hash VARCHAR(64),
  -- SHA256 hash for deduplication

  -- SAM3 pseudo-labeling results
  damage_types_detected TEXT[],
  -- Array of damage types found

  segmentation_data JSONB NOT NULL,
  -- Format: {
  --   "damage_type_1": { masks, boxes, scores, num_instances },
  --   "damage_type_2": { masks, boxes, scores, num_instances }
  -- }

  -- Confidence metrics
  overall_confidence FLOAT,
  min_confidence FLOAT,
  max_confidence FLOAT,

  -- Converted to YOLO format
  yolo_labels TEXT,
  -- YOLO format: "class_id x_center y_center width height" per line

  -- Quality filtering
  passes_quality_threshold BOOLEAN DEFAULT FALSE,
  quality_score FLOAT,

  -- Training metadata
  used_in_training BOOLEAN DEFAULT FALSE,
  training_version TEXT,

  -- Human review
  human_reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_decision VARCHAR(20) CHECK (review_decision IN ('approved', 'rejected', 'needs_revision')),
  review_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- GPT-4 Training Labels
CREATE INDEX IF NOT EXISTS idx_gpt4_training_labels_assessment
ON gpt4_training_labels(assessment_id);

CREATE INDEX IF NOT EXISTS idx_gpt4_training_labels_training
ON gpt4_training_labels(used_in_training, training_version);

CREATE INDEX IF NOT EXISTS idx_gpt4_training_labels_damage_type
ON gpt4_training_labels(damage_type);

CREATE INDEX IF NOT EXISTS idx_gpt4_training_labels_verified
ON gpt4_training_labels(human_verified) WHERE human_verified = TRUE;

CREATE INDEX IF NOT EXISTS idx_gpt4_training_labels_created
ON gpt4_training_labels(created_at DESC);

-- SAM3 Training Masks
CREATE INDEX IF NOT EXISTS idx_sam3_training_masks_assessment
ON sam3_training_masks(assessment_id);

CREATE INDEX IF NOT EXISTS idx_sam3_training_masks_image
ON sam3_training_masks(image_url);

CREATE INDEX IF NOT EXISTS idx_sam3_training_masks_damage_type
ON sam3_training_masks(damage_type);

CREATE INDEX IF NOT EXISTS idx_sam3_training_masks_training
ON sam3_training_masks(used_in_training, training_version);

CREATE INDEX IF NOT EXISTS idx_sam3_training_masks_yolo
ON sam3_training_masks(yolo_correction_id);

CREATE INDEX IF NOT EXISTS idx_sam3_training_masks_verified
ON sam3_training_masks(human_verified) WHERE human_verified = TRUE;

CREATE INDEX IF NOT EXISTS idx_sam3_training_masks_quality
ON sam3_training_masks(segmentation_quality);

CREATE INDEX IF NOT EXISTS idx_sam3_training_masks_created
ON sam3_training_masks(created_at DESC);

-- Knowledge Distillation Jobs
CREATE INDEX IF NOT EXISTS idx_knowledge_distillation_jobs_type
ON knowledge_distillation_jobs(job_type);

CREATE INDEX IF NOT EXISTS idx_knowledge_distillation_jobs_status
ON knowledge_distillation_jobs(status);

CREATE INDEX IF NOT EXISTS idx_knowledge_distillation_jobs_version
ON knowledge_distillation_jobs(model_version);

CREATE INDEX IF NOT EXISTS idx_knowledge_distillation_jobs_created
ON knowledge_distillation_jobs(created_at DESC);

-- Pseudo Labels
CREATE INDEX IF NOT EXISTS idx_sam3_pseudo_labels_image_hash
ON sam3_pseudo_labels(image_hash);

CREATE INDEX IF NOT EXISTS idx_sam3_pseudo_labels_training
ON sam3_pseudo_labels(used_in_training, training_version);

CREATE INDEX IF NOT EXISTS idx_sam3_pseudo_labels_quality
ON sam3_pseudo_labels(passes_quality_threshold) WHERE passes_quality_threshold = TRUE;

CREATE INDEX IF NOT EXISTS idx_sam3_pseudo_labels_reviewed
ON sam3_pseudo_labels(human_reviewed, review_decision);

CREATE INDEX IF NOT EXISTS idx_sam3_pseudo_labels_created
ON sam3_pseudo_labels(created_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE gpt4_training_labels IS
  'Stores GPT-4 Vision assessment outputs as training labels for internal damage classification model. Enables knowledge distillation from GPT-4 to smaller, faster internal models.';

COMMENT ON COLUMN gpt4_training_labels.gpt4_response IS
  'Complete Phase1BuildingAssessment JSON from GPT-4 Vision including damage type, severity, safety hazards, compliance, etc.';

COMMENT ON TABLE sam3_training_masks IS
  'Stores SAM3 precise segmentation masks to enhance YOLO training data. SAM3 provides pixel-perfect masks that improve bounding box quality.';

COMMENT ON COLUMN sam3_training_masks.masks IS
  'Binary segmentation masks from SAM3 as 3D array [instance][height][width]. Each pixel is 0 (background) or 1 (foreground).';

COMMENT ON COLUMN sam3_training_masks.boxes IS
  'Bounding boxes derived from SAM3 masks in format [[x, y, w, h]] for each instance.';

COMMENT ON TABLE knowledge_distillation_jobs IS
  'Tracks training jobs that distill knowledge from GPT-4/SAM3 into internal models. Includes metadata, metrics, and error handling.';

COMMENT ON TABLE sam3_pseudo_labels IS
  'SAM3-generated pseudo-labels for unlabeled images. Used to expand training dataset with high-quality automated annotations.';

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_kd_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gpt4_training_labels_updated_at
BEFORE UPDATE ON gpt4_training_labels
FOR EACH ROW
EXECUTE FUNCTION update_kd_tables_updated_at();

CREATE TRIGGER trigger_update_sam3_training_masks_updated_at
BEFORE UPDATE ON sam3_training_masks
FOR EACH ROW
EXECUTE FUNCTION update_kd_tables_updated_at();

CREATE TRIGGER trigger_update_knowledge_distillation_jobs_updated_at
BEFORE UPDATE ON knowledge_distillation_jobs
FOR EACH ROW
EXECUTE FUNCTION update_kd_tables_updated_at();

CREATE TRIGGER trigger_update_sam3_pseudo_labels_updated_at
BEFORE UPDATE ON sam3_pseudo_labels
FOR EACH ROW
EXECUTE FUNCTION update_kd_tables_updated_at();

-- Auto-calculate duration for completed jobs
CREATE OR REPLACE FUNCTION calculate_job_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed', 'cancelled') AND NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_job_duration
BEFORE UPDATE ON knowledge_distillation_jobs
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION calculate_job_duration();

-- Auto-calculate SAM3 metrics
CREATE OR REPLACE FUNCTION calculate_sam3_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate average confidence
  IF NEW.scores IS NOT NULL AND array_length(NEW.scores, 1) > 0 THEN
    SELECT AVG(score) INTO NEW.average_confidence
    FROM unnest(NEW.scores) AS score;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_sam3_metrics
BEFORE INSERT OR UPDATE ON sam3_training_masks
FOR EACH ROW
EXECUTE FUNCTION calculate_sam3_metrics();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
-- Enable RLS
ALTER TABLE gpt4_training_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE sam3_training_masks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_distillation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sam3_pseudo_labels ENABLE ROW LEVEL SECURITY;

-- Admins can view all training data
CREATE POLICY "Admins can view all gpt4 training labels"
  ON gpt4_training_labels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all sam3 training masks"
  ON sam3_training_masks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all distillation jobs"
  ON knowledge_distillation_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all pseudo labels"
  ON sam3_pseudo_labels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Service role can manage all (for background jobs)
-- Service role policies are implicit - service_role bypasses RLS

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get training statistics
CREATE OR REPLACE FUNCTION get_training_data_stats()
RETURNS TABLE (
  gpt4_labels_total BIGINT,
  gpt4_labels_unused BIGINT,
  gpt4_labels_verified BIGINT,
  sam3_masks_total BIGINT,
  sam3_masks_unused BIGINT,
  sam3_masks_verified BIGINT,
  pseudo_labels_total BIGINT,
  pseudo_labels_quality BIGINT,
  pseudo_labels_approved BIGINT,
  active_jobs INTEGER,
  completed_jobs INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM gpt4_training_labels),
    (SELECT COUNT(*) FROM gpt4_training_labels WHERE used_in_training = FALSE),
    (SELECT COUNT(*) FROM gpt4_training_labels WHERE human_verified = TRUE),
    (SELECT COUNT(*) FROM sam3_training_masks),
    (SELECT COUNT(*) FROM sam3_training_masks WHERE used_in_training = FALSE),
    (SELECT COUNT(*) FROM sam3_training_masks WHERE human_verified = TRUE),
    (SELECT COUNT(*) FROM sam3_pseudo_labels),
    (SELECT COUNT(*) FROM sam3_pseudo_labels WHERE passes_quality_threshold = TRUE),
    (SELECT COUNT(*) FROM sam3_pseudo_labels WHERE review_decision = 'approved'),
    (SELECT COUNT(*)::INTEGER FROM knowledge_distillation_jobs WHERE status IN ('pending', 'running')),
    (SELECT COUNT(*)::INTEGER FROM knowledge_distillation_jobs WHERE status = 'completed');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_training_data_stats IS
  'Returns comprehensive statistics about training data collection and usage.';
