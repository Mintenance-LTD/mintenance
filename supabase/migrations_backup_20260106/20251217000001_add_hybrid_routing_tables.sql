-- Create hybrid routing decisions table for analytics
CREATE TABLE IF NOT EXISTS hybrid_routing_decisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id uuid REFERENCES building_assessments(id) ON DELETE SET NULL,
    route_selected text NOT NULL CHECK (route_selected IN ('internal', 'gpt4_vision', 'hybrid')),
    internal_confidence numeric(4,3),
    internal_prediction jsonb,
    gpt4_prediction jsonb,
    final_assessment jsonb NOT NULL,
    route_reasoning text,
    inference_time_ms integer,
    image_count integer NOT NULL DEFAULT 1,
    agreement_score numeric(5,2),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create confidence calibration data table
CREATE TABLE IF NOT EXISTS confidence_calibration_data (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    routing_decision_id uuid REFERENCES hybrid_routing_decisions(id) ON DELETE CASCADE,
    route_used text NOT NULL,
    internal_confidence numeric(4,3),
    was_correct boolean NOT NULL,
    actual_severity text,
    actual_urgency text,
    human_feedback jsonb,
    created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_hybrid_routing_decisions_assessment_id ON hybrid_routing_decisions(assessment_id);
CREATE INDEX idx_hybrid_routing_decisions_route ON hybrid_routing_decisions(route_selected);
CREATE INDEX idx_hybrid_routing_decisions_created_at ON hybrid_routing_decisions(created_at DESC);
CREATE INDEX idx_confidence_calibration_routing_id ON confidence_calibration_data(routing_decision_id);

-- Enable RLS
ALTER TABLE hybrid_routing_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE confidence_calibration_data ENABLE ROW LEVEL SECURITY;

-- RLS policies for hybrid_routing_decisions
CREATE POLICY "Service role can manage routing decisions"
    ON hybrid_routing_decisions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read routing decisions"
    ON hybrid_routing_decisions
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS policies for confidence_calibration_data
CREATE POLICY "Service role can manage calibration data"
    ON confidence_calibration_data
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admin users can manage calibration data"
    ON confidence_calibration_data
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hybrid_routing_decisions_updated_at
    BEFORE UPDATE ON hybrid_routing_decisions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE hybrid_routing_decisions IS 'Tracks routing decisions between internal model and GPT-4 Vision for cost optimization';
COMMENT ON TABLE confidence_calibration_data IS 'Human feedback for calibrating confidence thresholds';
COMMENT ON COLUMN hybrid_routing_decisions.route_selected IS 'The route taken: internal (YOLO only), gpt4_vision (GPT-4 only), or hybrid (both)';
COMMENT ON COLUMN hybrid_routing_decisions.agreement_score IS 'Percentage agreement between internal and GPT-4 predictions (0-100)';
COMMENT ON COLUMN confidence_calibration_data.was_correct IS 'Whether the prediction was validated as correct by human review';