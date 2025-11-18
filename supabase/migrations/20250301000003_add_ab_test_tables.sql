-- Migration: Add A/B Testing Tables
-- Created: 2025-03-01
-- Description: Creates tables for feature extractor A/B testing and Titans effectiveness analysis

-- ============================================================================
-- FEATURE EXTRACTOR A/B TESTS TABLE
-- ============================================================================
-- Stores A/B test results comparing learned vs handcrafted feature extraction
CREATE TABLE IF NOT EXISTS feature_extractor_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL,
  
  -- Test variant
  variant VARCHAR(20) NOT NULL CHECK (variant IN ('learned', 'handcrafted')),
  
  -- Features extracted
  features_jsonb JSONB NOT NULL DEFAULT '[]',
  
  -- Performance metrics
  extraction_time_ms INTEGER NOT NULL,
  
  -- Assessment data (for accuracy calculation)
  assessment_data_jsonb JSONB,
  
  -- Accuracy metrics (updated after validation)
  accuracy_jsonb JSONB,
  overall_accuracy DOUBLE PRECISION,
  
  -- Validation tracking
  validated_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for feature_extractor_ab_tests
CREATE INDEX IF NOT EXISTS idx_ab_test_assessment ON feature_extractor_ab_tests(assessment_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_variant ON feature_extractor_ab_tests(variant);
CREATE INDEX IF NOT EXISTS idx_ab_test_validated ON feature_extractor_ab_tests(validated_at);
CREATE INDEX IF NOT EXISTS idx_ab_test_created ON feature_extractor_ab_tests(created_at);

-- ============================================================================
-- SELF MODIFICATION EVENTS TABLE
-- ============================================================================
-- Stores self-modification events from Titans
-- This table may already exist from continuum memory migration, but we ensure it's here
CREATE TABLE IF NOT EXISTS self_modification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(50) NOT NULL,
  
  -- Modification details
  modification_type VARCHAR(50) NOT NULL CHECK (
    modification_type IN (
      'frequency_adjustment',
      'chunk_size_adjustment',
      'learning_rate_adjustment',
      'architecture_change'
    )
  ),
  
  -- Before and after states
  before_state_jsonb JSONB NOT NULL,
  after_state_jsonb JSONB NOT NULL,
  
  -- Modification reason
  reason TEXT,
  
  -- Performance impact (positive = improvement, negative = degradation)
  performance_impact DOUBLE PRECISION,
  
  -- Metadata
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for self_modification_events
CREATE INDEX IF NOT EXISTS idx_modification_agent ON self_modification_events(agent_name);
CREATE INDEX IF NOT EXISTS idx_modification_type ON self_modification_events(modification_type);
CREATE INDEX IF NOT EXISTS idx_modification_timestamp ON self_modification_events(timestamp);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE feature_extractor_ab_tests IS 
  'Stores A/B test results comparing learned vs handcrafted feature extraction. Used to measure accuracy and performance improvements.';

COMMENT ON TABLE self_modification_events IS 
  'Stores self-modification events from Titans. Tracks how the model modifies itself and the impact of those modifications.';

COMMENT ON COLUMN feature_extractor_ab_tests.variant IS 
  'Test variant: "learned" uses MLP-based feature extraction, "handcrafted" uses rule-based extraction.';

COMMENT ON COLUMN feature_extractor_ab_tests.overall_accuracy IS 
  'Overall accuracy score (0-1) calculated from damage type, severity, urgency, confidence, and cost accuracy.';

COMMENT ON COLUMN self_modification_events.performance_impact IS 
  'Change in performance after modification. Positive values indicate improvement, negative indicate degradation.';

