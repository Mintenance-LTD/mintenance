-- Model Drift Detection Tables
-- Tracks model performance over time and detects when retraining is needed

-- Model predictions log for drift analysis
CREATE TABLE IF NOT EXISTS model_predictions_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id uuid NOT NULL,
    model_version text NOT NULL,
    confidence numeric(4,3) NOT NULL,
    damage_type text NOT NULL,
    severity text NOT NULL,
    urgency text NOT NULL,
    gpt4_agreement boolean,
    image_features jsonb,
    timestamp timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- User corrections for accuracy tracking
CREATE TABLE IF NOT EXISTS user_corrections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id uuid NOT NULL,
    was_correct boolean NOT NULL,
    actual_severity text,
    actual_urgency text,
    feedback text,
    user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    timestamp timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Model performance baseline for drift comparison
CREATE TABLE IF NOT EXISTS model_performance_baseline (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version text NOT NULL UNIQUE,
    metrics jsonb NOT NULL,
    damage_type_distribution jsonb,
    sample_count integer NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Model performance snapshots over time
CREATE TABLE IF NOT EXISTS model_performance_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version text NOT NULL,
    timestamp timestamptz NOT NULL,
    metrics jsonb NOT NULL,
    sample_count integer NOT NULL,
    alerts jsonb,
    performance_score integer,
    created_at timestamptz DEFAULT now()
);

-- Drift notifications sent
CREATE TABLE IF NOT EXISTS drift_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    model_version text NOT NULL,
    performance_score integer,
    alerts jsonb NOT NULL,
    timestamp timestamptz NOT NULL,
    sent boolean DEFAULT false,
    sent_to jsonb, -- Email addresses, Slack channels, etc.
    created_at timestamptz DEFAULT now()
);

-- System configuration for feature flags
CREATE TABLE IF NOT EXISTS system_config (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    reason text,
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_predictions_log_model_version ON model_predictions_log(model_version);
CREATE INDEX idx_predictions_log_timestamp ON model_predictions_log(timestamp DESC);
CREATE INDEX idx_predictions_log_prediction_id ON model_predictions_log(prediction_id);
CREATE INDEX idx_user_corrections_prediction_id ON user_corrections(prediction_id);
CREATE INDEX idx_user_corrections_timestamp ON user_corrections(timestamp DESC);
CREATE INDEX idx_performance_snapshots_model_version ON model_performance_snapshots(model_version);
CREATE INDEX idx_performance_snapshots_timestamp ON model_performance_snapshots(timestamp DESC);
CREATE INDEX idx_drift_notifications_severity ON drift_notifications(severity);
CREATE INDEX idx_drift_notifications_timestamp ON drift_notifications(timestamp DESC);

-- Enable RLS
ALTER TABLE model_predictions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance_baseline ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE drift_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for model_predictions_log
CREATE POLICY "Service role can manage predictions log"
    ON model_predictions_log
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read predictions log"
    ON model_predictions_log
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS policies for user_corrections
CREATE POLICY "Users can create corrections"
    ON user_corrections
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their corrections"
    ON user_corrections
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ));

-- RLS policies for model_performance_baseline
CREATE POLICY "Service role can manage baseline"
    ON model_performance_baseline
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read baseline"
    ON model_performance_baseline
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS policies for model_performance_snapshots
CREATE POLICY "Service role can manage snapshots"
    ON model_performance_snapshots
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read snapshots"
    ON model_performance_snapshots
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS policies for drift_notifications
CREATE POLICY "Service role can manage notifications"
    ON drift_notifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admin users can view notifications"
    ON drift_notifications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- RLS policies for system_config
CREATE POLICY "Service role can manage config"
    ON system_config
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read config"
    ON system_config
    FOR SELECT
    TO authenticated
    USING (true);

-- Insert default configuration
INSERT INTO system_config (key, value, reason)
VALUES
    ('use_internal_model', 'true'::jsonb, 'Initial configuration'),
    ('drift_detection_enabled', 'true'::jsonb, 'Enable drift monitoring'),
    ('drift_alert_threshold', '{"critical": 50, "high": 60, "medium": 70}'::jsonb, 'Performance score thresholds')
ON CONFLICT (key) DO NOTHING;

-- Add comments
COMMENT ON TABLE model_predictions_log IS 'Logs all model predictions for drift detection analysis';
COMMENT ON TABLE user_corrections IS 'Tracks user feedback and corrections to model predictions';
COMMENT ON TABLE model_performance_baseline IS 'Baseline metrics for comparing model drift';
COMMENT ON TABLE model_performance_snapshots IS 'Regular snapshots of model performance metrics';
COMMENT ON TABLE drift_notifications IS 'Alerts sent when model drift is detected';
COMMENT ON TABLE system_config IS 'System-wide configuration and feature flags';

COMMENT ON COLUMN model_predictions_log.gpt4_agreement IS 'Whether GPT-4 agreed with this prediction (null if not compared)';
COMMENT ON COLUMN model_performance_snapshots.performance_score IS 'Overall health score 0-100 (higher is better)';
COMMENT ON COLUMN drift_notifications.severity IS 'Alert severity: low, medium, high, critical';