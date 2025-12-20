-- Migration: Add Automation Preferences Table
-- Created: 2025-01-31
-- Description: Creates automation_preferences table for managing user automation settings

-- ============================================================================
-- AUTOMATION PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS automation_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Automation toggles
  auto_accept_bids BOOLEAN DEFAULT FALSE,
  auto_reschedule_weather BOOLEAN DEFAULT TRUE,
  auto_complete_jobs BOOLEAN DEFAULT FALSE,
  auto_apply_risk_preventions BOOLEAN DEFAULT TRUE,
  learning_enabled BOOLEAN DEFAULT TRUE, -- Allow agents to learn from this user's data
  
  -- Timestamps
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_automation_preferences_user_id ON automation_preferences(user_id);

-- ============================================================================
-- AGENT DECISIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agent_name VARCHAR(50) NOT NULL,
  decision_type VARCHAR(50) NOT NULL,
  action_taken VARCHAR(100),
  confidence DECIMAL(5,2) CHECK (confidence >= 0 AND confidence <= 100),
  reasoning TEXT,
  metadata JSONB DEFAULT '{}',
  user_feedback VARCHAR(20) CHECK (user_feedback IN ('accepted', 'rejected', 'modified')) OR user_feedback IS NULL,
  outcome_success BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for agent_decisions
CREATE INDEX IF NOT EXISTS idx_agent_decisions_job_id ON agent_decisions(job_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_user_id ON agent_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent_name ON agent_decisions(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_created_at ON agent_decisions(created_at DESC);

-- ============================================================================
-- RISK PREDICTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  risk_type VARCHAR(50) NOT NULL CHECK (risk_type IN ('no-show', 'dispute', 'delay', 'quality')),
  probability DECIMAL(5,2) CHECK (probability >= 0 AND probability <= 100),
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  preventive_action VARCHAR(100),
  applied BOOLEAN DEFAULT FALSE,
  outcome_occurred BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for risk_predictions
CREATE INDEX IF NOT EXISTS idx_risk_predictions_job_id ON risk_predictions(job_id);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_user_id ON risk_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_risk_type ON risk_predictions(risk_type);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_created_at ON risk_predictions(created_at DESC);

-- ============================================================================
-- USER BEHAVIOR PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_behavior_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('homeowner', 'contractor')),
  
  -- Learned preferences (JSONB for flexibility)
  preferences JSONB DEFAULT '{}',
  
  -- Pattern data
  average_response_time_hours DECIMAL(10,2),
  preferred_communication_channels TEXT[],
  typical_budget_range JSONB,
  preferred_job_categories TEXT[],
  preferred_scheduling_times JSONB,
  
  -- Performance metrics (for contractors)
  average_completion_time_days DECIMAL(10,2),
  no_show_rate DECIMAL(5,2),
  dispute_rate DECIMAL(5,2),
  average_rating DECIMAL(3,2),
  
  -- Acceptance patterns (for homeowners)
  average_bid_acceptance_rate DECIMAL(5,2),
  typical_bid_response_time_hours DECIMAL(10,2),
  cancellation_rate DECIMAL(5,2),
  
  -- Learning metadata
  profile_confidence DECIMAL(5,2) CHECK (profile_confidence >= 0 AND profile_confidence <= 100),
  data_points_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user_behavior_profiles
CREATE INDEX IF NOT EXISTS idx_user_behavior_profiles_user_type ON user_behavior_profiles(user_type);

-- ============================================================================
-- USER PAIR INTERACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_pair_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Interaction outcomes
  bid_accepted BOOLEAN,
  job_completed_successfully BOOLEAN,
  dispute_occurred BOOLEAN,
  communication_quality DECIMAL(3,2) CHECK (communication_quality >= 0 AND communication_quality <= 1),
  
  -- Learned patterns
  optimal_scheduling_time JSONB,
  typical_response_times JSONB,
  preferred_communication_style VARCHAR(50),
  
  -- Metrics
  total_interactions INTEGER DEFAULT 1,
  success_rate DECIMAL(5,2) CHECK (success_rate >= 0 AND success_rate <= 100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(homeowner_id, contractor_id, job_id)
);

-- Indexes for user_pair_interactions
CREATE INDEX IF NOT EXISTS idx_user_pair_interactions_homeowner ON user_pair_interactions(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_user_pair_interactions_contractor ON user_pair_interactions(contractor_id);
CREATE INDEX IF NOT EXISTS idx_user_pair_interactions_job ON user_pair_interactions(job_id);

-- ============================================================================
-- LEARNING MODEL VERSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS learning_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type VARCHAR(50) NOT NULL,
  version VARCHAR(20) NOT NULL,
  performance_metrics JSONB DEFAULT '{}',
  training_data_size INTEGER,
  deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(model_type, version)
);

-- Index for learning_model_versions
CREATE INDEX IF NOT EXISTS idx_learning_model_versions_model_type ON learning_model_versions(model_type);
CREATE INDEX IF NOT EXISTS idx_learning_model_versions_is_active ON learning_model_versions(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE automation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pair_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_model_versions ENABLE ROW LEVEL SECURITY;

-- Automation preferences policies
CREATE POLICY "Users can view their own automation preferences"
  ON automation_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation preferences"
  ON automation_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own automation preferences"
  ON automation_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Agent decisions policies (users can view their own decisions)
CREATE POLICY "Users can view their own agent decisions"
  ON agent_decisions FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = agent_decisions.job_id
    AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid())
  ));

-- Risk predictions policies
CREATE POLICY "Users can view risk predictions for their jobs"
  ON risk_predictions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = risk_predictions.job_id
    AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid())
  ));

-- User behavior profiles policies
CREATE POLICY "Users can view their own behavior profile"
  ON user_behavior_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- User pair interactions policies
CREATE POLICY "Users can view interactions they're part of"
  ON user_pair_interactions FOR SELECT
  USING (auth.uid() = homeowner_id OR auth.uid() = contractor_id);

-- Learning model versions (admin only - no RLS policy needed, handled by service role)

-- Comments
COMMENT ON TABLE automation_preferences IS 'User preferences for enabling/disabling automation features';
COMMENT ON TABLE agent_decisions IS 'Logs of all agent decisions for audit and learning';
COMMENT ON TABLE risk_predictions IS 'Predictions of potential risks for jobs';
COMMENT ON TABLE user_behavior_profiles IS 'Learned patterns and preferences for users';
COMMENT ON TABLE user_pair_interactions IS 'Interaction patterns between homeowner-contractor pairs';
COMMENT ON TABLE learning_model_versions IS 'Tracks different versions of ML models and their performance';

