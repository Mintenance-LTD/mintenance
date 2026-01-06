-- ============================================================================
-- Migration: Conformal Prediction Calibration System
-- Created: 2025-12-20
-- Description: Infrastructure for conformal prediction with mathematically
--              guaranteed confidence intervals for damage predictions
-- ============================================================================

-- ============================================================================
-- PROPERTY TYPE CLASSIFICATION (for Mondrian Conformal Prediction)
-- ============================================================================

-- Enum for property age categories
CREATE TYPE property_age_category AS ENUM ('victorian', 'post_war', 'modern', 'unknown');

-- Function to classify property age based on construction year
CREATE OR REPLACE FUNCTION classify_property_age(construction_year INTEGER)
RETURNS property_age_category
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF construction_year IS NULL THEN
    RETURN 'unknown'::property_age_category;
  ELSIF construction_year < 1900 THEN
    RETURN 'victorian'::property_age_category;
  ELSIF construction_year >= 1900 AND construction_year < 1970 THEN
    RETURN 'post_war'::property_age_category;
  ELSE
    RETURN 'modern'::property_age_category;
  END IF;
END;
$$;

COMMENT ON FUNCTION classify_property_age IS 'Classifies property into age categories for Mondrian CP stratification';

-- ============================================================================
-- CALIBRATION SET TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conformal_calibration_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL,

  -- Set identification
  set_name VARCHAR(100) NOT NULL,
  set_type VARCHAR(50) NOT NULL CHECK (set_type IN ('full', 'stratified', 'damage_specific')),
  stratum VARCHAR(100), -- e.g., 'victorian_structural', 'modern_water_damage'

  -- Set statistics
  sample_count INTEGER NOT NULL,
  min_confidence NUMERIC(4,3),
  max_confidence NUMERIC(4,3),
  mean_confidence NUMERIC(4,3),
  std_confidence NUMERIC(4,3),

  -- Performance metrics
  empirical_coverage NUMERIC(4,3), -- Actual coverage rate
  target_coverage NUMERIC(4,3) DEFAULT 0.950, -- Desired coverage (95% default)
  calibration_error NUMERIC(5,4), -- |empirical - target|

  -- Validity period
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  is_active BOOLEAN DEFAULT TRUE,
  replaced_by UUID REFERENCES conformal_calibration_sets(id),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  UNIQUE(set_name, version)
);

CREATE INDEX idx_calibration_sets_active ON conformal_calibration_sets(is_active, set_type, stratum)
  WHERE is_active = TRUE;
CREATE INDEX idx_calibration_sets_version ON conformal_calibration_sets(version DESC);
CREATE INDEX idx_calibration_sets_valid_until ON conformal_calibration_sets(valid_until);

COMMENT ON TABLE conformal_calibration_sets IS 'Stores metadata about calibration sets for conformal prediction';
COMMENT ON COLUMN conformal_calibration_sets.stratum IS 'Mondrian CP stratum identifier (property_type + damage_type)';

-- ============================================================================
-- CALIBRATION SAMPLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conformal_calibration_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calibration_set_id UUID NOT NULL REFERENCES conformal_calibration_sets(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES building_assessments(id) ON DELETE SET NULL,

  -- Features (input to model)
  features JSONB NOT NULL, -- Extracted features from images
  property_age_category property_age_category NOT NULL,
  damage_category VARCHAR(100) NOT NULL,

  -- Predictions
  predicted_severity VARCHAR(20) NOT NULL,
  predicted_confidence NUMERIC(4,3) NOT NULL CHECK (predicted_confidence >= 0 AND predicted_confidence <= 1),
  prediction_scores JSONB NOT NULL, -- {early: 0.2, midway: 0.3, full: 0.5}

  -- Ground truth
  true_severity VARCHAR(20) NOT NULL,
  true_damage_type VARCHAR(100) NOT NULL,
  ground_truth_source VARCHAR(50) NOT NULL CHECK (ground_truth_source IN ('expert_validation', 'repair_outcome', 'contractor_feedback')),

  -- Nonconformity score
  nonconformity_score NUMERIC(6,4) NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calibration_samples_set_id ON conformal_calibration_samples(calibration_set_id);
CREATE INDEX idx_calibration_samples_assessment_id ON conformal_calibration_samples(assessment_id);
CREATE INDEX idx_calibration_samples_property_category ON conformal_calibration_samples(property_age_category, damage_category);
CREATE INDEX idx_calibration_samples_nonconformity ON conformal_calibration_samples(nonconformity_score);

COMMENT ON TABLE conformal_calibration_samples IS 'Individual samples in calibration sets with features, predictions, and ground truth';
COMMENT ON COLUMN conformal_calibration_samples.nonconformity_score IS 'Measure of prediction error used for confidence interval calculation';

-- ============================================================================
-- NONCONFORMITY THRESHOLDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conformal_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calibration_set_id UUID NOT NULL REFERENCES conformal_calibration_sets(id) ON DELETE CASCADE,

  -- Threshold parameters
  confidence_level NUMERIC(4,3) NOT NULL CHECK (confidence_level > 0 AND confidence_level < 1),
  quantile NUMERIC(4,3) NOT NULL CHECK (quantile > 0 AND quantile <= 1),
  threshold_value NUMERIC(6,4) NOT NULL,

  -- Stratum information
  stratum VARCHAR(100),
  stratum_sample_count INTEGER,

  -- Performance on holdout
  holdout_coverage NUMERIC(4,3),
  holdout_interval_width NUMERIC(6,4),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(calibration_set_id, confidence_level, stratum)
);

