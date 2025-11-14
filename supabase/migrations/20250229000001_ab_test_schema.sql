-- ============================================================================
-- A/B Testing Framework Schema for Safe AI Automation
-- Implements pre-registered A/B testing with statistical guarantees
-- ============================================================================

-- Core experiment tracking
CREATE TABLE IF NOT EXISTS ab_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  target_sample_size INTEGER NOT NULL DEFAULT 10000,
  non_inferiority_margin DECIMAL(5,4) NOT NULL DEFAULT 0.005, -- 0.5pp
  alpha_spending_type TEXT NOT NULL DEFAULT 'obrien_fleming',
  power DECIMAL(5,4) NOT NULL DEFAULT 0.80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Experiment arms (control = human-only, treatment = Safe-LUCB)
CREATE TABLE IF NOT EXISTS ab_arms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'control' or 'treatment'
  description TEXT,
  allocation_ratio DECIMAL(3,2) NOT NULL DEFAULT 0.50, -- 50/50 split
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(experiment_id, name)
);

-- User assignments (deterministic hashing)
CREATE TABLE IF NOT EXISTS ab_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  arm_id UUID NOT NULL REFERENCES ab_arms(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assignment_hash TEXT NOT NULL, -- Deterministic hash for reproducibility
  UNIQUE(experiment_id, user_id)
);

