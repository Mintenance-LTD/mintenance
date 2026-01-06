-- Model Retraining Orchestration Tables
-- Handles automated retraining, deployment strategies, and model lineage

-- Model retraining jobs table
CREATE TABLE IF NOT EXISTS model_retraining_jobs (
    id text PRIMARY KEY,
    trigger text NOT NULL CHECK (trigger IN (
        'drift_threshold_exceeded',
        'accuracy_degradation',
        'correction_threshold_reached',
        'scheduled_retrain',
        'manual_trigger'
    )),
    trigger_metadata jsonb NOT NULL,
    model_version text NOT NULL,
    status text NOT NULL CHECK (status IN (
        'pending',
        'data_preparation',
        'training',
        'validation',
        'testing',
        'deployment_ready',
        'deployed',
        'failed',
        'rolled_back'
    )),
    started_at timestamptz NOT NULL,
    completed_at timestamptz,
    error_message text,
    metadata jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Model lineage tracking
CREATE TABLE IF NOT EXISTS model_lineage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version text NOT NULL UNIQUE,
    parent_version text,
    training_job_id text REFERENCES model_retraining_jobs(id),
    created_at timestamptz NOT NULL,
    deployed_at timestamptz,
    retired_at timestamptz,
    deployment_strategy text CHECK (deployment_strategy IN (
        'immediate',
        'canary',
        'blue_green',
        'shadow'
    )),
    performance_baseline jsonb,
    hyperparameters jsonb,
    feature_importance jsonb,
    training_dataset_info jsonb,
    validation_metrics jsonb,
    test_metrics jsonb,
    production_metrics jsonb,
    rollback_reason text,
    notes text
);

-- Model deployment history
CREATE TABLE IF NOT EXISTS model_deployments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version text NOT NULL,
    deployment_type text NOT NULL CHECK (deployment_type IN (
        'primary',
        'canary',
        'shadow',
        'blue',
        'green'
    )),
    rollout_percentage integer DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    started_at timestamptz NOT NULL,
    completed_at timestamptz,
    status text NOT NULL CHECK (status IN (
        'in_progress',
        'completed',
        'failed',
        'rolled_back'
    )),
    metrics jsonb,
    created_at timestamptz DEFAULT now()
);

-- Model performance comparison
CREATE TABLE IF NOT EXISTS model_comparisons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_version text NOT NULL,
    candidate_version text NOT NULL,
    comparison_timestamp timestamptz NOT NULL,
    metrics_comparison jsonb NOT NULL,
    winner text CHECK (winner IN ('primary', 'candidate', 'tie')),
    decision text CHECK (decision IN ('deploy', 'rollback', 'continue_testing')),
    decision_reason text,
    created_at timestamptz DEFAULT now()
);

-- Alert escalation tracking
CREATE TABLE IF NOT EXISTS alert_escalations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id uuid,
    escalation_level integer NOT NULL DEFAULT 1,
    escalated_at timestamptz NOT NULL,
    escalated_to jsonb, -- List of recipients
    response_received boolean DEFAULT false,
    responded_at timestamptz,
    response_action text,
    created_at timestamptz DEFAULT now()
);

-- Incident management
CREATE TABLE IF NOT EXISTS incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_type text NOT NULL,
    severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status text NOT NULL CHECK (status IN ('open', 'investigating', 'mitigated', 'resolved', 'closed')),
    affected_model_version text,
    started_at timestamptz NOT NULL,
    detected_at timestamptz NOT NULL,
    mitigated_at timestamptz,
    resolved_at timestamptz,
    closed_at timestamptz,
    impact_description text,
    root_cause text,
    remediation_steps jsonb,
    lessons_learned text,
    related_alerts jsonb,
    assigned_to text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Audit trail for automated actions
CREATE TABLE IF NOT EXISTS automation_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type text NOT NULL,
    action_details jsonb NOT NULL,
    triggered_by text NOT NULL, -- 'system', 'manual', or user ID
    model_version text,
    success boolean NOT NULL,
    error_message text,
    duration_ms integer,
    timestamp timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_retraining_jobs_status ON model_retraining_jobs(status);
CREATE INDEX idx_retraining_jobs_model_version ON model_retraining_jobs(model_version);
CREATE INDEX idx_retraining_jobs_started_at ON model_retraining_jobs(started_at DESC);

