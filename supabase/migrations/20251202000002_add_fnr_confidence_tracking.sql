-- Migration: Add FNR Confidence Tracking with Wilson Score Intervals
-- Purpose: Track False Negative Rate with statistical confidence intervals
-- Date: 2025-12-02

-- ============================================================================
-- Add New Columns to ab_critic_fnr_tracking
-- ============================================================================

-- Add fnr_upper_bound column (Wilson score upper bound at 95% confidence)
ALTER TABLE ab_critic_fnr_tracking
ADD COLUMN IF NOT EXISTS fnr_upper_bound NUMERIC DEFAULT NULL;

-- Add confidence_level column (e.g., 0.95 for 95% confidence)
ALTER TABLE ab_critic_fnr_tracking
ADD COLUMN IF NOT EXISTS confidence_level NUMERIC DEFAULT 0.95;

-- Add last_escalation_at timestamp (when last escalated due to FNR)
ALTER TABLE ab_critic_fnr_tracking
ADD COLUMN IF NOT EXISTS last_escalation_at TIMESTAMPTZ DEFAULT NULL;

-- Add escalation_count (number of times escalated due to FNR)
ALTER TABLE ab_critic_fnr_tracking
ADD COLUMN IF NOT EXISTS escalation_count INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN ab_critic_fnr_tracking.fnr_upper_bound IS 'Wilson score upper bound for FNR at confidence_level';
COMMENT ON COLUMN ab_critic_fnr_tracking.confidence_level IS 'Confidence level for Wilson score interval (typically 0.95)';
COMMENT ON COLUMN ab_critic_fnr_tracking.last_escalation_at IS 'Timestamp of last escalation due to FNR threshold violation';
COMMENT ON COLUMN ab_critic_fnr_tracking.escalation_count IS 'Total number of escalations due to FNR threshold violations';

-- ============================================================================
-- Create Trigger Function to Compute Wilson Score
-- ============================================================================

CREATE OR REPLACE FUNCTION update_fnr_statistics()
RETURNS TRIGGER AS $$
DECLARE
  p NUMERIC;
  z NUMERIC := 1.96; -- 95% confidence (z-score)
  n NUMERIC;
  denominator NUMERIC;
  center NUMERIC;
  margin NUMERIC;
BEGIN
  -- Only compute if we have data
  IF NEW.total_automated > 0 THEN
    -- Compute point estimate
    p := NEW.false_negatives::NUMERIC / NEW.total_automated::NUMERIC;
    n := NEW.total_automated::NUMERIC;

    -- Compute Wilson score upper bound
    -- Formula: (p + z²/(2n) + z * sqrt(p(1-p)/n + z²/(4n²))) / (1 + z²/n)
    denominator := 1 + (z * z) / n;
    center := (p + (z * z) / (2 * n)) / denominator;
    margin := z * sqrt(p * (1 - p) / n + (z * z) / (4 * n * n)) / denominator;

    -- Set upper bound (capped at 1.0)
    NEW.fnr_upper_bound := LEAST(1.0, center + margin);

    -- Compute FNR point estimate
    NEW.fnr := p;
  ELSE
    -- No data: conservative defaults
    NEW.fnr := 0;
    NEW.fnr_upper_bound := 1.0;
  END IF;

  -- Set confidence level
  NEW.confidence_level := 0.95;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION update_fnr_statistics() IS 'Automatically compute FNR and Wilson score upper bound on insert/update';

-- ============================================================================
-- Create Trigger
-- ============================================================================

DROP TRIGGER IF EXISTS update_fnr_statistics_trigger ON ab_critic_fnr_tracking;

CREATE TRIGGER update_fnr_statistics_trigger
  BEFORE INSERT OR UPDATE OF false_negatives, total_automated
  ON ab_critic_fnr_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_fnr_statistics();

COMMENT ON TRIGGER update_fnr_statistics_trigger ON ab_critic_fnr_tracking IS 'Compute FNR statistics before insert/update';

-- ============================================================================
-- Create Indices for Performance
-- ============================================================================

-- Index on fnr_upper_bound for quick threshold queries
CREATE INDEX IF NOT EXISTS idx_fnr_upper_bound
ON ab_critic_fnr_tracking(fnr_upper_bound)
WHERE fnr_upper_bound >= 0.05;

