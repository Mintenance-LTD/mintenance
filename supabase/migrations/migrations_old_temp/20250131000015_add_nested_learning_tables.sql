-- Migration: Add Nested Learning Additional Tables
-- Created: 2025-01-XX
-- Description: Creates additional tables for nested learning features
-- Includes: nested optimizer states, memory performance metrics, self-modification history, online learning queue

-- ============================================================================
-- NESTED OPTIMIZER STATES TABLE
-- ============================================================================
-- Stores optimizer memory states (momentum, MLP parameters)
CREATE TABLE IF NOT EXISTS nested_optimizer_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type VARCHAR(50) NOT NULL,
  optimizer_type VARCHAR(50) NOT NULL CHECK (optimizer_type IN ('nested-adam', 'deep-momentum')),
  
  -- Optimizer configuration
  learning_rate DECIMAL(10, 8) NOT NULL,
  momentum_decay DECIMAL(10, 8),
  epsilon DECIMAL(10, 8),
  use_nesterov BOOLEAN DEFAULT FALSE,
  
  -- MLP configuration (for deep-momentum)
  mlp_hidden_sizes JSONB,
  mlp_parameters_jsonb JSONB, -- MLP weights/biases for momentum
  
  -- Momentum state
  momentum_state_jsonb JSONB, -- Current momentum values
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one optimizer state per model type
  UNIQUE(model_type, optimizer_type)
);

-- Indexes for nested_optimizer_states
CREATE INDEX IF NOT EXISTS idx_nested_optimizer_model_type 
  ON nested_optimizer_states(model_type);
CREATE INDEX IF NOT EXISTS idx_nested_optimizer_updated_at 
  ON nested_optimizer_states(updated_at);

-- ============================================================================
-- MEMORY PERFORMANCE METRICS TABLE
-- ============================================================================
-- Tracks memory level performance, update frequency compliance, compression effectiveness
CREATE TABLE IF NOT EXISTS memory_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_state_id UUID NOT NULL REFERENCES continuum_memory_states(id) ON DELETE CASCADE,
  
  -- Performance metrics
  update_frequency_compliance DECIMAL(5, 2) CHECK (update_frequency_compliance >= 0 AND update_frequency_compliance <= 100),
  compression_ratio DECIMAL(10, 4),
  query_latency_ms INTEGER,
  update_latency_ms INTEGER,
  error_reduction DECIMAL(10, 6),
  
  -- Memory utilization
  memory_usage_bytes BIGINT,
  context_flows_processed INTEGER DEFAULT 0,
  parameters_size_bytes BIGINT,
  
  -- Calculated metrics
  efficiency_score DECIMAL(5, 2), -- Overall efficiency score (0-100)
  
  -- Timestamp
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for memory_performance_metrics
CREATE INDEX IF NOT EXISTS idx_memory_performance_state_id 
  ON memory_performance_metrics(memory_state_id);
CREATE INDEX IF NOT EXISTS idx_memory_performance_calculated_at 
  ON memory_performance_metrics(memory_state_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_performance_efficiency 
  ON memory_performance_metrics(memory_state_id, efficiency_score DESC);

-- ============================================================================
-- SELF MODIFICATION HISTORY TABLE
-- ============================================================================
-- Logs self-modification events when agents adapt their update rules
CREATE TABLE IF NOT EXISTS self_modification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(50) NOT NULL,
  
  -- Modification details
  modification_type VARCHAR(50) NOT NULL CHECK (modification_type IN (
    'frequency_adjustment', 
    'chunk_size_adjustment', 
    'learning_rate_adjustment', 
    'architecture_change'
  )),
  
  -- Before/after state
  before_state_jsonb JSONB NOT NULL,
  after_state_jsonb JSONB NOT NULL,
  
  -- Reason and impact
  reason TEXT NOT NULL,
  performance_impact DECIMAL(10, 6), -- Expected or actual performance change
  
  -- Context
  trigger_accuracy DECIMAL(5, 2), -- Accuracy that triggered modification
  modification_count INTEGER DEFAULT 1, -- Total modifications for this agent
  
  -- Metadata
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata_jsonb JSONB DEFAULT '{}'
);

-- Indexes for self_modification_history
CREATE INDEX IF NOT EXISTS idx_self_modification_agent_name 
  ON self_modification_history(agent_name);
