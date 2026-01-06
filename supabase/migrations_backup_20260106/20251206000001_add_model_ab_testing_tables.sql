-- ============================================================================
-- Model A/B Testing Tables for Building Surveyor AI
-- ============================================================================
-- Supports controlled rollout of new models with traffic splitting,
-- performance monitoring, and automatic deployment decisions
-- ============================================================================

-- Create model A/B tests table
CREATE TABLE IF NOT EXISTS model_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT UNIQUE NOT NULL,
  config_jsonb JSONB NOT NULL DEFAULT '{}',

  -- Test status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'running', 'paused', 'completed', 'rolled_back')
  ),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,

  -- Indexes for querying
  CONSTRAINT valid_timestamps CHECK (
    (started_at IS NULL OR started_at >= created_at) AND
    (completed_at IS NULL OR completed_at >= started_at)
  )
);

-- Create indexes for A/B tests
CREATE INDEX idx_model_ab_tests_status ON model_ab_tests(status);
CREATE INDEX idx_model_ab_tests_test_id ON model_ab_tests(test_id);
CREATE INDEX idx_model_ab_tests_created_at ON model_ab_tests(created_at DESC);

-- Create model assignments table (tracks which users get which model)
CREATE TABLE IF NOT EXISTS model_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT NOT NULL REFERENCES model_ab_tests(test_id) ON DELETE CASCADE,

  -- Assignment details
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  assigned_model TEXT NOT NULL CHECK (assigned_model IN ('control', 'treatment')),
  assignment_method TEXT NOT NULL CHECK (assignment_method IN ('random', 'hash', 'sticky')),

  -- Timestamp
  assignment_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Prevent duplicate assignments
  UNIQUE(test_id, session_id)
);

-- Create indexes for assignments
CREATE INDEX idx_model_assignments_test_id ON model_assignments(test_id);
CREATE INDEX idx_model_assignments_session_id ON model_assignments(session_id);
CREATE INDEX idx_model_assignments_user_id ON model_assignments(user_id);
CREATE INDEX idx_model_assignments_timestamp ON model_assignments(assignment_timestamp DESC);

-- Create inference logs table for performance tracking
CREATE TABLE IF NOT EXISTS model_inference_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT NOT NULL REFERENCES model_ab_tests(test_id) ON DELETE CASCADE,

  -- Inference details
  session_id TEXT NOT NULL,
  model_variant TEXT NOT NULL CHECK (model_variant IN ('control', 'treatment')),

  -- Performance metrics
  latency_ms NUMERIC NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  detections_count INTEGER DEFAULT 0,
  avg_confidence NUMERIC,

  -- Error tracking
  error_message TEXT,
  error_type TEXT,

  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for inference logs
CREATE INDEX idx_model_inference_logs_test_id ON model_inference_logs(test_id);
CREATE INDEX idx_model_inference_logs_session_id ON model_inference_logs(session_id);
CREATE INDEX idx_model_inference_logs_timestamp ON model_inference_logs(timestamp DESC);
CREATE INDEX idx_model_inference_logs_variant ON model_inference_logs(model_variant);

-- Create aggregated metrics view for quick analysis
CREATE OR REPLACE VIEW model_ab_test_metrics AS
SELECT
  t.test_id,
  t.status,
  t.started_at,

  -- Sample sizes
  COUNT(DISTINCT CASE WHEN a.assigned_model = 'control' THEN a.session_id END) as control_sessions,
  COUNT(DISTINCT CASE WHEN a.assigned_model = 'treatment' THEN a.session_id END) as treatment_sessions,

  -- Performance metrics for control
  AVG(CASE WHEN i.model_variant = 'control' THEN i.latency_ms END) as control_avg_latency,
  AVG(CASE WHEN i.model_variant = 'control' AND i.success THEN 1.0 ELSE 0.0 END) as control_success_rate,
  AVG(CASE WHEN i.model_variant = 'control' THEN i.avg_confidence END) as control_avg_confidence,

  -- Performance metrics for treatment
  AVG(CASE WHEN i.model_variant = 'treatment' THEN i.latency_ms END) as treatment_avg_latency,
  AVG(CASE WHEN i.model_variant = 'treatment' AND i.success THEN 1.0 ELSE 0.0 END) as treatment_success_rate,
  AVG(CASE WHEN i.model_variant = 'treatment' THEN i.avg_confidence END) as treatment_avg_confidence,

  -- Inference counts
  COUNT(CASE WHEN i.model_variant = 'control' THEN 1 END) as control_inferences,
  COUNT(CASE WHEN i.model_variant = 'treatment' THEN 1 END) as treatment_inferences

