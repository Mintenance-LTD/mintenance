-- Migration: Add Self-Modifying Titans and Learned Feature Extractor Tables
-- Created: 2025-03-01
-- Description: Creates tables for Self-Modifying Titans and Learned Feature Extraction
-- Based on "Nested Learning: The Illusion of Deep Learning Architectures" paper
-- 
-- These tables enable:
-- 1. Self-Modifying Titans: Dynamic key/value/query projections that adapt based on context
-- 2. Learned Feature Extraction: MLP-based feature extractor that learns from validation feedback

-- ============================================================================
-- TITANS STATES TABLE
-- ============================================================================
-- Stores projection matrices (W_k, W_v, W_q, W_o) and context memory for Titans
-- Implements Equation 12-14: Linear attention with dynamic projections
CREATE TABLE IF NOT EXISTS titans_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(50) NOT NULL UNIQUE,
  
  -- Projection matrices stored as JSONB
  -- Structure: { W_k: number[][], W_v: number[][], W_q: number[][], W_o?: number[][] }
  projections_jsonb JSONB NOT NULL DEFAULT '{}',
  
  -- Context memory: recent (k, v) pairs
  -- Format: [[k_0, k_1, ..., k_n, v_0, v_1, ..., v_n], ...]
  context_memory_jsonb JSONB NOT NULL DEFAULT '[]',
  
  -- Update tracking
  update_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for titans_states
CREATE INDEX IF NOT EXISTS idx_titans_agent ON titans_states(agent_name);
CREATE INDEX IF NOT EXISTS idx_titans_last_updated ON titans_states(last_updated);
CREATE INDEX IF NOT EXISTS idx_titans_update_count ON titans_states(update_count);

-- ============================================================================
-- LEARNED FEATURE EXTRACTORS TABLE
-- ============================================================================
-- Stores MLP weights and biases for learned feature extraction
-- Implements associative memory optimization: min_M (M(x_t), u_t)² + λ||M - M_t||²
CREATE TABLE IF NOT EXISTS learned_feature_extractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(50) NOT NULL UNIQUE,
  
  -- MLP weights: [layer][neuron][input]
  weights_jsonb JSONB NOT NULL DEFAULT '{}',
  
  -- MLP biases: [layer][neuron]
  biases_jsonb JSONB NOT NULL DEFAULT '{}',
  
  -- Update tracking
  update_count INTEGER DEFAULT 0,
  total_error DOUBLE PRECISION DEFAULT 0, -- Cumulative error for monitoring
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for learned_feature_extractors
CREATE INDEX IF NOT EXISTS idx_feature_extractor_agent ON learned_feature_extractors(agent_name);
CREATE INDEX IF NOT EXISTS idx_feature_extractor_last_updated ON learned_feature_extractors(last_updated);
CREATE INDEX IF NOT EXISTS idx_feature_extractor_update_count ON learned_feature_extractors(update_count);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE titans_states IS 
  'Stores state for Self-Modifying Titans modules. Titans enable self-referential learning through dynamic key/value/query projections that adapt based on context and surprise signals.';

COMMENT ON TABLE learned_feature_extractors IS 
  'Stores MLP parameters for learned feature extraction. Replaces handcrafted features with learned mappings that adapt based on validation feedback (surprise signals).';

COMMENT ON COLUMN titans_states.projections_jsonb IS 
  'Projection matrices: W_k (keys), W_v (values), W_q (queries), W_o (output). These adapt through self-modification based on surprise signals.';

COMMENT ON COLUMN titans_states.context_memory_jsonb IS 
  'Recent context memory: stores (k, v) pairs for memory matrix M_t = M_{t-1} + v_t k_t^T';

COMMENT ON COLUMN learned_feature_extractors.weights_jsonb IS 
  'MLP weights: [layer][neuron][input]. Learned through associative memory optimization.';

COMMENT ON COLUMN learned_feature_extractors.biases_jsonb IS 
  'MLP biases: [layer][neuron]. Learned through associative memory optimization.';

COMMENT ON COLUMN learned_feature_extractors.total_error IS 
  'Cumulative mean squared error for monitoring learning progress.';