CREATE INDEX IF NOT EXISTS idx_self_modification_type 
  ON self_modification_history(agent_name, modification_type);
CREATE INDEX IF NOT EXISTS idx_self_modification_timestamp 
  ON self_modification_history(agent_name, recorded_at DESC);

-- ============================================================================
-- ONLINE LEARNING QUEUE TABLE
-- ============================================================================
-- Queues incremental updates for online learning
CREATE TABLE IF NOT EXISTS online_learning_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(50) NOT NULL,
  model_type VARCHAR(50) NOT NULL,
  
  -- Context flow data
  keys_jsonb JSONB NOT NULL,
  values_jsonb JSONB NOT NULL,
  
  -- Processing status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  priority INTEGER DEFAULT 0, -- Higher priority processed first
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Metadata
  metadata_jsonb JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Indexes for online_learning_queue
CREATE INDEX IF NOT EXISTS idx_online_learning_agent_status 
  ON online_learning_queue(agent_name, status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_online_learning_created_at 
  ON online_learning_queue(agent_name, created_at);
CREATE INDEX IF NOT EXISTS idx_online_learning_pending 
  ON online_learning_queue(agent_name, status) WHERE status = 'pending';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on nested_optimizer_states
CREATE OR REPLACE FUNCTION update_nested_optimizer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_nested_optimizer_updated_at
  BEFORE UPDATE ON nested_optimizer_states
  FOR EACH ROW
  EXECUTE FUNCTION update_nested_optimizer_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE nested_optimizer_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_modification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_learning_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role full access on nested_optimizer_states"
  ON nested_optimizer_states
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on memory_performance_metrics"
  ON memory_performance_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on self_modification_history"
  ON self_modification_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on online_learning_queue"
  ON online_learning_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get pending online learning items
CREATE OR REPLACE FUNCTION get_pending_online_learning(
  p_agent_name VARCHAR(50),
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  keys_jsonb JSONB,
  values_jsonb JSONB,
  metadata_jsonb JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    olq.id,
    olq.keys_jsonb,
    olq.values_jsonb,
    olq.metadata_jsonb,
    olq.created_at
  FROM online_learning_queue olq
  WHERE olq.agent_name = p_agent_name
    AND olq.status = 'pending'
  ORDER BY olq.priority DESC, olq.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate memory efficiency score
CREATE OR REPLACE FUNCTION calculate_memory_efficiency(
  p_memory_state_id UUID
)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
  v_compliance DECIMAL(5, 2);
  v_compression DECIMAL(10, 4);
  v_latency INTEGER;
  v_efficiency DECIMAL(5, 2);
BEGIN
  -- Get latest performance metrics
  SELECT 
    update_frequency_compliance,
    compression_ratio,
    query_latency_ms
  INTO v_compliance, v_compression, v_latency
  FROM memory_performance_metrics
  WHERE memory_state_id = p_memory_state_id
  ORDER BY calculated_at DESC
  LIMIT 1;
  
  IF v_compliance IS NULL THEN
    RETURN 50.0; -- Default efficiency
  END IF;
  
  -- Calculate efficiency: weighted combination of metrics
  -- Compliance: 40%, Compression: 30%, Latency: 30%
  v_efficiency := 
    (v_compliance * 0.4) +
    (LEAST(v_compression, 10.0) / 10.0 * 100 * 0.3) +
    (GREATEST(0, 100 - v_latency / 10) * 0.3);
  
  RETURN LEAST(100.0, GREATEST(0.0, v_efficiency));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE nested_optimizer_states IS 
  'Stores optimizer memory states for nested optimizers (momentum as associative memory).';

COMMENT ON TABLE memory_performance_metrics IS 
  'Tracks memory level performance metrics including update frequency compliance, compression effectiveness, and query latency.';

COMMENT ON TABLE self_modification_history IS 
  'Logs self-modification events when agents adapt their update rules based on performance.';

COMMENT ON TABLE online_learning_queue IS 
  'Queues incremental updates for online learning without full retraining.';

COMMENT ON COLUMN memory_performance_metrics.efficiency_score IS 
  'Overall efficiency score (0-100) calculated from compliance, compression, and latency metrics.';

COMMENT ON COLUMN self_modification_history.performance_impact IS 
  'Expected or actual performance change from the modification (positive = improvement).';

