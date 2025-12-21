-- ============================================================================
-- Calibration Data Extraction Queries
-- Created: 2025-12-20
-- Description: Optimized queries for extracting validated calibration data
-- ============================================================================

-- ============================================================================
-- Query 1: Extract Initial Calibration Set (Full Dataset)
-- ============================================================================

-- This query extracts all validated assessments with ground truth for initial calibration
WITH validated_data AS (
  SELECT
    ba.id as assessment_id,
    ba.damage_type,
    ba.severity as predicted_severity,
    ba.confidence as predicted_confidence,
    ba.safety_score,
    ba.compliance_score,
    ba.insurance_risk_score,
    ba.urgency,
    ba.assessment_data,
    ba.created_at,

    -- Ground truth from outcomes
    bao.actual_damage_type,
    bao.actual_severity,
    bao.actual_cost,
    bao.actual_urgency,
    bao.outcome_type,
    bao.accuracy_metrics,

    -- Extract property metadata from JSON
    COALESCE(
      (ba.assessment_data->>'property_type')::VARCHAR,
      'residential'
    ) as property_type,

    COALESCE(
      (ba.assessment_data->>'construction_year')::INTEGER,
      EXTRACT(YEAR FROM ba.created_at)::INTEGER - 30
    ) as construction_year,

    -- Routing decisions if available
    hrd.route_selected,
    hrd.internal_confidence,
    hrd.gpt4_prediction,
    hrd.agreement_score,
    hrd.inference_time_ms,

    -- Calculate property age category
    CASE
      WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) < 1900
        THEN 'victorian'
      WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) BETWEEN 1900 AND 1969
        THEN 'post_war'
      WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) >= 1970
        THEN 'modern'
      ELSE 'unknown'
    END as property_age_category,

    -- Create stratum identifier for Mondrian CP
    CONCAT(
      CASE
        WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) < 1900 THEN 'victorian'
        WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) BETWEEN 1900 AND 1969 THEN 'post_war'
        WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) >= 1970 THEN 'modern'
        ELSE 'unknown'
      END,
      '_',
      LOWER(REPLACE(ba.damage_type, ' ', '_'))
    ) as mondrian_stratum

  FROM building_assessments ba
  INNER JOIN building_assessment_outcomes bao
    ON ba.id = bao.assessment_id
  LEFT JOIN hybrid_routing_decisions hrd
    ON ba.id = hrd.assessment_id
  WHERE
    ba.validation_status = 'validated'
    AND bao.learning_successful = TRUE
    AND bao.actual_severity IS NOT NULL
    AND ba.confidence IS NOT NULL
)
SELECT
  assessment_id,
  damage_type,
  predicted_severity,
  predicted_confidence,
  actual_severity,
  actual_damage_type,
  property_age_category,
  mondrian_stratum,

  -- Calculate agreement flag for filtering
  (predicted_severity = actual_severity) as severity_match,

  -- Extract features for model input
  jsonb_build_object(
    'damage_type', damage_type,
    'property_type', property_type,
    'property_age', EXTRACT(YEAR FROM NOW()) - construction_year,
    'safety_score', safety_score,
    'compliance_score', compliance_score,
    'insurance_risk_score', insurance_risk_score,
    'urgency', urgency,
    'internal_confidence', internal_confidence,
    'route_selected', route_selected
  ) as feature_vector,

  -- Build prediction scores (probability distribution over classes)
  jsonb_build_object(
    'early',
    CASE
      WHEN predicted_severity = 'early' THEN predicted_confidence
      WHEN predicted_severity = 'midway' THEN (1 - predicted_confidence) * 0.7
      ELSE (1 - predicted_confidence) * 0.3
    END,
    'midway',
    CASE
      WHEN predicted_severity = 'midway' THEN predicted_confidence
      WHEN predicted_severity = 'early' THEN (1 - predicted_confidence) * 0.6
      ELSE (1 - predicted_confidence) * 0.4
    END,
    'full',
    CASE
      WHEN predicted_severity = 'full' THEN predicted_confidence
      WHEN predicted_severity = 'midway' THEN (1 - predicted_confidence) * 0.3
      ELSE (1 - predicted_confidence) * 0.1
    END
  ) as prediction_scores,

  outcome_type as ground_truth_source,
  created_at

FROM validated_data
ORDER BY created_at DESC;

-- ============================================================================
-- Query 2: Stratified Sampling for Balanced Calibration Set
-- ============================================================================

