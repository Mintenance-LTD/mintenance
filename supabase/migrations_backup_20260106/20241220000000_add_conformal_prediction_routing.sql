-- Migration: Add conformal prediction columns to hybrid_routing_decisions
-- Purpose: Track conformal prediction usage in routing decisions for calibrated uncertainty

-- Add columns to hybrid_routing_decisions table if they don't exist
ALTER TABLE hybrid_routing_decisions
ADD COLUMN IF NOT EXISTS conformal_interval_size INTEGER,
ADD COLUMN IF NOT EXISTS conformal_stratum TEXT,
ADD COLUMN IF NOT EXISTS conformal_calibration_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS property_age_category TEXT CHECK (property_age_category IN ('victorian', 'post_war', 'modern', 'unknown'));

-- Create index for conformal prediction analytics
CREATE INDEX IF NOT EXISTS idx_routing_conformal_stratum
ON hybrid_routing_decisions(conformal_stratum)
WHERE conformal_calibration_used = TRUE;

CREATE INDEX IF NOT EXISTS idx_routing_interval_size
ON hybrid_routing_decisions(conformal_interval_size)
WHERE conformal_calibration_used = TRUE;

CREATE INDEX IF NOT EXISTS idx_routing_property_age
ON hybrid_routing_decisions(property_age_category)
WHERE property_age_category IS NOT NULL;

-- Create view for conformal prediction routing analytics
CREATE OR REPLACE VIEW v_conformal_routing_analytics AS
SELECT
    DATE_TRUNC('day', created_at) as date,
    route_selected,
    conformal_calibration_used,
    conformal_interval_size,
    conformal_stratum,
    property_age_category,
    COUNT(*) as decision_count,
    AVG(internal_confidence) as avg_confidence,
    AVG(inference_time_ms) as avg_inference_time,
    AVG(agreement_score) as avg_agreement_score,
    COUNT(CASE WHEN conformal_interval_size = 1 THEN 1 END) as certain_predictions,
    COUNT(CASE WHEN conformal_interval_size = 2 THEN 1 END) as moderate_uncertainty,
    COUNT(CASE WHEN conformal_interval_size >= 3 THEN 1 END) as high_uncertainty
FROM hybrid_routing_decisions
GROUP BY
    DATE_TRUNC('day', created_at),
    route_selected,
    conformal_calibration_used,
    conformal_interval_size,
    conformal_stratum,
    property_age_category;

-- Create materialized view for stratum performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_stratum_routing_performance AS
SELECT
    conformal_stratum,
    property_age_category,
    COUNT(*) as total_decisions,
    AVG(conformal_interval_size) as avg_interval_size,
    COUNT(CASE WHEN route_selected = 'internal' THEN 1 END)::FLOAT / COUNT(*) as internal_rate,
    COUNT(CASE WHEN route_selected = 'hybrid' THEN 1 END)::FLOAT / COUNT(*) as hybrid_rate,
    COUNT(CASE WHEN route_selected = 'gpt4_vision' THEN 1 END)::FLOAT / COUNT(*) as gpt4_rate,
    AVG(inference_time_ms) as avg_inference_time,
    MIN(created_at) as first_used,
    MAX(created_at) as last_used
FROM hybrid_routing_decisions
WHERE conformal_calibration_used = TRUE
GROUP BY conformal_stratum, property_age_category;

-- Create function to track conformal prediction effectiveness
CREATE OR REPLACE FUNCTION calculate_conformal_effectiveness(
    p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '7 days',
    p_end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT
            COUNT(*) FILTER (WHERE conformal_calibration_used = TRUE) as with_conformal,
            COUNT(*) FILTER (WHERE conformal_calibration_used = FALSE) as without_conformal,
            AVG(conformal_interval_size) FILTER (WHERE conformal_calibration_used = TRUE) as avg_interval,
            COUNT(DISTINCT conformal_stratum) FILTER (WHERE conformal_calibration_used = TRUE) as unique_strata,
            AVG(inference_time_ms) FILTER (WHERE conformal_calibration_used = TRUE) as avg_time_with,
            AVG(inference_time_ms) FILTER (WHERE conformal_calibration_used = FALSE) as avg_time_without
        FROM hybrid_routing_decisions
        WHERE created_at BETWEEN p_start_date AND p_end_date
    )
    SELECT 'total_with_conformal'::TEXT, with_conformal::NUMERIC FROM stats
    UNION ALL
    SELECT 'total_without_conformal'::TEXT, without_conformal::NUMERIC FROM stats
    UNION ALL
    SELECT 'calibration_coverage_pct'::TEXT,
           CASE
               WHEN (with_conformal + without_conformal) > 0
               THEN (with_conformal::NUMERIC / (with_conformal + without_conformal) * 100)
               ELSE 0
           END FROM stats
    UNION ALL
    SELECT 'avg_interval_size'::TEXT, COALESCE(avg_interval, 0)::NUMERIC FROM stats
    UNION ALL
    SELECT 'unique_strata_used'::TEXT, COALESCE(unique_strata, 0)::NUMERIC FROM stats
    UNION ALL
    SELECT 'avg_inference_time_with_conformal_ms'::TEXT, COALESCE(avg_time_with, 0)::NUMERIC FROM stats
    UNION ALL
    SELECT 'avg_inference_time_without_conformal_ms'::TEXT, COALESCE(avg_time_without, 0)::NUMERIC FROM stats;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh materialized view periodically
CREATE OR REPLACE FUNCTION refresh_stratum_performance()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stratum_routing_performance;
END;
$$ LANGUAGE plpgsql;

-- Add comment documentation
COMMENT ON COLUMN hybrid_routing_decisions.conformal_interval_size IS 'Size of the conformal prediction interval (1=certain, 2=moderate uncertainty, 3+=high uncertainty)';
COMMENT ON COLUMN hybrid_routing_decisions.conformal_stratum IS 'Mondrian stratum used for conformal prediction (e.g., victorian_water_damage, modern, global)';
COMMENT ON COLUMN hybrid_routing_decisions.conformal_calibration_used IS 'Whether calibrated conformal prediction was used for routing decision';
COMMENT ON COLUMN hybrid_routing_decisions.property_age_category IS 'Property age category for stratified conformal prediction';

-- Grant necessary permissions
GRANT SELECT ON v_conformal_routing_analytics TO authenticated;
GRANT SELECT ON mv_stratum_routing_performance TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_conformal_effectiveness TO authenticated;