-- Migration: Add Continuum Memory System Tables
-- Created: 2025-01-XX
-- Description: Creates tables for Nested Learning continuum memory system
-- Based on "Nested Learning: The Illusion of Deep Learning Architectures" paper

-- ============================================================================
-- CONTINUUM MEMORY STATES TABLE
-- ============================================================================
-- Stores MLP parameters for each memory level of each agent
-- Implements Equation 30-31: Multi-frequency MLP chains
CREATE TABLE IF NOT EXISTS continuum_memory_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(50) NOT NULL,
  memory_level INTEGER NOT NULL CHECK (memory_level >= 0),
  
  -- MLP parameters stored as JSONB
  -- Structure: { layers: [{ weights: number[][], biases: number[], ... }], metadata: {...} }
  parameters_jsonb JSONB NOT NULL DEFAULT '{}',
  
  -- Memory configuration
  chunk_size INTEGER NOT NULL CHECK (chunk_size > 0), -- C^(ℓ)
  frequency INTEGER NOT NULL CHECK (frequency > 0), -- Update frequency
  
  -- Update tracking
  last_update_step BIGINT DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  update_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one memory state per agent per level
  UNIQUE(agent_name, memory_level)
);

-- Indexes for continuum_memory_states
CREATE INDEX IF NOT EXISTS idx_continuum_memory_agent_level 
  ON continuum_memory_states(agent_name, memory_level);
CREATE INDEX IF NOT EXISTS idx_continuum_memory_last_updated 
  ON continuum_memory_states(last_updated);
CREATE INDEX IF NOT EXISTS idx_continuum_memory_update_step 
  ON continuum_memory_states(agent_name, last_update_step);

-- ============================================================================
-- MEMORY CONTEXT FLOWS TABLE
-- ============================================================================
-- Stores context flow data (keys and values) for memory updates
-- Represents the data flowing through memory levels before compression
CREATE TABLE IF NOT EXISTS memory_context_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_state_id UUID NOT NULL REFERENCES continuum_memory_states(id) ON DELETE CASCADE,
  
  -- Context flow data
  keys_jsonb JSONB NOT NULL, -- Key vector K ⊆ R^(dk)
  values_jsonb JSONB NOT NULL, -- Value vector V ⊆ R^(dv)
  
  -- Metadata
  flow_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata_jsonb JSONB DEFAULT '{}',
  
  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for memory_context_flows
CREATE INDEX IF NOT EXISTS idx_memory_context_flows_state_id 
  ON memory_context_flows(memory_state_id);
CREATE INDEX IF NOT EXISTS idx_memory_context_flows_processed 
  ON memory_context_flows(memory_state_id, processed, flow_timestamp);
CREATE INDEX IF NOT EXISTS idx_memory_context_flows_timestamp 
  ON memory_context_flows(flow_timestamp);

-- ============================================================================
-- MEMORY UPDATE HISTORY TABLE
-- ============================================================================
-- Tracks update frequency compliance and update performance
-- Used for monitoring and analytics
CREATE TABLE IF NOT EXISTS memory_update_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_state_id UUID NOT NULL REFERENCES continuum_memory_states(id) ON DELETE CASCADE,
  
  -- Update metrics
  update_count INTEGER NOT NULL,
  last_update_time TIMESTAMP WITH TIME ZONE NOT NULL,
  update_frequency INTEGER NOT NULL,
  step BIGINT NOT NULL,
  
  -- Performance metrics
  error_reduction DECIMAL(10, 6), -- Error reduction from this update
  context_flows_processed INTEGER DEFAULT 0,
  update_duration_ms INTEGER, -- Time taken for update
  
  -- Compliance tracking
  expected_update_step BIGINT, -- When update should have occurred
  actual_update_step BIGINT, -- When update actually occurred
  frequency_compliance DECIMAL(5, 2), -- % compliance (100 = perfect)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for memory_update_history
CREATE INDEX IF NOT EXISTS idx_memory_update_history_state_id 
  ON memory_update_history(memory_state_id);
CREATE INDEX IF NOT EXISTS idx_memory_update_history_step 
  ON memory_update_history(memory_state_id, step DESC);
CREATE INDEX IF NOT EXISTS idx_memory_update_history_compliance 
  ON memory_update_history(memory_state_id, frequency_compliance);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on continuum_memory_states
