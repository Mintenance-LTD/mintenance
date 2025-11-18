-- Migration: Add YOLO Models Table for Database Storage
-- Created: 2025-03-01
-- Description: Stores YOLO ONNX model files as BYTEA in database
--
-- WARNING: Storing large binary files (10MB+) in PostgreSQL is not recommended
-- for production. Consider using Supabase Storage instead.
-- This table is provided for cases where database storage is required.

-- ============================================================================
-- YOLO MODELS TABLE
-- ============================================================================
-- Stores ONNX model files as BYTEA
CREATE TABLE IF NOT EXISTS yolo_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Model identification
  model_name VARCHAR(100) NOT NULL UNIQUE,
  model_version VARCHAR(20) NOT NULL,
  
  -- Model data (BYTEA can store up to 1GB, but performance degrades with large files)
  model_data BYTEA NOT NULL,
  file_size BIGINT NOT NULL,
  
  -- Metadata
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 104857600) -- Max 100MB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_yolo_models_name_version 
ON yolo_models(model_name, model_version);

CREATE INDEX IF NOT EXISTS idx_yolo_models_updated 
ON yolo_models(updated_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE yolo_models IS 
  'Stores YOLO ONNX model files as BYTEA. WARNING: Not recommended for models >5MB. Use Supabase Storage for production.';

COMMENT ON COLUMN yolo_models.model_data IS 
  'ONNX model file stored as binary data. Large files (>10MB) will impact database performance.';

COMMENT ON COLUMN yolo_models.file_size IS 
  'Size of model file in bytes. Used for validation and monitoring.';

-- ============================================================================
-- RLS POLICIES (if needed)
-- ============================================================================
-- By default, only service role should access this table
-- Add RLS policies if you need user-level access

-- Example: Allow service role full access
-- CREATE POLICY "Service role can manage YOLO models"
-- ON yolo_models FOR ALL
-- TO service_role
-- USING (true)
-- WITH CHECK (true);

