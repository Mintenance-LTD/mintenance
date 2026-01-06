-- ============================================================================
-- Continuous Learning Infrastructure Tables
-- ============================================================================
-- Supports automated model retraining, drift detection, and system monitoring
-- ============================================================================

-- Create system alerts table for monitoring and notifications
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert details
  type TEXT NOT NULL, -- CONTINUOUS_LEARNING, MODEL_RETRAINING, DRIFT_DETECTION, etc.
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,

  -- Additional context
  metadata JSONB DEFAULT '{}',

  -- Resolution tracking
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Indexes for efficient querying
  CONSTRAINT valid_acknowledgment CHECK (
    (acknowledged = FALSE) OR
    (acknowledged = TRUE AND acknowledged_by IS NOT NULL AND acknowledged_at IS NOT NULL)
  ),
  CONSTRAINT valid_resolution CHECK (
    (resolved = FALSE) OR
    (resolved = TRUE AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
  )
);

-- Create indexes for system alerts
CREATE INDEX idx_system_alerts_type ON system_alerts(type);
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_system_alerts_created_at ON system_alerts(created_at DESC);
CREATE INDEX idx_system_alerts_unacknowledged ON system_alerts(acknowledged) WHERE acknowledged = FALSE;
CREATE INDEX idx_system_alerts_unresolved ON system_alerts(resolved) WHERE resolved = FALSE;

-- Create drift events table for tracking distribution changes
CREATE TABLE IF NOT EXISTS drift_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Drift details
  drift_type TEXT NOT NULL CHECK (drift_type IN ('seasonal', 'material', 'temporal', 'none')),
  drift_score NUMERIC NOT NULL CHECK (drift_score >= 0 AND drift_score <= 1),

  -- Affected features and adjustments
  affected_features TEXT[] DEFAULT '{}',
  original_weights JSONB NOT NULL DEFAULT '{}', -- {yolo, maskrcnn, sam}
  adjusted_weights JSONB NOT NULL DEFAULT '{}', -- {yolo, maskrcnn, sam}
  weight_adjustment_applied BOOLEAN DEFAULT FALSE,

  -- Context
  season TEXT CHECK (season IN ('spring', 'summer', 'fall', 'winter')),
  property_type TEXT,
  region TEXT,
  material_types TEXT[],

  -- Metadata
  detection_metadata JSONB DEFAULT '{}', -- Additional detection details

  -- Timestamps
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  applied_at TIMESTAMP WITH TIME ZONE,

  -- Validation
  CONSTRAINT valid_weights CHECK (
    jsonb_typeof(original_weights) = 'object' AND
    jsonb_typeof(adjusted_weights) = 'object'
  )
);

-- Create indexes for drift events
CREATE INDEX idx_drift_events_type ON drift_events(drift_type);
CREATE INDEX idx_drift_events_detected_at ON drift_events(detected_at DESC);
CREATE INDEX idx_drift_events_drift_score ON drift_events(drift_score);
CREATE INDEX idx_drift_events_applied ON drift_events(weight_adjustment_applied);

-- Create continuous learning metrics table
CREATE TABLE IF NOT EXISTS continuous_learning_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pipeline status
  pipeline_healthy BOOLEAN NOT NULL DEFAULT TRUE,
  health_check_details JSONB DEFAULT '{}',

  -- Feedback metrics
  total_corrections INTEGER DEFAULT 0,
  approved_corrections INTEGER DEFAULT 0,
  rejected_corrections INTEGER DEFAULT 0,
  pending_corrections INTEGER DEFAULT 0,
  average_confidence_score NUMERIC,
  expert_verified_percentage NUMERIC,
  correction_consistency_score NUMERIC,

  -- Model metrics
  current_model_version TEXT,
  current_model_map50 NUMERIC,
  current_model_precision NUMERIC,
  current_model_recall NUMERIC,
  current_model_f1_score NUMERIC,

  -- Training metrics
  last_retraining_date TIMESTAMP WITH TIME ZONE,
  next_scheduled_retraining TIMESTAMP WITH TIME ZONE,
  total_retraining_jobs INTEGER DEFAULT 0,
  successful_retraining_jobs INTEGER DEFAULT 0,
  failed_retraining_jobs INTEGER DEFAULT 0,

  -- Drift metrics
  active_drift_type TEXT,
  active_drift_score NUMERIC,
  total_drift_events INTEGER DEFAULT 0,

  -- A/B testing metrics
  active_ab_tests INTEGER DEFAULT 0,
  total_ab_tests_run INTEGER DEFAULT 0,
  successful_deployments INTEGER DEFAULT 0,
  rollbacks INTEGER DEFAULT 0,

  -- Timestamp (one record per day)
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one record per day
  CONSTRAINT unique_date UNIQUE(date)
);