-- Assessment decisions (automate vs escalate)
CREATE TABLE IF NOT EXISTS ab_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES ab_assignments(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES building_assessments(id) ON DELETE CASCADE,
  arm_id UUID NOT NULL REFERENCES ab_arms(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('automate', 'escalate')),
  escalation_reason TEXT,
  
  -- AI assessment outputs
  fusion_mean DECIMAL(5,4),
  fusion_variance DECIMAL(8,6),
  cp_stratum TEXT,
  cp_quantile DECIMAL(5,4),
  cp_prediction_set JSONB,
  
  -- Safe-LUCB outputs
  safety_ucb DECIMAL(5,4),
  reward_ucb DECIMAL(5,4),
  safety_threshold DECIMAL(5,4),
  exploration BOOLEAN DEFAULT FALSE,
  
  -- Context features (d_eff = 12)
  context_features JSONB NOT NULL,
  
  -- Detector outputs
  detector_outputs JSONB,
  
  -- Timestamps
  decision_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Outcomes (SFN tracking)
CREATE TABLE IF NOT EXISTS ab_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES ab_decisions(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES building_assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Safety outcomes
  sfn BOOLEAN NOT NULL DEFAULT FALSE, -- Safety False Negative (missed critical hazard)
  sfn_severity TEXT CHECK (sfn_severity IN ('low', 'medium', 'high', 'critical')),
  sfn_description TEXT,
  
  -- Validation outcomes
  human_validated_at TIMESTAMPTZ,
  human_validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  human_agrees_with_ai BOOLEAN,
  human_corrected_damage_type TEXT,
  human_corrected_severity TEXT,
  
  -- Performance metrics
  decision_time_seconds DECIMAL(8,2),
  automation_rate DECIMAL(5,4), -- For treatment arm
  csat_score INTEGER CHECK (csat_score BETWEEN 1 AND 5),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequential analysis checkpoints (O'Brien-Fleming alpha spending)
CREATE TABLE IF NOT EXISTS ab_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  checkpoint_number INTEGER NOT NULL,
  target_sample_size INTEGER NOT NULL,
  alpha_spent DECIMAL(5,4) NOT NULL,
  z_critical DECIMAL(6,4) NOT NULL,
  reached_at TIMESTAMPTZ,
  decision TEXT CHECK (decision IN ('continue', 'stop_early_success', 'stop_early_futility', 'stop_safety')),
  decision_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(experiment_id, checkpoint_number)
);

-- Calibration data for conformal prediction (Mondrian strata)
CREATE TABLE IF NOT EXISTS ab_calibration_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stratum TEXT NOT NULL, -- e.g., 'residential_0-20_london'
  true_class TEXT NOT NULL,
  true_probability DECIMAL(5,4) NOT NULL,
  nonconformity_score DECIMAL(5,4) NOT NULL,
  importance_weight DECIMAL(5,4) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historical validations for seed safe set (SFN=0 over n≥1000)
CREATE TABLE IF NOT EXISTS ab_historical_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_hash TEXT NOT NULL, -- Hash of context features
  property_type TEXT,
  property_age_bin TEXT,
  region TEXT,
  sfn BOOLEAN NOT NULL DEFAULT FALSE,
  validated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log (all changes tracked)
CREATE TABLE IF NOT EXISTS ab_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES ab_experiments(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ab_decisions_experiment ON ab_decisions(experiment_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ab_decisions_assignment ON ab_decisions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ab_decisions_arm ON ab_decisions(arm_id, decision);
CREATE INDEX IF NOT EXISTS idx_ab_decisions_assessment ON ab_decisions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_ab_outcomes_sfn_arm ON ab_outcomes(sfn, decision_id) WHERE sfn = true;
CREATE INDEX IF NOT EXISTS idx_ab_outcomes_assessment ON ab_outcomes(assessment_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_user ON ab_assignments(user_id, experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_experiment ON ab_assignments(experiment_id, assigned_at);
CREATE INDEX IF NOT EXISTS idx_ab_calibration_stratum_time ON ab_calibration_data(stratum, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ab_historical_context ON ab_historical_validations(context_hash, validated_at);
CREATE INDEX IF NOT EXISTS idx_ab_historical_sfn ON ab_historical_validations(sfn, validated_at);

-- ============================================================================
-- Views for Analysis
-- ============================================================================

-- Experiment status summary
CREATE OR REPLACE VIEW ab_experiment_status AS
SELECT 
  e.id,
  e.name,
  e.status,
  e.start_date,
  e.end_date,
  COUNT(DISTINCT a.id) as total_assignments,
  COUNT(DISTINCT d.id) as total_decisions,
  COUNT(DISTINCT CASE WHEN d.decision = 'automate' THEN d.id END) as automated_count,
  COUNT(DISTINCT CASE WHEN d.decision = 'escalate' THEN d.id END) as escalated_count,
  COUNT(DISTINCT o.id) as total_outcomes,
  COUNT(DISTINCT CASE WHEN o.sfn = true THEN o.id END) as sfn_count,
  ROUND(
    COUNT(DISTINCT CASE WHEN o.sfn = true THEN o.id END)::DECIMAL / 
    NULLIF(COUNT(DISTINCT o.id), 0) * 100, 
    4
  ) as sfn_rate_percent
FROM ab_experiments e
LEFT JOIN ab_assignments a ON a.experiment_id = e.id
LEFT JOIN ab_decisions d ON d.assignment_id = a.id
LEFT JOIN ab_outcomes o ON o.decision_id = d.id
GROUP BY e.id, e.name, e.status, e.start_date, e.end_date;

-- Arm comparison (for non-inferiority testing)
CREATE OR REPLACE VIEW ab_arm_comparison AS
SELECT 
  e.id as experiment_id,
  arm.name as arm_name,
  COUNT(DISTINCT d.id) as decision_count,
  COUNT(DISTINCT CASE WHEN d.decision = 'automate' THEN d.id END) as automated_count,
  ROUND(
    COUNT(DISTINCT CASE WHEN d.decision = 'automate' THEN d.id END)::DECIMAL / 
    NULLIF(COUNT(DISTINCT d.id), 0) * 100,
    2
  ) as automation_rate_percent,
  COUNT(DISTINCT o.id) as outcome_count,
  COUNT(DISTINCT CASE WHEN o.sfn = true THEN o.id END) as sfn_count,
  ROUND(
    COUNT(DISTINCT CASE WHEN o.sfn = true THEN o.id END)::DECIMAL / 
    NULLIF(COUNT(DISTINCT o.id), 0) * 100,
    4
  ) as sfn_rate_percent,
  AVG(o.decision_time_seconds) as avg_decision_time,
  AVG(o.csat_score) as avg_csat_score
FROM ab_experiments e
JOIN ab_arms arm ON arm.experiment_id = e.id
LEFT JOIN ab_assignments a ON a.arm_id = arm.id
LEFT JOIN ab_decisions d ON d.assignment_id = a.id
LEFT JOIN ab_outcomes o ON o.decision_id = d.id
WHERE e.status = 'active'
GROUP BY e.id, arm.name, arm.id;

-- ============================================================================
-- Functions
-- ============================================================================

-- Wilson score confidence interval (upper bound)
CREATE OR REPLACE FUNCTION wilson_score_ci(
  successes INTEGER,
  trials INTEGER,
  confidence_level DECIMAL DEFAULT 0.95
) RETURNS DECIMAL AS $$
DECLARE
  z DECIMAL;
  p DECIMAL;
  denominator DECIMAL;
  center DECIMAL;
  margin DECIMAL;
  upper_bound DECIMAL;
BEGIN
  IF trials = 0 THEN
    RETURN 1.0;
  END IF;
  
  -- Z-score for confidence level
  z := CASE 
    WHEN confidence_level = 0.95 THEN 1.96
    WHEN confidence_level = 0.99 THEN 2.576
    ELSE 1.96
  END;
  
  p := successes::DECIMAL / trials;
  denominator := 1 + (z * z) / trials;
  center := (p + (z * z) / (2 * trials)) / denominator;
  margin := z * SQRT((p * (1 - p) / trials + (z * z) / (4 * trials * trials))) / denominator;
  
  upper_bound := LEAST(1.0, center + margin);
  
  RETURN upper_bound;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Audit log trigger function
CREATE OR REPLACE FUNCTION ab_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ab_audit_log (table_name, record_id, action, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO ab_audit_log (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO ab_audit_log (table_name, record_id, action, old_values, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers
CREATE TRIGGER ab_experiments_audit AFTER INSERT OR UPDATE OR DELETE ON ab_experiments
FOR EACH ROW EXECUTE FUNCTION ab_audit_trigger();

CREATE TRIGGER ab_decisions_audit AFTER INSERT OR UPDATE OR DELETE ON ab_decisions
FOR EACH ROW EXECUTE FUNCTION ab_audit_trigger();

CREATE TRIGGER ab_outcomes_audit AFTER INSERT OR UPDATE OR DELETE ON ab_outcomes
FOR EACH ROW EXECUTE FUNCTION ab_audit_trigger();

-- Updated_at trigger for ab_outcomes
CREATE OR REPLACE FUNCTION update_ab_outcomes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ab_outcomes_updated_at
  BEFORE UPDATE ON ab_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION update_ab_outcomes_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE ab_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_assignments ENABLE ROW LEVEL SECURITY;

-- Users see only their own decisions
CREATE POLICY "Users view own decisions"
ON ab_decisions FOR SELECT
USING (
  assessment_id IN (
    SELECT id FROM building_assessments WHERE user_id = auth.uid()
  )
);

-- Admins see everything
CREATE POLICY "Admins view all decisions"
ON ab_decisions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Users see only their own outcomes
CREATE POLICY "Users view own outcomes"
ON ab_outcomes FOR SELECT
USING (user_id = auth.uid());

-- Admins see all outcomes
CREATE POLICY "Admins view all outcomes"
ON ab_outcomes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Users see only their own assignments
CREATE POLICY "Users view own assignments"
ON ab_assignments FOR SELECT
USING (user_id = auth.uid());

-- Admins see all assignments
CREATE POLICY "Admins view all assignments"
ON ab_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