-- Index on last_escalation_at for monitoring recent escalations
CREATE INDEX IF NOT EXISTS idx_last_escalation_at
ON ab_critic_fnr_tracking(last_escalation_at DESC NULLS LAST);

-- Composite index for confidence tracking queries
CREATE INDEX IF NOT EXISTS idx_fnr_confidence
ON ab_critic_fnr_tracking(stratum, fnr_upper_bound, confidence_level);

-- ============================================================================
-- Backfill Existing Data
-- ============================================================================

-- Compute Wilson score for all existing rows
UPDATE ab_critic_fnr_tracking
SET
  false_negatives = false_negatives, -- Trigger function via update
  updated_at = NOW()
WHERE fnr_upper_bound IS NULL;

-- ============================================================================
-- Add Helper Views
-- ============================================================================

-- View: FNR monitoring summary by confidence level
CREATE OR REPLACE VIEW v_fnr_monitoring_summary AS
SELECT
  CASE
    WHEN total_automated >= 100 THEN 'high_confidence'
    WHEN total_automated >= 30 THEN 'medium_confidence'
    WHEN total_automated >= 10 THEN 'low_confidence'
    ELSE 'insufficient_data'
  END AS confidence_category,
  COUNT(*) AS stratum_count,
  AVG(fnr) AS avg_fnr,
  AVG(fnr_upper_bound) AS avg_fnr_upper_bound,
  MAX(fnr_upper_bound) AS max_fnr_upper_bound,
  SUM(CASE WHEN fnr_upper_bound >= 0.05 THEN 1 ELSE 0 END) AS strata_exceeding_threshold,
  AVG(total_automated) AS avg_sample_size,
  SUM(escalation_count) AS total_escalations
FROM ab_critic_fnr_tracking
GROUP BY confidence_category;

COMMENT ON VIEW v_fnr_monitoring_summary IS 'Summary of FNR statistics grouped by confidence level';

-- View: Recent escalations
CREATE OR REPLACE VIEW v_fnr_recent_escalations AS
SELECT
  stratum,
  fnr,
  fnr_upper_bound,
  total_automated,
  escalation_count,
  last_escalation_at,
  (fnr_upper_bound - 0.05) * 100 AS excess_fnr_percentage
FROM ab_critic_fnr_tracking
WHERE last_escalation_at IS NOT NULL
  AND last_escalation_at > NOW() - INTERVAL '7 days'
ORDER BY last_escalation_at DESC
LIMIT 100;

COMMENT ON VIEW v_fnr_recent_escalations IS 'Recent escalations due to FNR violations (last 7 days)';

-- View: Edge cases requiring attention
CREATE OR REPLACE VIEW v_fnr_edge_cases AS
SELECT
  stratum,
  fnr,
  fnr_upper_bound,
  total_automated,
  confidence_level,
  CASE
    WHEN total_automated < 10 THEN 'insufficient_sample_size'
    WHEN fnr_upper_bound >= 0.05 AND total_automated < 30 THEN 'high_fnr_low_confidence'
    WHEN fnr > 0.10 THEN 'very_high_fnr'
    WHEN fnr_upper_bound >= 0.10 THEN 'very_high_fnr_upper_bound'
  END AS edge_case_type,
  last_escalation_at
FROM ab_critic_fnr_tracking
WHERE
  total_automated < 10
  OR (fnr_upper_bound >= 0.05 AND total_automated < 30)
  OR fnr > 0.10
  OR fnr_upper_bound >= 0.10
ORDER BY
  CASE
    WHEN fnr_upper_bound >= 0.10 THEN 1
    WHEN total_automated < 10 THEN 2
    WHEN fnr > 0.10 THEN 3
    ELSE 4
  END,
  fnr_upper_bound DESC;

COMMENT ON VIEW v_fnr_edge_cases IS 'Edge cases requiring human attention (insufficient data, high FNR, etc.)';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant read permissions on views to authenticated users
GRANT SELECT ON v_fnr_monitoring_summary TO authenticated;
GRANT SELECT ON v_fnr_recent_escalations TO authenticated;
GRANT SELECT ON v_fnr_edge_cases TO authenticated;