-- This ensures balanced representation across property types and damage severities
WITH stratified_counts AS (
  SELECT
    property_age_category,
    actual_severity,
    COUNT(*) as stratum_count,
    -- Target 200 samples per stratum, proportionally sampled
    LEAST(200, COUNT(*)) as target_samples
  FROM (
    SELECT
      ba.id,
      bao.actual_severity,
      CASE
        WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) < 1900 THEN 'victorian'
        WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) BETWEEN 1900 AND 1969 THEN 'post_war'
        WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) >= 1970 THEN 'modern'
        ELSE 'unknown'
      END as property_age_category
    FROM building_assessments ba
    INNER JOIN building_assessment_outcomes bao ON ba.id = bao.assessment_id
    WHERE ba.validation_status = 'validated'
      AND bao.learning_successful = TRUE
      AND bao.actual_severity IS NOT NULL
  ) stratified_data
  GROUP BY property_age_category, actual_severity
),
stratified_sample AS (
  SELECT
    ba.id as assessment_id,
    ba.damage_type,
    ba.severity as predicted_severity,
    ba.confidence as predicted_confidence,
    bao.actual_severity,
    bao.actual_damage_type,
    CASE
      WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) < 1900 THEN 'victorian'
      WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) BETWEEN 1900 AND 1969 THEN 'post_war'
      WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) >= 1970 THEN 'modern'
      ELSE 'unknown'
    END as property_age_category,
    ROW_NUMBER() OVER (
      PARTITION BY
        CASE
          WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) < 1900 THEN 'victorian'
          WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) BETWEEN 1900 AND 1969 THEN 'post_war'
          WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) >= 1970 THEN 'modern'
          ELSE 'unknown'
        END,
        bao.actual_severity
      ORDER BY RANDOM()
    ) as stratum_rank
  FROM building_assessments ba
  INNER JOIN building_assessment_outcomes bao ON ba.id = bao.assessment_id
  WHERE ba.validation_status = 'validated'
    AND bao.learning_successful = TRUE
    AND bao.actual_severity IS NOT NULL
)
SELECT
  ss.assessment_id,
  ss.damage_type,
  ss.predicted_severity,
  ss.predicted_confidence,
  ss.actual_severity,
  ss.actual_damage_type,
  ss.property_age_category,
  sc.target_samples,
  sc.stratum_count
FROM stratified_sample ss
JOIN stratified_counts sc
  ON sc.property_age_category = ss.property_age_category
  AND sc.actual_severity = ss.actual_severity
WHERE ss.stratum_rank <= sc.target_samples
ORDER BY ss.property_age_category, ss.actual_severity, ss.stratum_rank;

-- ============================================================================
-- Query 3: Recent Assessments for Incremental Calibration Updates
-- ============================================================================

-- Get new validated assessments since last calibration
WITH last_calibration AS (
  SELECT MAX(created_at) as last_update
  FROM conformal_calibration_sets
  WHERE is_active = TRUE
)
SELECT
  ba.id as assessment_id,
  ba.damage_type,
  ba.severity as predicted_severity,
  ba.confidence as predicted_confidence,
  ba.assessment_data,
  bao.actual_severity,
  bao.actual_damage_type,
  bao.outcome_type,
  bao.accuracy_metrics,
  hrd.route_selected,
  hrd.internal_confidence,
  hrd.agreement_score,
  ba.created_at,
  bao.learned_at
FROM building_assessments ba
INNER JOIN building_assessment_outcomes bao
  ON ba.id = bao.assessment_id
LEFT JOIN hybrid_routing_decisions hrd
  ON ba.id = hrd.assessment_id
CROSS JOIN last_calibration lc
WHERE
  ba.validation_status = 'validated'
  AND bao.learning_successful = TRUE
  AND bao.actual_severity IS NOT NULL
  AND ba.created_at > lc.last_update
ORDER BY ba.created_at DESC;

-- ============================================================================
-- Query 4: Performance Monitoring - Coverage Statistics
-- ============================================================================