-- Create indexes for continuous learning metrics
CREATE INDEX idx_cl_metrics_date ON continuous_learning_metrics(date DESC);
CREATE INDEX idx_cl_metrics_healthy ON continuous_learning_metrics(pipeline_healthy);

-- Create feedback quality tracking table
CREATE TABLE IF NOT EXISTS feedback_quality_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to correction
  correction_id UUID REFERENCES yolo_corrections(id) ON DELETE CASCADE,

  -- Quality metrics
  consistency_score NUMERIC CHECK (consistency_score >= 0 AND consistency_score <= 1),
  completeness_score NUMERIC CHECK (completeness_score >= 0 AND completeness_score <= 1),
  accuracy_score NUMERIC CHECK (accuracy_score >= 0 AND accuracy_score <= 1),

  -- Validation results
  validation_passed BOOLEAN DEFAULT TRUE,
  validation_errors TEXT[],

  -- Similarity to other corrections
  similar_corrections UUID[], -- IDs of similar corrections
  similarity_scores NUMERIC[], -- Scores for each similar correction

  -- Impact on model
  estimated_impact_score NUMERIC, -- Estimated improvement to model
  actual_impact_score NUMERIC, -- Measured after retraining

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for feedback quality tracking
CREATE INDEX idx_feedback_quality_correction ON feedback_quality_tracking(correction_id);
CREATE INDEX idx_feedback_quality_validation ON feedback_quality_tracking(validation_passed);
CREATE INDEX idx_feedback_quality_created ON feedback_quality_tracking(created_at DESC);

-- Create model registry table for version management
CREATE TABLE IF NOT EXISTS model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model identification
  model_type TEXT NOT NULL CHECK (model_type IN ('yolo', 'sam3', 'knowledge_distillation', 'custom')),
  model_name TEXT NOT NULL,
  version TEXT NOT NULL,

  -- Model location
  storage_path TEXT,
  storage_bucket TEXT,
  file_size_bytes BIGINT,
  checksum TEXT,

  -- Model metadata
  base_model_version TEXT, -- Parent model for lineage
  training_config JSONB DEFAULT '{}',
  training_data_info JSONB DEFAULT '{}', -- Dataset info

  -- Performance metrics
  evaluation_metrics JSONB DEFAULT '{}',
  production_metrics JSONB DEFAULT '{}', -- Real-world performance

  -- Deployment status
  deployment_status TEXT CHECK (deployment_status IN ('development', 'staging', 'production', 'archived')),
  is_active BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,

  -- A/B testing
  ab_test_id TEXT,
  ab_test_variant TEXT CHECK (ab_test_variant IN ('control', 'treatment')),

  -- Metadata
  tags TEXT[],
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT unique_model_version UNIQUE(model_type, model_name, version)
);

-- Create indexes for model registry
CREATE INDEX idx_model_registry_type ON model_registry(model_type);
CREATE INDEX idx_model_registry_version ON model_registry(version);
CREATE INDEX idx_model_registry_status ON model_registry(deployment_status);
CREATE INDEX idx_model_registry_active ON model_registry(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_model_registry_created ON model_registry(created_at DESC);

-- Create function to update continuous learning metrics daily
CREATE OR REPLACE FUNCTION update_continuous_learning_metrics()
RETURNS void AS $$
DECLARE
  v_total_corrections INTEGER;
  v_approved_corrections INTEGER;
  v_pending_corrections INTEGER;
  v_last_retraining TIMESTAMP WITH TIME ZONE;
  v_current_model_version TEXT;
  v_active_ab_tests INTEGER;
  v_recent_drift drift_events%ROWTYPE;
BEGIN
  -- Get correction counts
  SELECT
    COUNT(*) FILTER (WHERE TRUE),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'pending')
  INTO v_total_corrections, v_approved_corrections, v_pending_corrections
  FROM yolo_corrections;

  -- Get last retraining job
  SELECT completed_at INTO v_last_retraining
  FROM yolo_retraining_jobs
  WHERE status = 'completed'
  ORDER BY completed_at DESC
  LIMIT 1;

  -- Get current model version
  SELECT version INTO v_current_model_version
  FROM model_registry
  WHERE is_active = TRUE AND model_type = 'yolo'
  LIMIT 1;

  -- Get active A/B tests
  SELECT COUNT(*) INTO v_active_ab_tests
  FROM model_ab_tests
  WHERE status = 'running';

  -- Get recent drift event
  SELECT * INTO v_recent_drift
  FROM drift_events
  ORDER BY detected_at DESC
  LIMIT 1;

  -- Insert or update today's metrics
  INSERT INTO continuous_learning_metrics (
    date,
    total_corrections,
    approved_corrections,
    pending_corrections,
    current_model_version,
    last_retraining_date,
    active_ab_tests,
    active_drift_type,
    active_drift_score
  ) VALUES (
    CURRENT_DATE,
    v_total_corrections,
    v_approved_corrections,
    v_pending_corrections,
    v_current_model_version,
    v_last_retraining,
    v_active_ab_tests,
    v_recent_drift.drift_type,
    v_recent_drift.drift_score
  )
  ON CONFLICT (date) DO UPDATE SET
    total_corrections = EXCLUDED.total_corrections,
    approved_corrections = EXCLUDED.approved_corrections,
    pending_corrections = EXCLUDED.pending_corrections,
    current_model_version = EXCLUDED.current_model_version,
    last_retraining_date = EXCLUDED.last_retraining_date,
    active_ab_tests = EXCLUDED.active_ab_tests,
    active_drift_type = EXCLUDED.active_drift_type,
    active_drift_score = EXCLUDED.active_drift_score,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update model registry updated_at