CREATE INDEX idx_thresholds_calibration_set ON conformal_thresholds(calibration_set_id);
CREATE INDEX idx_thresholds_confidence ON conformal_thresholds(confidence_level);
CREATE INDEX idx_thresholds_stratum ON conformal_thresholds(stratum);

COMMENT ON TABLE conformal_thresholds IS 'Stores computed thresholds for different confidence levels';
COMMENT ON COLUMN conformal_thresholds.quantile IS 'The quantile of nonconformity scores (e.g., 0.95 for 95% confidence)';

-- ============================================================================
-- MATERIALIZED VIEW: Validated Calibration Data
-- ============================================================================

CREATE MATERIALIZED VIEW mv_validated_assessments AS
SELECT
  ba.id as assessment_id,
  ba.user_id,
  ba.damage_type,
  ba.severity as predicted_severity,
  ba.confidence as predicted_confidence,
  ba.assessment_data,
  ba.created_at,

  -- Ground truth from outcomes
  bao.actual_damage_type as true_damage_type,
  bao.actual_severity as true_severity,
  bao.outcome_type as validation_source,
  bao.accuracy_metrics,

  -- Property context (would need to join with properties table if exists)
  -- For now, extract from assessment_data JSON if available
  (ba.assessment_data->>'property_type')::VARCHAR as property_type,
  (ba.assessment_data->>'construction_year')::INTEGER as construction_year,
  classify_property_age((ba.assessment_data->>'construction_year')::INTEGER) as property_age_category,

  -- Routing information
  hrd.route_selected,
  hrd.internal_confidence,
  hrd.agreement_score

FROM building_assessments ba
INNER JOIN building_assessment_outcomes bao
  ON ba.id = bao.assessment_id
LEFT JOIN hybrid_routing_decisions hrd
  ON ba.id = hrd.assessment_id
WHERE
  bao.learning_successful = TRUE
  AND bao.actual_severity IS NOT NULL
  AND ba.validation_status = 'validated'
ORDER BY ba.created_at DESC;

CREATE UNIQUE INDEX idx_mv_validated_assessment_id ON mv_validated_assessments(assessment_id);
CREATE INDEX idx_mv_validated_property_category ON mv_validated_assessments(property_age_category, damage_type);
CREATE INDEX idx_mv_validated_created ON mv_validated_assessments(created_at DESC);

COMMENT ON MATERIALIZED VIEW mv_validated_assessments IS 'Consolidated view of assessments with ground truth for calibration';

