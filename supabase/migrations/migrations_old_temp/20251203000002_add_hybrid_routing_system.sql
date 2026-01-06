-- Migration: Add Hybrid Routing System Tables
-- Created: 2025-12-03
-- Description: Tables for confidence-based routing between internal models and external APIs

-- ============================================================================
-- HYBRID ROUTING DECISIONS TABLE
-- Tracks which route was selected for each assessment and why
-- ============================================================================
CREATE TABLE IF NOT EXISTS hybrid_routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to assessment (nullable for non-persisted assessments)
  assessment_id UUID REFERENCES building_assessments(id) ON DELETE CASCADE,

  -- Routing decision
  route_selected TEXT NOT NULL CHECK (route_selected IN ('internal', 'gpt4_vision', 'hybrid')),

  -- Internal model prediction (if available)
  internal_confidence FLOAT,
  internal_prediction JSONB,

  -- GPT-4 prediction (if used)
  gpt4_prediction JSONB,

  -- Final assessment chosen
  final_assessment JSONB NOT NULL,

  -- Decision metadata
  route_reasoning TEXT NOT NULL,
  inference_time_ms INTEGER NOT NULL,
  image_count INTEGER NOT NULL DEFAULT 1,
  agreement_score FLOAT, -- For hybrid route, how much internal and GPT-4 agreed (0-100)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE hybrid_routing_decisions IS 'Tracks routing decisions between internal models and GPT-4 Vision';
COMMENT ON COLUMN hybrid_routing_decisions.route_selected IS 'Which inference route was chosen: internal, gpt4_vision, or hybrid';
COMMENT ON COLUMN hybrid_routing_decisions.internal_confidence IS 'Confidence score from internal model (0-100)';
COMMENT ON COLUMN hybrid_routing_decisions.agreement_score IS 'How much internal and GPT-4 predictions agreed in hybrid mode (0-100)';

-- ============================================================================
-- CONFIDENCE CALIBRATION DATA TABLE
-- Records outcomes to calibrate confidence thresholds over time
-- ============================================================================
CREATE TABLE IF NOT EXISTS confidence_calibration_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to routing decision
  routing_decision_id UUID NOT NULL REFERENCES hybrid_routing_decisions(id) ON DELETE CASCADE,

  -- What route was used
  route_used TEXT NOT NULL CHECK (route_used IN ('internal', 'gpt4_vision', 'hybrid')),

  -- Predicted values
  internal_confidence FLOAT,
  predicted_severity TEXT,
  predicted_urgency TEXT,

  -- Actual validated values
  was_correct BOOLEAN NOT NULL,
  actual_severity TEXT,
  actual_urgency TEXT,

  -- Human validator info
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  validation_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE confidence_calibration_data IS 'Human validation data used to calibrate confidence thresholds';
COMMENT ON COLUMN confidence_calibration_data.was_correct IS 'Whether the prediction matched human validation';

-- ============================================================================
-- INTERNAL MODEL REGISTRY TABLE
-- Tracks trained models and their metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS internal_model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model identification
  model_type TEXT NOT NULL, -- e.g., 'damage_classifier', 'severity_predictor'
  version TEXT NOT NULL,

  -- Model location
  model_path TEXT NOT NULL,

  -- Model performance metrics
  accuracy FLOAT NOT NULL,
  precision FLOAT,
  recall FLOAT,
  f1_score FLOAT,

  -- Training metadata
  sample_count INTEGER NOT NULL,
  training_duration_seconds INTEGER,

  -- Model configuration
  config JSONB,

  -- Deployment status
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  deployed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one active model per type
  UNIQUE(model_type, version)
);

COMMENT ON TABLE internal_model_registry IS 'Registry of trained internal models available for inference';
COMMENT ON COLUMN internal_model_registry.is_active IS 'Whether this model is currently active for production use';
COMMENT ON COLUMN internal_model_registry.accuracy IS 'Overall accuracy on validation set (0-1)';

-- ============================================================================
-- MODEL TRAINING JOBS TABLE
-- Tracks model training jobs
-- ============================================================================
CREATE TABLE IF NOT EXISTS model_training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job identification
  model_type TEXT NOT NULL,

  -- Training data
  sample_count INTEGER NOT NULL,

  -- Job status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

  -- Job configuration
  config JSONB,

  -- Results (populated on completion)
  result_model_id UUID REFERENCES internal_model_registry(id) ON DELETE SET NULL,
  accuracy FLOAT,
  error_message TEXT,

  -- Job execution metadata
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE model_training_jobs IS 'Tracks model training jobs and their status';
COMMENT ON COLUMN model_training_jobs.status IS 'Current status of the training job';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for hybrid_routing_decisions
CREATE INDEX IF NOT EXISTS idx_hybrid_routing_decisions_assessment_id
  ON hybrid_routing_decisions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_hybrid_routing_decisions_route_selected
  ON hybrid_routing_decisions(route_selected);
CREATE INDEX IF NOT EXISTS idx_hybrid_routing_decisions_created_at
  ON hybrid_routing_decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hybrid_routing_decisions_confidence
  ON hybrid_routing_decisions(internal_confidence)
  WHERE internal_confidence IS NOT NULL;

-- Indexes for confidence_calibration_data
CREATE INDEX IF NOT EXISTS idx_confidence_calibration_routing_decision
  ON confidence_calibration_data(routing_decision_id);