CREATE INDEX idx_model_lineage_version ON model_lineage(model_version);
CREATE INDEX idx_model_lineage_parent ON model_lineage(parent_version);
CREATE INDEX idx_model_lineage_deployed_at ON model_lineage(deployed_at DESC);

CREATE INDEX idx_model_deployments_version ON model_deployments(model_version);
CREATE INDEX idx_model_deployments_type ON model_deployments(deployment_type);
CREATE INDEX idx_model_deployments_started_at ON model_deployments(started_at DESC);

CREATE INDEX idx_model_comparisons_versions ON model_comparisons(primary_version, candidate_version);
CREATE INDEX idx_model_comparisons_timestamp ON model_comparisons(comparison_timestamp DESC);

CREATE INDEX idx_alert_escalations_alert_id ON alert_escalations(alert_id);
CREATE INDEX idx_alert_escalations_level ON alert_escalations(escalation_level);

CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_started_at ON incidents(started_at DESC);

CREATE INDEX idx_automation_audit_action_type ON automation_audit_log(action_type);
CREATE INDEX idx_automation_audit_timestamp ON automation_audit_log(timestamp DESC);

-- Enable RLS
ALTER TABLE model_retraining_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for model_retraining_jobs
CREATE POLICY "Service role can manage retraining jobs"
    ON model_retraining_jobs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read retraining jobs"
    ON model_retraining_jobs
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS policies for model_lineage
CREATE POLICY "Service role can manage model lineage"
    ON model_lineage
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read model lineage"
    ON model_lineage
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS policies for model_deployments
CREATE POLICY "Service role can manage deployments"
    ON model_deployments
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read deployments"
    ON model_deployments
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS policies for model_comparisons
CREATE POLICY "Service role can manage comparisons"
    ON model_comparisons
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read comparisons"
    ON model_comparisons
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS policies for alert_escalations
CREATE POLICY "Service role can manage escalations"
    ON alert_escalations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admin users can view escalations"
    ON alert_escalations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- RLS policies for incidents
CREATE POLICY "Service role can manage incidents"
    ON incidents
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can read incidents"
    ON incidents
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin users can update incidents"
    ON incidents
    FOR UPDATE
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

-- RLS policies for automation_audit_log
CREATE POLICY "Service role can manage audit log"
    ON automation_audit_log
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admin users can read audit log"
    ON automation_audit_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_model_retraining_jobs_updated_at
    BEFORE UPDATE ON model_retraining_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default system configuration for retraining
INSERT INTO system_config (key, value, reason)
VALUES
    ('auto_retrain_enabled', 'true'::jsonb, 'Enable automatic model retraining'),
    ('min_corrections_for_retrain', '50'::jsonb, 'Minimum corrections before retraining'),
    ('max_retrain_interval_days', '30'::jsonb, 'Maximum days between retraining'),
    ('min_retrain_interval_hours', '24'::jsonb, 'Minimum hours between retraining'),
    ('deployment_strategy', '"canary"'::jsonb, 'Default deployment strategy'),
    ('canary_initial_percentage', '10'::jsonb, 'Initial canary rollout percentage'),
    ('shadow_duration_hours', '24'::jsonb, 'Shadow deployment duration'),
    ('alert_channels', '["slack", "email"]'::jsonb, 'Active alert channels')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    reason = EXCLUDED.reason;

-- Add comments
COMMENT ON TABLE model_retraining_jobs IS 'Tracks all model retraining jobs and their status';
COMMENT ON TABLE model_lineage IS 'Complete lineage tracking for all model versions';
COMMENT ON TABLE model_deployments IS 'History of all model deployments and rollouts';
COMMENT ON TABLE model_comparisons IS 'Comparison results between model versions';
COMMENT ON TABLE alert_escalations IS 'Tracks alert escalation history';
COMMENT ON TABLE incidents IS 'Incident management and tracking';
COMMENT ON TABLE automation_audit_log IS 'Audit trail for all automated actions';

COMMENT ON COLUMN model_lineage.parent_version IS 'The model version this was trained from';
COMMENT ON COLUMN model_deployments.rollout_percentage IS 'Percentage of traffic routed to this model';
COMMENT ON COLUMN model_comparisons.winner IS 'Which model performed better in comparison';
COMMENT ON COLUMN incidents.impact_description IS 'Description of the incident impact on users/system';