-- ============================================================================
-- FUNCTION: Calculate Nonconformity Score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_nonconformity_score(
  predicted_scores JSONB,
  true_class VARCHAR,
  score_type VARCHAR DEFAULT 'hinge'
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  true_score NUMERIC;
  max_other_score NUMERIC;
  nonconformity NUMERIC;
BEGIN
  -- Extract score for true class
  true_score := COALESCE((predicted_scores->>true_class)::NUMERIC, 0);

  IF score_type = 'hinge' THEN
    -- Hinge loss: 1 - (true_score - max_other_score)
    SELECT MAX((value)::NUMERIC) INTO max_other_score
    FROM jsonb_each_text(predicted_scores)
    WHERE key != true_class;

    nonconformity := 1.0 - (true_score - COALESCE(max_other_score, 0));

  ELSIF score_type = 'margin' THEN
    -- Margin: max_other_score - true_score
    SELECT MAX((value)::NUMERIC) INTO max_other_score
    FROM jsonb_each_text(predicted_scores)
    WHERE key != true_class;

    nonconformity := COALESCE(max_other_score, 0) - true_score;

  ELSIF score_type = 'inverse_probability' THEN
    -- 1 - P(true_class)
    nonconformity := 1.0 - true_score;

  ELSE
    RAISE EXCEPTION 'Unknown score type: %', score_type;
  END IF;

  RETURN GREATEST(0, nonconformity); -- Ensure non-negative
END;
$$;

COMMENT ON FUNCTION calculate_nonconformity_score IS 'Calculates nonconformity score for conformal prediction';

-- ============================================================================
-- FUNCTION: Build Calibration Set
-- ============================================================================

CREATE OR REPLACE FUNCTION build_calibration_set(
  p_set_name VARCHAR,
  p_set_type VARCHAR DEFAULT 'full',
  p_stratum VARCHAR DEFAULT NULL,
  p_min_samples INTEGER DEFAULT 500,
  p_validation_split NUMERIC DEFAULT 0.2
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_calibration_set_id UUID;
  v_version INTEGER;
  v_sample_count INTEGER;
  v_record RECORD;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM conformal_calibration_sets
  WHERE set_name = p_set_name;

  -- Count available samples
  SELECT COUNT(*) INTO v_sample_count
  FROM mv_validated_assessments
  WHERE (p_stratum IS NULL OR
         CONCAT(property_age_category::TEXT, '_', damage_type) = p_stratum);

  -- Check minimum samples
  IF v_sample_count < p_min_samples THEN
    RAISE EXCEPTION 'Insufficient samples: % < %', v_sample_count, p_min_samples;
  END IF;

  -- Create calibration set record
  INSERT INTO conformal_calibration_sets (
    version, set_name, set_type, stratum, sample_count,
    metadata
  ) VALUES (
    v_version, p_set_name, p_set_type, p_stratum,
    FLOOR(v_sample_count * (1 - p_validation_split)),
    jsonb_build_object(
      'total_available', v_sample_count,
      'validation_split', p_validation_split,
      'created_by', auth.uid()
    )
  ) RETURNING id INTO v_calibration_set_id;

  -- Insert calibration samples (using random split)
  FOR v_record IN
    SELECT
      assessment_id,
      jsonb_build_object(
        'damage_type', damage_type,
        'property_type', property_type,
        'confidence', predicted_confidence
      ) as features,
      property_age_category,
      damage_type as damage_category,
      predicted_severity,
      predicted_confidence,
      jsonb_build_object(
        'early',
        CASE WHEN predicted_severity = 'early' THEN predicted_confidence
             ELSE (1 - predicted_confidence) / 2 END,
        'midway',
        CASE WHEN predicted_severity = 'midway' THEN predicted_confidence
             ELSE (1 - predicted_confidence) / 2 END,
        'full',
        CASE WHEN predicted_severity = 'full' THEN predicted_confidence
             ELSE (1 - predicted_confidence) / 2 END
      ) as prediction_scores,
      true_severity,
      true_damage_type,
      validation_source
    FROM mv_validated_assessments
    WHERE (p_stratum IS NULL OR
           CONCAT(property_age_category::TEXT, '_', damage_type) = p_stratum)
    ORDER BY RANDOM()
    LIMIT FLOOR(v_sample_count * (1 - p_validation_split))
  LOOP
    INSERT INTO conformal_calibration_samples (
      calibration_set_id,
      assessment_id,
      features,
      property_age_category,
      damage_category,
      predicted_severity,
      predicted_confidence,
      prediction_scores,
      true_severity,
      true_damage_type,
      ground_truth_source,
      nonconformity_score
    ) VALUES (
      v_calibration_set_id,
      v_record.assessment_id,
      v_record.features,
      v_record.property_age_category,
      v_record.damage_category,
      v_record.predicted_severity,
      v_record.predicted_confidence,
      v_record.prediction_scores,
      v_record.true_severity,
      v_record.true_damage_type,
      v_record.validation_source,
      calculate_nonconformity_score(
        v_record.prediction_scores,
        v_record.true_severity,
        'hinge'
      )
    );
  END LOOP;

  -- Calculate statistics
  UPDATE conformal_calibration_sets
  SET
    min_confidence = (
      SELECT MIN(predicted_confidence)
      FROM conformal_calibration_samples
      WHERE calibration_set_id = v_calibration_set_id
    ),
    max_confidence = (
      SELECT MAX(predicted_confidence)
      FROM conformal_calibration_samples
      WHERE calibration_set_id = v_calibration_set_id
    ),
    mean_confidence = (
      SELECT AVG(predicted_confidence)
      FROM conformal_calibration_samples
      WHERE calibration_set_id = v_calibration_set_id
    ),
    std_confidence = (
      SELECT STDDEV(predicted_confidence)
      FROM conformal_calibration_samples
      WHERE calibration_set_id = v_calibration_set_id
    )
  WHERE id = v_calibration_set_id;

  -- Compute thresholds for standard confidence levels
  PERFORM compute_conformal_thresholds(v_calibration_set_id, 0.80);
  PERFORM compute_conformal_thresholds(v_calibration_set_id, 0.90);
  PERFORM compute_conformal_thresholds(v_calibration_set_id, 0.95);
  PERFORM compute_conformal_thresholds(v_calibration_set_id, 0.99);

  RETURN v_calibration_set_id;
END;
$$;

COMMENT ON FUNCTION build_calibration_set IS 'Builds a new calibration set from validated assessments';

-- ============================================================================
-- FUNCTION: Compute Conformal Thresholds
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_conformal_thresholds(
  p_calibration_set_id UUID,
  p_confidence_level NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quantile NUMERIC;
  v_threshold NUMERIC;
  v_stratum VARCHAR;
  v_stratum_count INTEGER;
BEGIN
  -- Calculate quantile for desired confidence level
  v_quantile := p_confidence_level;

  -- Get stratum from calibration set
  SELECT stratum INTO v_stratum
  FROM conformal_calibration_sets
  WHERE id = p_calibration_set_id;

  -- Calculate threshold (quantile of nonconformity scores)
  SELECT
    PERCENTILE_CONT(v_quantile) WITHIN GROUP (ORDER BY nonconformity_score),
    COUNT(*)
  INTO v_threshold, v_stratum_count
  FROM conformal_calibration_samples
  WHERE calibration_set_id = p_calibration_set_id;

  -- Insert or update threshold
  INSERT INTO conformal_thresholds (
    calibration_set_id,
    confidence_level,
    quantile,
    threshold_value,
    stratum,
    stratum_sample_count
  ) VALUES (
    p_calibration_set_id,
    p_confidence_level,
    v_quantile,
    v_threshold,
    v_stratum,
    v_stratum_count
  )
  ON CONFLICT (calibration_set_id, confidence_level, stratum)
  DO UPDATE SET
    threshold_value = EXCLUDED.threshold_value,
    quantile = EXCLUDED.quantile,
    stratum_sample_count = EXCLUDED.stratum_sample_count;

END;
$$;

COMMENT ON FUNCTION compute_conformal_thresholds IS 'Computes nonconformity thresholds for a given confidence level';

-- ============================================================================
-- FUNCTION: Get Prediction Interval
-- ============================================================================

CREATE OR REPLACE FUNCTION get_conformal_prediction_interval(
  p_prediction_scores JSONB,
  p_property_age_category property_age_category,
  p_damage_type VARCHAR,
  p_confidence_level NUMERIC DEFAULT 0.95
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_threshold NUMERIC;
  v_calibration_set_id UUID;
  v_stratum VARCHAR;
  v_prediction_set JSONB;
  v_class VARCHAR;
  v_score NUMERIC;
  v_nonconformity NUMERIC;
BEGIN
  -- Build stratum identifier
  v_stratum := CONCAT(p_property_age_category::TEXT, '_', p_damage_type);

  -- Get active calibration set and threshold
  SELECT
    cs.id,
    ct.threshold_value
  INTO
    v_calibration_set_id,
    v_threshold
  FROM conformal_calibration_sets cs
  JOIN conformal_thresholds ct ON cs.id = ct.calibration_set_id
  WHERE cs.is_active = TRUE
    AND (cs.stratum = v_stratum OR cs.stratum IS NULL)
    AND ct.confidence_level = p_confidence_level
    AND (ct.stratum = v_stratum OR ct.stratum IS NULL)
  ORDER BY
    cs.stratum IS NOT NULL DESC, -- Prefer stratified
    cs.created_at DESC
  LIMIT 1;

  IF v_threshold IS NULL THEN
    -- Fall back to default threshold if no calibration available
    v_threshold := 0.5;
  END IF;

  -- Build prediction set (classes included in confidence region)
  v_prediction_set := '[]'::JSONB;

  FOR v_class, v_score IN
    SELECT key, (value)::NUMERIC
    FROM jsonb_each_text(p_prediction_scores)
    ORDER BY (value)::NUMERIC DESC
  LOOP
    -- Calculate nonconformity for this class
    v_nonconformity := calculate_nonconformity_score(
      p_prediction_scores,
      v_class,
      'hinge'
    );

    -- Include class if within threshold
    IF v_nonconformity <= v_threshold THEN
      v_prediction_set := v_prediction_set || jsonb_build_array(v_class);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'confidence_level', p_confidence_level,
    'prediction_set', v_prediction_set,
    'threshold_used', v_threshold,
    'calibration_set_id', v_calibration_set_id,
    'stratum', v_stratum,
    'interval_size', jsonb_array_length(v_prediction_set)
  );
END;
$$;

COMMENT ON FUNCTION get_conformal_prediction_interval IS 'Returns conformal prediction set with guaranteed coverage';

-- ============================================================================
-- STORED PROCEDURE: Automated Recalibration
-- ============================================================================

CREATE OR REPLACE PROCEDURE recalibrate_conformal_models(
  p_force BOOLEAN DEFAULT FALSE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_set_record RECORD;
  v_new_samples INTEGER;
  v_new_set_id UUID;
BEGIN
  -- Check each active calibration set
  FOR v_set_record IN
    SELECT
      id, set_name, set_type, stratum, sample_count, created_at
    FROM conformal_calibration_sets
    WHERE is_active = TRUE
      AND (valid_until < NOW() OR p_force)
  LOOP
    -- Count new samples since last calibration
    SELECT COUNT(*) INTO v_new_samples
    FROM mv_validated_assessments
    WHERE created_at > v_set_record.created_at
      AND (v_set_record.stratum IS NULL OR
           CONCAT(property_age_category::TEXT, '_', damage_type) = v_set_record.stratum);

    -- Recalibrate if we have 20% more samples or forcing
    IF v_new_samples > v_set_record.sample_count * 0.2 OR p_force THEN
      -- Build new calibration set
      v_new_set_id := build_calibration_set(
        v_set_record.set_name,
        v_set_record.set_type,
        v_set_record.stratum
      );

      -- Mark old set as inactive
      UPDATE conformal_calibration_sets
      SET
        is_active = FALSE,
        replaced_by = v_new_set_id
      WHERE id = v_set_record.id;

      RAISE NOTICE 'Recalibrated set % with % new samples',
                   v_set_record.set_name, v_new_samples;
    END IF;
  END LOOP;

  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_validated_assessments;

END;
$$;

COMMENT ON PROCEDURE recalibrate_conformal_models IS 'Automatically recalibrates conformal prediction models';

-- ============================================================================
-- PERFORMANCE MONITORING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conformal_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calibration_set_id UUID NOT NULL REFERENCES conformal_calibration_sets(id) ON DELETE CASCADE,

  -- Evaluation period
  evaluation_start TIMESTAMPTZ NOT NULL,
  evaluation_end TIMESTAMPTZ NOT NULL,

  -- Coverage metrics
  predictions_made INTEGER NOT NULL,
  correct_predictions INTEGER NOT NULL,
  empirical_coverage NUMERIC(4,3) NOT NULL,

  -- Efficiency metrics
  avg_interval_size NUMERIC(4,2) NOT NULL,
  median_interval_size NUMERIC(4,2) NOT NULL,
  singleton_predictions INTEGER NOT NULL, -- Predictions with single class

  -- Per-stratum metrics
  stratum_metrics JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_performance_calibration_set ON conformal_performance_metrics(calibration_set_id);
CREATE INDEX idx_performance_evaluation ON conformal_performance_metrics(evaluation_end DESC);

COMMENT ON TABLE conformal_performance_metrics IS 'Tracks actual performance of conformal prediction models';

-- ============================================================================
-- SCHEDULED JOB: Weekly Recalibration
-- ============================================================================

-- Note: This would typically be scheduled via pg_cron or external scheduler
-- Example pg_cron setup (requires pg_cron extension):
-- SELECT cron.schedule(
--   'recalibrate-conformal-weekly',
--   '0 2 * * 0', -- Every Sunday at 2 AM
--   'CALL recalibrate_conformal_models(FALSE);'
-- );

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE conformal_calibration_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE conformal_calibration_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE conformal_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE conformal_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to calibration sets"
  ON conformal_calibration_sets FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to calibration samples"
  ON conformal_calibration_samples FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to thresholds"
  ON conformal_thresholds FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to performance metrics"
  ON conformal_performance_metrics FOR ALL
  USING (auth.role() = 'service_role');

-- Authenticated users can read active calibration data
CREATE POLICY "Users can read active calibration sets"
  ON conformal_calibration_sets FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Users can read thresholds"
  ON conformal_thresholds FOR SELECT
  USING (TRUE);

-- Admins can manage calibration
CREATE POLICY "Admins can manage calibration sets"
  ON conformal_calibration_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view calibration samples"
  ON conformal_calibration_samples FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view performance metrics"
  ON conformal_performance_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Build initial calibration sets if we have enough data
DO $$
DECLARE
  v_sample_count INTEGER;
BEGIN
  -- Check if we have enough validated samples
  SELECT COUNT(*) INTO v_sample_count
  FROM building_assessments ba
  INNER JOIN building_assessment_outcomes bao ON ba.id = bao.assessment_id
  WHERE bao.learning_successful = TRUE
    AND bao.actual_severity IS NOT NULL
    AND ba.validation_status = 'validated';

  IF v_sample_count >= 500 THEN
    -- Build full calibration set
    PERFORM build_calibration_set('main_calibration', 'full', NULL, 500, 0.2);

    -- Build stratified sets if enough samples per stratum
    IF v_sample_count >= 1500 THEN
      PERFORM build_calibration_set('victorian_calibration', 'stratified', 'victorian_structural', 200, 0.2);
      PERFORM build_calibration_set('modern_calibration', 'stratified', 'modern_water_damage', 200, 0.2);
      PERFORM build_calibration_set('post_war_calibration', 'stratified', 'post_war_structural', 200, 0.2);
    END IF;

    RAISE NOTICE 'Initial calibration sets created with % samples', v_sample_count;
  ELSE
    RAISE NOTICE 'Insufficient samples for calibration: % < 500', v_sample_count;
  END IF;
END $$;

-- ============================================================================
-- HELPER VIEWS FOR ANALYTICS
-- ============================================================================

CREATE OR REPLACE VIEW v_calibration_summary AS
SELECT
  cs.id,
  cs.set_name,
  cs.set_type,
  cs.stratum,
  cs.sample_count,
  cs.mean_confidence,
  cs.std_confidence,
  cs.is_active,
  cs.created_at,
  COUNT(DISTINCT ct.confidence_level) as threshold_levels,
  MAX(pm.empirical_coverage) as latest_coverage,
  MAX(pm.avg_interval_size) as latest_avg_interval_size
FROM conformal_calibration_sets cs
LEFT JOIN conformal_thresholds ct ON cs.id = ct.calibration_set_id
LEFT JOIN conformal_performance_metrics pm ON cs.id = pm.calibration_set_id
GROUP BY
  cs.id, cs.set_name, cs.set_type, cs.stratum, cs.sample_count,
  cs.mean_confidence, cs.std_confidence, cs.is_active, cs.created_at;

COMMENT ON VIEW v_calibration_summary IS 'Summary view of all calibration sets with performance metrics';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON mv_validated_assessments TO authenticated;
GRANT SELECT ON v_calibration_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_conformal_prediction_interval TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_nonconformity_score TO service_role;
GRANT EXECUTE ON FUNCTION build_calibration_set TO service_role;
GRANT EXECUTE ON FUNCTION compute_conformal_thresholds TO service_role;
GRANT EXECUTE ON PROCEDURE recalibrate_conformal_models TO service_role;