-- Monitor actual vs expected coverage for each calibration set
WITH recent_predictions AS (
  SELECT
    ba.id,
    ba.severity as predicted,
    ba.confidence,
    bao.actual_severity as actual,
    hrd.route_selected,
    cs.id as calibration_set_id,
    cs.set_name,
    cs.target_coverage
  FROM building_assessments ba
  INNER JOIN building_assessment_outcomes bao ON ba.id = bao.assessment_id
  LEFT JOIN hybrid_routing_decisions hrd ON ba.id = hrd.assessment_id
  CROSS JOIN LATERAL (
    SELECT id, set_name, target_coverage
    FROM conformal_calibration_sets
    WHERE is_active = TRUE
    ORDER BY
      CASE
        WHEN stratum = CONCAT(
          CASE
            WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) < 1900 THEN 'victorian'
            WHEN COALESCE((ba.assessment_data->>'construction_year')::INTEGER, 1980) BETWEEN 1900 AND 1969 THEN 'post_war'
            ELSE 'modern'
          END,
          '_',
          LOWER(REPLACE(ba.damage_type, ' ', '_'))
        ) THEN 1
        ELSE 2
      END,
      created_at DESC
    LIMIT 1
  ) cs
  WHERE ba.created_at > NOW() - INTERVAL '7 days'
    AND bao.actual_severity IS NOT NULL
)
SELECT
  calibration_set_id,
  set_name,
  COUNT(*) as total_predictions,
  SUM(CASE WHEN predicted = actual THEN 1 ELSE 0 END) as correct_predictions,
  AVG(CASE WHEN predicted = actual THEN 1 ELSE 0 END)::NUMERIC(4,3) as empirical_coverage,
  MAX(target_coverage) as target_coverage,
  AVG(confidence)::NUMERIC(4,3) as avg_confidence,

  -- Breakdown by route
  COUNT(*) FILTER (WHERE route_selected = 'internal') as internal_count,
  AVG(CASE WHEN predicted = actual THEN 1 ELSE 0 END)
    FILTER (WHERE route_selected = 'internal')::NUMERIC(4,3) as internal_coverage,

  COUNT(*) FILTER (WHERE route_selected = 'gpt4_vision') as gpt4_count,
  AVG(CASE WHEN predicted = actual THEN 1 ELSE 0 END)
    FILTER (WHERE route_selected = 'gpt4_vision')::NUMERIC(4,3) as gpt4_coverage,

  -- Calibration error
  ABS(
    AVG(CASE WHEN predicted = actual THEN 1 ELSE 0 END) - MAX(target_coverage)
  )::NUMERIC(5,4) as calibration_error

FROM recent_predictions
GROUP BY calibration_set_id, set_name
ORDER BY calibration_error ASC;

-- ============================================================================
-- Query 5: Nonconformity Score Distribution Analysis
-- ============================================================================

-- Analyze distribution of nonconformity scores by stratum
WITH score_distribution AS (
  SELECT
    cs.set_name,
    cs.stratum,
    samples.property_age_category,
    samples.damage_category,
    samples.nonconformity_score,
    samples.predicted_confidence,
    (samples.predicted_severity = samples.true_severity) as correct_prediction,

    -- Bucket nonconformity scores for histogram
    WIDTH_BUCKET(samples.nonconformity_score, 0, 2, 20) as score_bucket

  FROM conformal_calibration_samples samples
  JOIN conformal_calibration_sets cs ON samples.calibration_set_id = cs.id
  WHERE cs.is_active = TRUE
)
SELECT
  set_name,
  stratum,
  property_age_category,

  -- Distribution statistics
  COUNT(*) as sample_count,
  MIN(nonconformity_score)::NUMERIC(6,4) as min_score,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY nonconformity_score)::NUMERIC(6,4) as q1_score,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY nonconformity_score)::NUMERIC(6,4) as median_score,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY nonconformity_score)::NUMERIC(6,4) as q3_score,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY nonconformity_score)::NUMERIC(6,4) as q95_score,
  MAX(nonconformity_score)::NUMERIC(6,4) as max_score,
  AVG(nonconformity_score)::NUMERIC(6,4) as mean_score,
  STDDEV(nonconformity_score)::NUMERIC(6,4) as std_score,

  -- Performance correlation
  CORR(nonconformity_score, predicted_confidence)::NUMERIC(4,3) as score_confidence_corr,
  AVG(CASE WHEN correct_prediction THEN 1 ELSE 0 END)::NUMERIC(4,3) as accuracy,

  -- Histogram data (for visualization)
  jsonb_object_agg(
    score_bucket,
    bucket_count
  ) as score_histogram

FROM (
  SELECT
    set_name,
    stratum,
    property_age_category,
    nonconformity_score,
    predicted_confidence,
    correct_prediction,
    score_bucket,
    COUNT(*) OVER (PARTITION BY set_name, stratum, property_age_category, score_bucket) as bucket_count
  FROM score_distribution
) bucketed