CREATE OR REPLACE FUNCTION update_model_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_model_registry_updated_at
  BEFORE UPDATE ON model_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_model_registry_updated_at();

-- Create trigger to update feedback quality tracking updated_at
CREATE TRIGGER trigger_update_feedback_quality_updated_at
  BEFORE UPDATE ON feedback_quality_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE drift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_quality_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_registry ENABLE ROW LEVEL SECURITY;

-- System alerts: Admins can manage, authenticated users can read
CREATE POLICY "Admins can manage system alerts"
  ON system_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can read system alerts"
  ON system_alerts FOR SELECT
  TO authenticated
  USING (severity IN ('info', 'warning'));

-- Drift events: Service role only (automated system)
CREATE POLICY "Service role can manage drift events"
  ON drift_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Continuous learning metrics: Public read, service role write
CREATE POLICY "Public can read learning metrics"
  ON continuous_learning_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage learning metrics"
  ON continuous_learning_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Feedback quality: Service role manages
CREATE POLICY "Service role can manage feedback quality"
  ON feedback_quality_tracking FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Model registry: Admins manage, authenticated read
CREATE POLICY "Admins can manage model registry"
  ON model_registry FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can read model registry"
  ON model_registry FOR SELECT
  TO authenticated
  USING (deployment_status IN ('staging', 'production'));

-- Add comments for documentation
COMMENT ON TABLE system_alerts IS 'System-wide alerts for monitoring ML pipeline health';
COMMENT ON TABLE drift_events IS 'Tracks distribution drift in building damage patterns';
COMMENT ON TABLE continuous_learning_metrics IS 'Daily aggregated metrics for ML pipeline monitoring';
COMMENT ON TABLE feedback_quality_tracking IS 'Quality metrics for user feedback and corrections';
COMMENT ON TABLE model_registry IS 'Central registry for all ML models with versioning and deployment tracking';

-- Create helper function to get pipeline health status
CREATE OR REPLACE FUNCTION get_pipeline_health_status()
RETURNS TABLE (
  is_healthy BOOLEAN,
  health_score NUMERIC,
  issues TEXT[],
  recommendations TEXT[]
) AS $$
DECLARE
  v_metrics continuous_learning_metrics%ROWTYPE;
  v_health_score NUMERIC := 100;
  v_issues TEXT[] := '{}';
  v_recommendations TEXT[] := '{}';
  v_is_healthy BOOLEAN := TRUE;
BEGIN
  -- Get today's metrics
  SELECT * INTO v_metrics
  FROM continuous_learning_metrics
  WHERE date = CURRENT_DATE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, ARRAY['No metrics available']::TEXT[], ARRAY['Run metrics update']::TEXT[];
    RETURN;
  END IF;

  -- Check pending corrections
  IF v_metrics.pending_corrections > 500 THEN
    v_health_score := v_health_score - 20;
    v_issues := array_append(v_issues, 'High number of pending corrections');
    v_recommendations := array_append(v_recommendations, 'Review and approve pending corrections');
  END IF;

  -- Check retraining recency
  IF v_metrics.last_retraining_date < CURRENT_DATE - INTERVAL '14 days' THEN
    v_health_score := v_health_score - 15;
    v_issues := array_append(v_issues, 'Model not retrained recently');
    v_recommendations := array_append(v_recommendations, 'Trigger model retraining');
  END IF;

  -- Check drift
  IF v_metrics.active_drift_score > 0.3 THEN
    v_health_score := v_health_score - 10;
    v_issues := array_append(v_issues, 'Significant drift detected');
    v_recommendations := array_append(v_recommendations, 'Adjust fusion weights for drift');
  END IF;

  -- Check model performance
  IF v_metrics.current_model_f1_score < 0.7 THEN
    v_health_score := v_health_score - 25;
    v_issues := array_append(v_issues, 'Model performance below threshold');
    v_recommendations := array_append(v_recommendations, 'Collect more training data');
  END IF;

  v_is_healthy := v_health_score >= 70;

  RETURN QUERY SELECT v_is_healthy, v_health_score, v_issues, v_recommendations;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pipeline_health_status IS 'Returns current health status of the continuous learning pipeline';