CREATE INDEX IF NOT EXISTS idx_confidence_calibration_was_correct
  ON confidence_calibration_data(was_correct);
CREATE INDEX IF NOT EXISTS idx_confidence_calibration_route_used
  ON confidence_calibration_data(route_used);
CREATE INDEX IF NOT EXISTS idx_confidence_calibration_created_at
  ON confidence_calibration_data(created_at DESC);

-- Indexes for internal_model_registry
CREATE INDEX IF NOT EXISTS idx_internal_model_registry_type
  ON internal_model_registry(model_type);
CREATE INDEX IF NOT EXISTS idx_internal_model_registry_active
  ON internal_model_registry(is_active)
  WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_internal_model_registry_created_at
  ON internal_model_registry(created_at DESC);

-- Indexes for model_training_jobs
CREATE INDEX IF NOT EXISTS idx_model_training_jobs_status
  ON model_training_jobs(status);
CREATE INDEX IF NOT EXISTS idx_model_training_jobs_created_at
  ON model_training_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_training_jobs_model_type
  ON model_training_jobs(model_type);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Trigger for internal_model_registry
CREATE OR REPLACE FUNCTION update_internal_model_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_internal_model_registry_updated_at
  BEFORE UPDATE ON internal_model_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_internal_model_registry_updated_at();

-- Trigger for model_training_jobs
CREATE OR REPLACE FUNCTION update_model_training_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_model_training_jobs_updated_at
  BEFORE UPDATE ON model_training_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_model_training_jobs_updated_at();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get routing statistics
CREATE OR REPLACE FUNCTION get_routing_statistics(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  route TEXT,
  count BIGINT,
  avg_confidence FLOAT,
  avg_inference_time_ms FLOAT,
  avg_agreement_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    route_selected as route,
    COUNT(*) as count,
    AVG(internal_confidence) as avg_confidence,
    AVG(inference_time_ms) as avg_inference_time_ms,
    AVG(agreement_score) as avg_agreement_score
  FROM hybrid_routing_decisions
  WHERE created_at BETWEEN p_start_date AND p_end_date
  GROUP BY route_selected
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_routing_statistics IS 'Get statistics on routing decisions over a time period';

-- Function to get model performance over time
CREATE OR REPLACE FUNCTION get_model_performance_trend(
  p_route TEXT,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  total_predictions BIGINT,
  correct_predictions BIGINT,
  accuracy FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(hrd.created_at) as date,
    COUNT(*) as total_predictions,
    SUM(CASE WHEN ccd.was_correct THEN 1 ELSE 0 END) as correct_predictions,
    CASE
      WHEN COUNT(*) > 0 THEN
        SUM(CASE WHEN ccd.was_correct THEN 1 ELSE 0 END)::FLOAT / COUNT(*)::FLOAT
      ELSE 0
    END as accuracy
  FROM hybrid_routing_decisions hrd
  LEFT JOIN confidence_calibration_data ccd ON ccd.routing_decision_id = hrd.id
  WHERE
    hrd.route_selected = p_route
    AND hrd.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(hrd.created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_model_performance_trend IS 'Get model performance trend over time for a specific route';

-- Function to activate a model (deactivates others of same type)
CREATE OR REPLACE FUNCTION activate_model(p_model_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_model_type TEXT;
BEGIN
  -- Get the model type
  SELECT model_type INTO v_model_type
  FROM internal_model_registry
  WHERE id = p_model_id;

  IF v_model_type IS NULL THEN
    RAISE EXCEPTION 'Model not found: %', p_model_id;
  END IF;

  -- Deactivate all models of this type
  UPDATE internal_model_registry
  SET is_active = FALSE
  WHERE model_type = v_model_type;

  -- Activate the specified model
  UPDATE internal_model_registry
  SET is_active = TRUE, deployed_at = NOW()
  WHERE id = p_model_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION activate_model IS 'Activate a specific model (deactivates other models of the same type)';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE hybrid_routing_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE confidence_calibration_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_training_jobs ENABLE ROW LEVEL SECURITY;

-- Admins can view all routing decisions
CREATE POLICY "Admins can view all routing decisions"
  ON hybrid_routing_decisions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- System can insert routing decisions
CREATE POLICY "System can insert routing decisions"
  ON hybrid_routing_decisions
  FOR INSERT
  WITH CHECK (TRUE);

-- Admins can view all calibration data
CREATE POLICY "Admins can view all calibration data"
  ON confidence_calibration_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can insert calibration data
CREATE POLICY "Admins can insert calibration data"
  ON confidence_calibration_data
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can view model registry
CREATE POLICY "Admins can view model registry"
  ON internal_model_registry
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- System can read active models
CREATE POLICY "System can read active models"
  ON internal_model_registry
  FOR SELECT
  USING (is_active = TRUE);

-- Admins can manage model registry
CREATE POLICY "Admins can manage model registry"
  ON internal_model_registry
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can view training jobs
CREATE POLICY "Admins can view training jobs"
  ON model_training_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can manage training jobs
CREATE POLICY "Admins can manage training jobs"
  ON model_training_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- SEED DATA (Optional - for testing)
-- ============================================================================

-- Insert a placeholder model registry entry to show the structure
-- This would be replaced by real models once trained
COMMENT ON TABLE internal_model_registry IS 'Stores metadata about trained internal models. Real models will be registered here once training pipeline is complete.';
