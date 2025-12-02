-- Migration: Add Job Status Transitions Tracking
-- Created: 2025-02-02
-- Description: Creates tables for tracking job status changes, predictions, and agent automation

-- ============================================================================
-- JOB STATUS TRANSITIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Transition details
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  transition_type VARCHAR(30) DEFAULT 'manual' CHECK (transition_type IN ('manual', 'automated', 'scheduled', 'triggered')),

  -- Trigger information
  triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  triggered_by_agent VARCHAR(50), -- Agent name if automated
  trigger_reason TEXT,

  -- Validation
  is_valid_transition BOOLEAN DEFAULT TRUE,
  validation_errors TEXT[],

  -- Timing
  scheduled_for TIMESTAMPTZ, -- For scheduled transitions
  executed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}', -- Additional context (e.g., bid details, completion photos)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for job status transitions
CREATE INDEX IF NOT EXISTS idx_job_status_transitions_job_id
  ON job_status_transitions(job_id);

CREATE INDEX IF NOT EXISTS idx_job_status_transitions_executed_at
  ON job_status_transitions(executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_status_transitions_type
  ON job_status_transitions(transition_type);

CREATE INDEX IF NOT EXISTS idx_job_status_transitions_agent
  ON job_status_transitions(triggered_by_agent)
  WHERE triggered_by_agent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_status_transitions_scheduled
  ON job_status_transitions(scheduled_for)
  WHERE scheduled_for IS NOT NULL AND executed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_status_transitions_from_to
  ON job_status_transitions(from_status, to_status);

-- ============================================================================
-- JOB STATUS PREDICTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_status_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  current_status TEXT NOT NULL,

  -- Prediction
  predicted_next_status TEXT NOT NULL,
  predicted_transition_date TIMESTAMPTZ,
  confidence_score DECIMAL(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Prediction factors
  prediction_factors JSONB DEFAULT '{}',
  model_version VARCHAR(50),
  model_type VARCHAR(50) DEFAULT 'ml', -- 'ml', 'rule-based', 'hybrid'

  -- Accuracy tracking
  prediction_outcome VARCHAR(20) CHECK (prediction_outcome IN ('correct', 'incorrect', 'pending')) DEFAULT 'pending',
  actual_next_status TEXT,
  actual_transition_date TIMESTAMPTZ,
  days_off INTEGER, -- How many days off was the prediction

  -- Timestamps
  predicted_at TIMESTAMPTZ DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for job status predictions
CREATE INDEX IF NOT EXISTS idx_job_status_predictions_job_id
  ON job_status_predictions(job_id);

CREATE INDEX IF NOT EXISTS idx_job_status_predictions_predicted_date
  ON job_status_predictions(predicted_transition_date)
  WHERE predicted_transition_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_status_predictions_outcome
  ON job_status_predictions(prediction_outcome);

CREATE INDEX IF NOT EXISTS idx_job_status_predictions_confidence
  ON job_status_predictions(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_job_status_predictions_current_status
  ON job_status_predictions(current_status);

-- ============================================================================
-- JOB AUTOMATION HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_automation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Automation details
  automation_type VARCHAR(50) NOT NULL, -- 'auto_complete', 'auto_cancel', 'auto_schedule', 'auto_notify'
  agent_name VARCHAR(50) NOT NULL,
  action_taken TEXT NOT NULL,

  -- Decision making
  confidence_score DECIMAL(5,4),
  reasoning TEXT,
  decision_factors JSONB DEFAULT '{}',

  -- Outcome
  was_successful BOOLEAN,
  user_feedback VARCHAR(20) CHECK (user_feedback IN ('accepted', 'rejected', 'modified', 'ignored')) OR user_feedback IS NULL,
  user_override BOOLEAN DEFAULT FALSE,
  override_reason TEXT,

  -- Learning
  learn_from_this BOOLEAN DEFAULT TRUE, -- Whether to use this for model training

  -- Timestamps
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for job automation history
CREATE INDEX IF NOT EXISTS idx_job_automation_history_job_id
  ON job_automation_history(job_id);

CREATE INDEX IF NOT EXISTS idx_job_automation_history_user_id
  ON job_automation_history(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_automation_history_automation_type
  ON job_automation_history(automation_type);

CREATE INDEX IF NOT EXISTS idx_job_automation_history_agent
  ON job_automation_history(agent_name);

CREATE INDEX IF NOT EXISTS idx_job_automation_history_successful
  ON job_automation_history(was_successful)
  WHERE was_successful IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_automation_history_feedback
  ON job_automation_history(user_feedback)
  WHERE user_feedback IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_automation_history_executed_at
  ON job_automation_history(executed_at DESC);

-- ============================================================================
-- JOB STATE MACHINE RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_state_machine_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(100) NOT NULL UNIQUE,

  -- Transition rule
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,

  -- Conditions
  conditions JSONB DEFAULT '[]', -- Array of condition objects
  required_role TEXT, -- 'homeowner', 'contractor', 'admin', NULL for any
  requires_approval BOOLEAN DEFAULT FALSE,

  -- Automation
  can_be_automated BOOLEAN DEFAULT FALSE,
  automation_conditions JSONB DEFAULT '[]',
  automation_agent VARCHAR(50),

  -- Side effects
  side_effects JSONB DEFAULT '[]', -- Actions to perform on transition (e.g., send notifications)

  -- Validation
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for state machine rules
CREATE INDEX IF NOT EXISTS idx_job_state_machine_rules_from_to
  ON job_state_machine_rules(from_status, to_status);

CREATE INDEX IF NOT EXISTS idx_job_state_machine_rules_active
  ON job_state_machine_rules(is_active)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_job_state_machine_rules_automated
  ON job_state_machine_rules(can_be_automated)
  WHERE can_be_automated = TRUE;

-- ============================================================================
-- INSERT DEFAULT STATE MACHINE RULES
-- ============================================================================

INSERT INTO job_state_machine_rules (
  rule_name,
  from_status,
  to_status,
  required_role,
  can_be_automated,
  automation_agent,
  side_effects,
  is_active
) VALUES
  (
    'posted_to_assigned',
    'posted',
    'assigned',
    'homeowner',
    FALSE,
    NULL,
    '["notify_contractor", "create_contract"]'::jsonb,
    TRUE
  ),
  (
    'assigned_to_in_progress',
    'assigned',
    'in_progress',
    'contractor',
    FALSE,
    NULL,
    '["notify_homeowner", "start_timer"]'::jsonb,
    TRUE
  ),
  (
    'in_progress_to_completed',
    'in_progress',
    'completed',
    'homeowner',
    TRUE,
    'job-status',
    '["notify_both_parties", "trigger_payment", "request_review"]'::jsonb,
    TRUE
  ),
  (
    'posted_to_cancelled',
    'posted',
    'cancelled',
    'homeowner',
    TRUE,
    'job-status',
    '["notify_interested_contractors", "refund_fees"]'::jsonb,
    TRUE
  ),
  (
    'assigned_to_cancelled',
    'assigned',
    'cancelled',
    'homeowner',
    FALSE,
    NULL,
    '["notify_contractor", "handle_cancellation_penalty"]'::jsonb,
    TRUE
  )
ON CONFLICT (rule_name) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE job_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_status_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_automation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_state_machine_rules ENABLE ROW LEVEL SECURITY;

-- Job status transitions policies
CREATE POLICY "Users can view transitions for their jobs"
  ON job_status_transitions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_status_transitions.job_id
      AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role can manage status transitions"
  ON job_status_transitions FOR ALL
  USING (auth.role() = 'service_role');

-- Job status predictions policies
CREATE POLICY "Users can view predictions for their jobs"
  ON job_status_predictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_status_predictions.job_id
      AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role can manage status predictions"
  ON job_status_predictions FOR ALL
  USING (auth.role() = 'service_role');

-- Job automation history policies
CREATE POLICY "Users can view automation history for their jobs"
  ON job_automation_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_automation_history.job_id
      AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can provide feedback on automation"
  ON job_automation_history FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage automation history"
  ON job_automation_history FOR ALL
  USING (auth.role() = 'service_role');

-- State machine rules (read-only for users, admin can manage)
CREATE POLICY "Everyone can view active state machine rules"
  ON job_state_machine_rules FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Service role can manage state machine rules"
  ON job_state_machine_rules FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to log job status transition
CREATE OR REPLACE FUNCTION log_job_status_transition(
  p_job_id UUID,
  p_from_status TEXT,
  p_to_status TEXT,
  p_triggered_by_user_id UUID DEFAULT NULL,
  p_triggered_by_agent VARCHAR(50) DEFAULT NULL,
  p_trigger_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transition_id UUID;
  v_is_valid BOOLEAN;
BEGIN
  -- Validate transition (check if rule exists)
  SELECT EXISTS (
    SELECT 1 FROM job_state_machine_rules
    WHERE from_status = p_from_status
    AND to_status = p_to_status
    AND is_active = TRUE
  ) INTO v_is_valid;

  -- Log transition
  INSERT INTO job_status_transitions (
    job_id,
    from_status,
    to_status,
    transition_type,
    triggered_by_user_id,
    triggered_by_agent,
    trigger_reason,
    is_valid_transition,
    metadata
  ) VALUES (
    p_job_id,
    p_from_status,
    p_to_status,
    CASE WHEN p_triggered_by_agent IS NOT NULL THEN 'automated' ELSE 'manual' END,
    p_triggered_by_user_id,
    p_triggered_by_agent,
    p_trigger_reason,
    v_is_valid,
    p_metadata
  )
  RETURNING id INTO v_transition_id;

  RETURN v_transition_id;
END;
$$;

-- Function to get job transition history
CREATE OR REPLACE FUNCTION get_job_transition_history(
  p_job_id UUID
)
RETURNS TABLE (
  id UUID,
  from_status TEXT,
  to_status TEXT,
  transition_type VARCHAR(30),
  triggered_by_user_id UUID,
  triggered_by_agent VARCHAR(50),
  trigger_reason TEXT,
  executed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jst.id,
    jst.from_status,
    jst.to_status,
    jst.transition_type,
    jst.triggered_by_user_id,
    jst.triggered_by_agent,
    jst.trigger_reason,
    jst.executed_at
  FROM job_status_transitions jst
  WHERE jst.job_id = p_job_id
  ORDER BY jst.executed_at DESC;
END;
$$;

-- Function to validate status transition
CREATE OR REPLACE FUNCTION validate_job_status_transition(
  p_from_status TEXT,
  p_to_status TEXT,
  p_user_role TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_is_valid BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM job_state_machine_rules
    WHERE from_status = p_from_status
    AND to_status = p_to_status
    AND is_active = TRUE
    AND (required_role IS NULL OR required_role = p_user_role OR p_user_role = 'admin')
  ) INTO v_is_valid;

  RETURN v_is_valid;
END;
$$;

-- Function to predict next job status
CREATE OR REPLACE FUNCTION predict_next_job_status(
  p_job_id UUID
)
RETURNS TABLE (
  predicted_status TEXT,
  confidence DECIMAL(5,4),
  predicted_date TIMESTAMPTZ,
  factors JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_current_status TEXT;
  v_job_age_days INTEGER;
  v_has_bids BOOLEAN;
  v_has_contractor BOOLEAN;
BEGIN
  -- Get current job details
  SELECT
    j.status,
    EXTRACT(DAY FROM NOW() - j.created_at)::INTEGER,
    EXISTS(SELECT 1 FROM bids WHERE job_id = j.id),
    j.contractor_id IS NOT NULL
  INTO
    v_current_status,
    v_job_age_days,
    v_has_bids,
    v_has_contractor
  FROM jobs j
  WHERE j.id = p_job_id;

  -- Simple rule-based prediction (in production, this would use ML)
  IF v_current_status = 'posted' THEN
    IF v_has_bids AND v_job_age_days < 7 THEN
      RETURN QUERY SELECT
        'assigned'::TEXT,
        0.75::DECIMAL(5,4),
        NOW() + INTERVAL '3 days',
        jsonb_build_object('reason', 'job_has_active_bids', 'age_days', v_job_age_days);
    ELSIF v_job_age_days >= 7 AND NOT v_has_bids THEN
      RETURN QUERY SELECT
        'cancelled'::TEXT,
        0.85::DECIMAL(5,4),
        NOW() + INTERVAL '1 day',
        jsonb_build_object('reason', 'no_bids_after_7_days', 'age_days', v_job_age_days);
    END IF;
  ELSIF v_current_status = 'assigned' THEN
    RETURN QUERY SELECT
      'in_progress'::TEXT,
      0.70::DECIMAL(5,4),
      NOW() + INTERVAL '2 days',
      jsonb_build_object('reason', 'assigned_jobs_usually_start_soon');
  ELSIF v_current_status = 'in_progress' THEN
    RETURN QUERY SELECT
      'completed'::TEXT,
      0.65::DECIMAL(5,4),
      NOW() + INTERVAL '7 days',
      jsonb_build_object('reason', 'average_job_completion_time');
  END IF;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to log status transitions automatically
CREATE OR REPLACE FUNCTION auto_log_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM log_job_status_transition(
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      NULL,
      'Automatic logging from jobs table update'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'auto_log_job_status_change'
  ) THEN
    CREATE TRIGGER auto_log_job_status_change
      AFTER UPDATE OF status ON jobs
      FOR EACH ROW
      EXECUTE FUNCTION auto_log_job_status_change();
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE job_status_transitions IS 'Complete audit trail of all job status changes';
COMMENT ON TABLE job_status_predictions IS 'ML predictions for next job status and timing';
COMMENT ON TABLE job_automation_history IS 'History of all automated actions taken by agents on jobs';
COMMENT ON TABLE job_state_machine_rules IS 'Rules defining valid job status transitions and automation conditions';

COMMENT ON COLUMN job_status_transitions.transition_type IS 'manual (user action), automated (agent action), scheduled (time-based), triggered (event-based)';
COMMENT ON COLUMN job_status_predictions.prediction_outcome IS 'Whether prediction was correct, incorrect, or still pending';
COMMENT ON COLUMN job_automation_history.learn_from_this IS 'Whether to include this automation in model training data';
COMMENT ON COLUMN job_state_machine_rules.side_effects IS 'Actions to perform when transition occurs (e.g., send notifications, update related records)';

COMMENT ON FUNCTION log_job_status_transition IS 'Logs a job status transition with validation and metadata';
COMMENT ON FUNCTION validate_job_status_transition IS 'Validates if a status transition is allowed based on state machine rules';
COMMENT ON FUNCTION predict_next_job_status IS 'Predicts the next status for a job based on current state and patterns';
