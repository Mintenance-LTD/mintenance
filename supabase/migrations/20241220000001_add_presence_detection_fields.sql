-- Add presence detection fields to hybrid_routing_decisions table
-- This migration adds support for SAM3 presence detection tracking

ALTER TABLE hybrid_routing_decisions
ADD COLUMN IF NOT EXISTS presence_detection JSONB,
ADD COLUMN IF NOT EXISTS yolo_skipped BOOLEAN DEFAULT FALSE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hybrid_routing_yolo_skipped
ON hybrid_routing_decisions(yolo_skipped);

CREATE INDEX IF NOT EXISTS idx_hybrid_routing_presence_detection
ON hybrid_routing_decisions((presence_detection->>'damageDetected'));

-- Add comment for documentation
COMMENT ON COLUMN hybrid_routing_decisions.presence_detection IS
'SAM3 presence detection results including damage types detected, presence scores, and detection metrics';

COMMENT ON COLUMN hybrid_routing_decisions.yolo_skipped IS
'Whether YOLO inference was skipped due to no damage being detected by SAM3 presence check';

-- Create view for YOLO savings analytics
CREATE OR REPLACE VIEW yolo_savings_analytics AS
SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_assessments,
    COUNT(*) FILTER (WHERE yolo_skipped = true) as yolo_skipped,
    ROUND(
        COUNT(*) FILTER (WHERE yolo_skipped = true)::numeric /
        NULLIF(COUNT(*), 0) * 100,
        2
    ) as skip_rate_percentage,
    COUNT(*) FILTER (WHERE yolo_skipped = true) * 2000 as estimated_time_saved_ms,
    ROUND(
        AVG((presence_detection->>'averagePresenceScore')::numeric)
        FILTER (WHERE presence_detection IS NOT NULL),
        3
    ) as avg_presence_score,
    ARRAY_AGG(DISTINCT presence_detection->>'damageTypes')
        FILTER (WHERE presence_detection->>'damageDetected' = 'true') as damage_types_detected
FROM hybrid_routing_decisions
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Create function to get YOLO savings metrics
CREATE OR REPLACE FUNCTION get_yolo_savings_metrics(
    start_date TIMESTAMP DEFAULT CURRENT_DATE - INTERVAL '7 days',
    end_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
RETURNS TABLE(
    total_assessments BIGINT,
    yolo_skipped BIGINT,
    skip_rate NUMERIC,
    estimated_time_saved_ms BIGINT,
    estimated_compute_saved BIGINT,
    avg_presence_score NUMERIC,
    most_common_damage_types TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_assessments,
        COUNT(*) FILTER (WHERE yolo_skipped = true)::BIGINT as yolo_skipped,
        ROUND(
            COUNT(*) FILTER (WHERE yolo_skipped = true)::numeric /
            NULLIF(COUNT(*), 0) * 100,
            2
        ) as skip_rate,
        (COUNT(*) FILTER (WHERE yolo_skipped = true) * 2000)::BIGINT as estimated_time_saved_ms,
        COUNT(*) FILTER (WHERE yolo_skipped = true)::BIGINT as estimated_compute_saved,
        ROUND(
            AVG((presence_detection->>'averagePresenceScore')::numeric)
            FILTER (WHERE presence_detection IS NOT NULL),
            3
        ) as avg_presence_score,
        ARRAY(
            SELECT unnest(string_to_array(damage_type, ','))
            FROM (
                SELECT presence_detection->>'damageTypes' as damage_type
                FROM hybrid_routing_decisions
                WHERE created_at BETWEEN start_date AND end_date
                AND presence_detection->>'damageDetected' = 'true'
                AND presence_detection->>'damageTypes' IS NOT NULL
            ) t
            GROUP BY unnest
            ORDER BY COUNT(*) DESC
            LIMIT 5
        ) as most_common_damage_types
    FROM hybrid_routing_decisions
    WHERE created_at BETWEEN start_date AND end_date;
END;
$$;

-- Add RLS policies for the new fields
ALTER TABLE hybrid_routing_decisions ENABLE ROW LEVEL SECURITY;

-- Policy for service accounts to insert/update presence detection data
CREATE POLICY "Service accounts can manage presence detection data"
ON hybrid_routing_decisions
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Policy for authenticated users to read their own assessment data
CREATE POLICY "Users can read their own assessment routing decisions"
ON hybrid_routing_decisions
FOR SELECT
USING (
    auth.role() = 'authenticated'
    AND (
        assessment_id IN (
            SELECT id FROM assessments
            WHERE user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'admin'
    )
);

-- Grant permissions to use the function
GRANT EXECUTE ON FUNCTION get_yolo_savings_metrics TO authenticated;
GRANT SELECT ON yolo_savings_analytics TO authenticated;