CREATE OR REPLACE FUNCTION update_continuum_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_continuum_memory_updated_at
  BEFORE UPDATE ON continuum_memory_states
  FOR EACH ROW
  EXECUTE FUNCTION update_continuum_memory_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE continuum_memory_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_context_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_update_history ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for backend operations)
CREATE POLICY "Service role full access on continuum_memory_states"
  ON continuum_memory_states
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on memory_context_flows"
  ON memory_context_flows
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on memory_update_history"
  ON memory_update_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read their own agent data (if needed)
-- This is optional and can be customized based on requirements
CREATE POLICY "Users can read memory states for their agents"
  ON continuum_memory_states
  FOR SELECT
  TO authenticated
  USING (
    -- Add logic here if users need to access memory states
    -- For now, only service role has access
    false
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get memory state by agent and level
CREATE OR REPLACE FUNCTION get_memory_state(
  p_agent_name VARCHAR(50),
  p_memory_level INTEGER
)
RETURNS TABLE (
  id UUID,
  agent_name VARCHAR(50),
  memory_level INTEGER,
  parameters_jsonb JSONB,
  chunk_size INTEGER,
  frequency INTEGER,
  last_update_step BIGINT,
  last_updated TIMESTAMP WITH TIME ZONE,
  update_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cms.id,
    cms.agent_name,
    cms.memory_level,
    cms.parameters_jsonb,
    cms.chunk_size,
    cms.frequency,
    cms.last_update_step,
    cms.last_updated,
    cms.update_count
  FROM continuum_memory_states cms
  WHERE cms.agent_name = p_agent_name
    AND cms.memory_level = p_memory_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unprocessed context flows for a memory state
CREATE OR REPLACE FUNCTION get_unprocessed_context_flows(
  p_memory_state_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  keys_jsonb JSONB,
  values_jsonb JSONB,
  flow_timestamp TIMESTAMP WITH TIME ZONE,
  metadata_jsonb JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mcf.id,
    mcf.keys_jsonb,
    mcf.values_jsonb,
    mcf.flow_timestamp,
    mcf.metadata_jsonb
  FROM memory_context_flows mcf
  WHERE mcf.memory_state_id = p_memory_state_id
    AND mcf.processed = FALSE
  ORDER BY mcf.flow_timestamp ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate update frequency compliance
CREATE OR REPLACE FUNCTION calculate_frequency_compliance(
  p_memory_state_id UUID,
  p_lookback_days INTEGER DEFAULT 7
)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
  v_expected_updates INTEGER;
  v_actual_updates INTEGER;
  v_compliance DECIMAL(5, 2);
BEGIN
  -- Get expected number of updates based on frequency
  SELECT 
    COUNT(*) FILTER (WHERE step % chunk_size = 0),
    COUNT(*)
  INTO v_expected_updates, v_actual_updates
  FROM memory_update_history muh
  JOIN continuum_memory_states cms ON muh.memory_state_id = cms.id
  WHERE muh.memory_state_id = p_memory_state_id
    AND muh.created_at >= NOW() - (p_lookback_days || ' days')::INTERVAL;
  
  IF v_expected_updates = 0 THEN
    RETURN 100.0; -- No updates expected, perfect compliance
  END IF;
  
  v_compliance := (v_actual_updates::DECIMAL / v_expected_updates::DECIMAL) * 100.0;
  RETURN LEAST(100.0, GREATEST(0.0, v_compliance));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE continuum_memory_states IS 
  'Stores MLP parameters for multi-frequency memory levels. Each agent can have multiple memory levels updating at different frequencies.';

COMMENT ON TABLE memory_context_flows IS 
  'Stores context flow data (keys and values) before compression into memory parameters. Used for incremental memory updates.';

COMMENT ON TABLE memory_update_history IS 
  'Tracks memory update history for monitoring update frequency compliance and performance metrics.';

COMMENT ON COLUMN continuum_memory_states.chunk_size IS 
  'Chunk size C^(ℓ) = max_t C_t^(ℓ) / f_t^(ℓ). Parameters update every C^(ℓ) steps.';

COMMENT ON COLUMN continuum_memory_states.frequency IS 
  'Update frequency: number of steps between updates for this memory level.';

COMMENT ON COLUMN memory_context_flows.keys_jsonb IS 
  'Key vector K ⊆ R^(dk) for associative memory mapping M: K → V.';

COMMENT ON COLUMN memory_context_flows.values_jsonb IS 
  'Value vector V ⊆ R^(dv) for associative memory mapping M: K → V.';