GROUP BY set_name, stratum, property_age_category
ORDER BY set_name, stratum, property_age_category;

-- ============================================================================
-- Query 6: Identify Samples Needing Manual Review
-- ============================================================================

-- Find assessments with high uncertainty that need expert validation
SELECT
  ba.id as assessment_id,
  ba.damage_type,
  ba.severity as predicted_severity,
  ba.confidence as predicted_confidence,
  ba.urgency,

  -- Uncertainty indicators
  hrd.agreement_score,
  hrd.route_selected,
  ABS(hrd.internal_confidence - ba.confidence) as confidence_divergence,

  -- Priority score for review (higher = needs review more)
  (
    -- Low confidence
    (1 - ba.confidence) * 0.3 +
    -- Low agreement between models
    COALESCE((100 - hrd.agreement_score) / 100.0, 0.5) * 0.3 +
    -- High urgency items
    CASE ba.urgency
      WHEN 'immediate' THEN 0.4
      WHEN 'urgent' THEN 0.3
      WHEN 'soon' THEN 0.2
      ELSE 0.1
    END
  ) as review_priority_score,

  ba.created_at

FROM building_assessments ba
LEFT JOIN building_assessment_outcomes bao ON ba.id = bao.assessment_id
LEFT JOIN hybrid_routing_decisions hrd ON ba.id = hrd.assessment_id
WHERE
  -- No ground truth yet
  bao.id IS NULL
  -- Recent assessments
  AND ba.created_at > NOW() - INTERVAL '30 days'
  -- Uncertain predictions
  AND (
    ba.confidence < 0.7
    OR hrd.agreement_score < 70
    OR ABS(hrd.internal_confidence - ba.confidence) > 0.2
  )
ORDER BY review_priority_score DESC
LIMIT 100;

-- ============================================================================
-- Query 7: Calibration Set Quality Metrics
-- ============================================================================

-- Evaluate quality and representativeness of calibration sets
WITH set_statistics AS (
  SELECT
    cs.id,
    cs.set_name,
    cs.set_type,
    cs.stratum,
    cs.sample_count,
    cs.created_at,
    cs.valid_until,

    -- Sample diversity
    COUNT(DISTINCT samples.property_age_category) as property_types_covered,
    COUNT(DISTINCT samples.damage_category) as damage_types_covered,
    COUNT(DISTINCT samples.true_severity) as severity_levels_covered,

    -- Balance metrics
    STDDEV(severity_counts.count)::NUMERIC(6,2) as severity_imbalance,
    MIN(severity_counts.count) as min_severity_samples,
    MAX(severity_counts.count) as max_severity_samples

  FROM conformal_calibration_sets cs
  JOIN conformal_calibration_samples samples ON cs.id = samples.calibration_set_id
  LEFT JOIN LATERAL (
    SELECT true_severity, COUNT(*) as count
    FROM conformal_calibration_samples
    WHERE calibration_set_id = cs.id
    GROUP BY true_severity
  ) severity_counts ON TRUE
  WHERE cs.is_active = TRUE
  GROUP BY cs.id, cs.set_name, cs.set_type, cs.stratum, cs.sample_count, cs.created_at, cs.valid_until
)
SELECT
  set_name,
  set_type,
  stratum,
  sample_count,

  -- Coverage metrics
  property_types_covered,
  damage_types_covered,
  severity_levels_covered,

  -- Balance score (0-1, higher is better)
  CASE
    WHEN max_severity_samples > 0 THEN
      (min_severity_samples::NUMERIC / max_severity_samples::NUMERIC)
    ELSE 0
  END as balance_score,

  -- Freshness
  EXTRACT(DAY FROM valid_until - NOW()) as days_until_expiry,
  EXTRACT(DAY FROM NOW() - created_at) as age_days,

  -- Quality score (composite metric)
  (
    -- Diversity component
    (property_types_covered::NUMERIC / 3) * 0.2 +
    (damage_types_covered::NUMERIC / 10) * 0.2 +
    (severity_levels_covered::NUMERIC / 3) * 0.2 +
    -- Balance component
    CASE
      WHEN max_severity_samples > 0 THEN
        (min_severity_samples::NUMERIC / max_severity_samples::NUMERIC) * 0.2
      ELSE 0
    END +
    -- Size component (more samples = better, up to 2000)
    LEAST(sample_count::NUMERIC / 2000, 1) * 0.2
  ) as quality_score

FROM set_statistics
ORDER BY quality_score DESC;