FROM model_ab_tests t
LEFT JOIN model_assignments a ON t.test_id = a.test_id
LEFT JOIN model_inference_logs i ON t.test_id = i.test_id AND a.session_id = i.session_id
GROUP BY t.test_id, t.status, t.started_at;

-- Create function to calculate statistical significance
CREATE OR REPLACE FUNCTION calculate_ab_test_significance(
  control_mean NUMERIC,
  control_std NUMERIC,
  control_n INTEGER,
  treatment_mean NUMERIC,
  treatment_std NUMERIC,
  treatment_n INTEGER
) RETURNS JSONB AS $$
DECLARE
  z_score NUMERIC;
  p_value NUMERIC;
  effect_size NUMERIC;
  pooled_std NUMERIC;
  standard_error NUMERIC;
  confidence_interval JSONB;
BEGIN
  -- Handle edge cases
  IF control_n < 2 OR treatment_n < 2 THEN
    RETURN jsonb_build_object(
      'z_score', 0,
      'p_value', 1,
      'effect_size', 0,
      'confidence_interval', jsonb_build_array(0, 0),
      'is_significant', false
    );
  END IF;

  -- Calculate standard error
  standard_error := SQRT(
    (control_std * control_std / control_n) +
    (treatment_std * treatment_std / treatment_n)
  );

  -- Calculate z-score
  IF standard_error > 0 THEN
    z_score := (treatment_mean - control_mean) / standard_error;
  ELSE
    z_score := 0;
  END IF;

  -- Approximate p-value (two-tailed)
  -- Using approximation: p ≈ 2 * (1 - Φ(|z|))
  -- For simplicity, using a basic approximation
  IF ABS(z_score) > 3.29 THEN
    p_value := 0.001;
  ELSIF ABS(z_score) > 2.58 THEN
    p_value := 0.01;
  ELSIF ABS(z_score) > 1.96 THEN
    p_value := 0.05;
  ELSIF ABS(z_score) > 1.64 THEN
    p_value := 0.10;
  ELSE
    p_value := 2 * (1 - 0.5 * (1 + ABS(z_score) / SQRT(2 * 3.14159)));
  END IF;

  -- Calculate effect size (Cohen's d)
  pooled_std := SQRT(
    ((control_n - 1) * control_std * control_std +
     (treatment_n - 1) * treatment_std * treatment_std) /
    (control_n + treatment_n - 2)
  );

  IF pooled_std > 0 THEN
    effect_size := (treatment_mean - control_mean) / pooled_std;
  ELSE
    effect_size := 0;
  END IF;

  -- Calculate 95% confidence interval
  confidence_interval := jsonb_build_array(
    (treatment_mean - control_mean) - 1.96 * standard_error,
    (treatment_mean - control_mean) + 1.96 * standard_error
  );

  RETURN jsonb_build_object(
    'z_score', z_score,
    'p_value', p_value,
    'effect_size', effect_size,
    'confidence_interval', confidence_interval,
    'is_significant', p_value < 0.05
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to get current A/B test results
CREATE OR REPLACE FUNCTION get_ab_test_results(p_test_id TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  control_data RECORD;
  treatment_data RECORD;
  significance JSONB;
BEGIN
  -- Get aggregated metrics for control
  SELECT
    COUNT(*)::INTEGER as n,
    AVG(avg_confidence)::NUMERIC as mean,
    STDDEV(avg_confidence)::NUMERIC as std,
    AVG(latency_ms)::NUMERIC as avg_latency,
    SUM(CASE WHEN success THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) as success_rate
  INTO control_data
  FROM model_inference_logs
  WHERE test_id = p_test_id AND model_variant = 'control';

  -- Get aggregated metrics for treatment
  SELECT
    COUNT(*)::INTEGER as n,
    AVG(avg_confidence)::NUMERIC as mean,
    STDDEV(avg_confidence)::NUMERIC as std,
    AVG(latency_ms)::NUMERIC as avg_latency,
    SUM(CASE WHEN success THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) as success_rate
  INTO treatment_data
  FROM model_inference_logs
  WHERE test_id = p_test_id AND model_variant = 'treatment';

  -- Calculate statistical significance
  IF control_data.n > 1 AND treatment_data.n > 1 THEN
    significance := calculate_ab_test_significance(
      control_data.mean,
      control_data.std,
      control_data.n,
      treatment_data.mean,
      treatment_data.std,
      treatment_data.n
    );
  ELSE
    significance := jsonb_build_object(
      'z_score', 0,
      'p_value', 1,
      'effect_size', 0,
      'confidence_interval', jsonb_build_array(0, 0),
      'is_significant', false
    );
  END IF;

  -- Build result
  result := jsonb_build_object(
    'test_id', p_test_id,
    'control', jsonb_build_object(
      'sample_size', control_data.n,
      'mean_confidence', control_data.mean,
      'std_confidence', control_data.std,
      'avg_latency_ms', control_data.avg_latency,
      'success_rate', control_data.success_rate
    ),
    'treatment', jsonb_build_object(
      'sample_size', treatment_data.n,
      'mean_confidence', treatment_data.mean,
      'std_confidence', treatment_data.std,
      'avg_latency_ms', treatment_data.avg_latency,
      'success_rate', treatment_data.success_rate
    ),
    'statistical_significance', significance,
    'improvement', jsonb_build_object(
      'confidence_improvement',
        CASE
          WHEN control_data.mean > 0
          THEN ((treatment_data.mean - control_data.mean) / control_data.mean * 100)
          ELSE 0
        END,
      'latency_improvement',
        CASE
          WHEN control_data.avg_latency > 0
          THEN ((control_data.avg_latency - treatment_data.avg_latency) / control_data.avg_latency * 100)
          ELSE 0
        END,
      'success_rate_improvement',
        CASE
          WHEN control_data.success_rate > 0
          THEN ((treatment_data.success_rate - control_data.success_rate) / control_data.success_rate * 100)
          ELSE 0
        END
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE model_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_inference_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read A/B test configurations
CREATE POLICY "Authenticated users can read A/B tests"
  ON model_ab_tests FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to manage A/B tests
CREATE POLICY "Service role can manage A/B tests"
  ON model_ab_tests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read their assignments
CREATE POLICY "Users can read their own assignments"
  ON model_assignments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    session_id IS NOT NULL
  );

-- Allow service role to manage assignments
CREATE POLICY "Service role can manage assignments"
  ON model_assignments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow service role to manage inference logs
CREATE POLICY "Service role can manage inference logs"
  ON model_inference_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create trigger to auto-update completed_at when status changes to completed
CREATE OR REPLACE FUNCTION update_ab_test_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'rolled_back') AND OLD.status NOT IN ('completed', 'rolled_back') THEN
    NEW.completed_at := CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ab_test_completed_at
  BEFORE UPDATE ON model_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_ab_test_completed_at();

-- Add comments for documentation
COMMENT ON TABLE model_ab_tests IS 'Stores A/B test configurations for model deployments';
COMMENT ON TABLE model_assignments IS 'Tracks which model variant each user/session receives';
COMMENT ON TABLE model_inference_logs IS 'Logs inference performance for A/B test analysis';
COMMENT ON VIEW model_ab_test_metrics IS 'Aggregated metrics view for quick A/B test analysis';
COMMENT ON FUNCTION calculate_ab_test_significance IS 'Calculates statistical significance for A/B test results';
COMMENT ON FUNCTION get_ab_test_results IS 'Returns comprehensive A/B test results with statistical analysis';