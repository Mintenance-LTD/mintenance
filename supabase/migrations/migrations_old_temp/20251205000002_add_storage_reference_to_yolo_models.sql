-- Migration: 20251205000002_add_storage_reference_to_yolo_models.sql
-- Purpose: Add storage reference columns to yolo_models table for migration from BYTEA to object storage
-- Author: Mintenance AI Team
-- Date: December 2024

-- ============================================================================
-- ADD STORAGE REFERENCE COLUMNS
-- ============================================================================

-- Add columns for storage-based model management (non-breaking changes)
ALTER TABLE yolo_models
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'yolo-models',
  ADD COLUMN IF NOT EXISTS storage_url TEXT,
  ADD COLUMN IF NOT EXISTS storage_migration_status TEXT
    CHECK (storage_migration_status IN ('pending', 'in_progress', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS storage_migrated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checksum TEXT, -- SHA256 for integrity verification
  ADD COLUMN IF NOT EXISTS model_type VARCHAR(20) DEFAULT 'onnx'
    CHECK (model_type IN ('onnx', 'tflite', 'pytorch', 'tensorflow', 'coreml')),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'deployed'
    CHECK (status IN ('pending', 'deployed', 'deprecated', 'failed')),
  ADD COLUMN IF NOT EXISTS performance_metrics JSONB,
  ADD COLUMN IF NOT EXISTS training_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS training_samples_count INTEGER,
  ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ;

-- Make model_data nullable to support storage-only models
ALTER TABLE yolo_models
  ALTER COLUMN model_data DROP NOT NULL;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for tracking migration status
CREATE INDEX IF NOT EXISTS idx_yolo_models_migration_status
  ON yolo_models(storage_migration_status)
  WHERE storage_migration_status IS NOT NULL;

-- Index for finding active models quickly
CREATE INDEX IF NOT EXISTS idx_yolo_models_active
  ON yolo_models(model_name, is_active)
  WHERE is_active = TRUE;

-- Index for storage path lookups
CREATE INDEX IF NOT EXISTS idx_yolo_models_storage_path
  ON yolo_models(storage_path)
  WHERE storage_path IS NOT NULL;

-- ============================================================================
-- UPDATE TRIGGER FOR updated_at
-- ============================================================================

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_yolo_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_yolo_models_updated_at_trigger ON yolo_models;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_yolo_models_updated_at_trigger
  BEFORE UPDATE ON yolo_models
  FOR EACH ROW
  EXECUTE FUNCTION update_yolo_models_updated_at();

-- ============================================================================
-- STORED PROCEDURES FOR ATOMIC OPERATIONS
-- ============================================================================

-- Function to atomically activate a model version
CREATE OR REPLACE FUNCTION activate_yolo_model(
  p_model_name TEXT,
  p_version TEXT,
  p_storage_path TEXT,
  p_storage_url TEXT,
  p_file_size BIGINT,
  p_checksum TEXT,
  p_metrics JSONB DEFAULT NULL,
  p_training_samples INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_model_id UUID;
BEGIN
  -- Start transaction
  -- Deactivate all previous versions of this model
  UPDATE yolo_models
  SET
    is_active = FALSE,
    status = 'deprecated',
    deprecated_at = NOW()
  WHERE
    model_name = p_model_name
    AND is_active = TRUE;

  -- Insert new active version
  INSERT INTO yolo_models (
    model_name,
    model_version,
    storage_path,
    storage_url,
    storage_bucket,
    file_size,
    checksum,
    performance_metrics,
    training_samples_count,
    is_active,
    status,
    model_type,
    deployed_at,
    storage_migration_status,
    storage_migrated_at,
    model_data -- NULL for storage-based models
  ) VALUES (
    p_model_name,
    p_version,
    p_storage_path,
    p_storage_url,
    'yolo-models',
    p_file_size,
    p_checksum,
    p_metrics,
    p_training_samples,
    TRUE,
    'deployed',
    'onnx',
    NOW(),
    'completed',
    NOW(),
    NULL
  )
  RETURNING id INTO v_model_id;

  RETURN v_model_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get the active model for a given name
CREATE OR REPLACE FUNCTION get_active_yolo_model(p_model_name TEXT)
RETURNS TABLE (
  id UUID,
  model_name VARCHAR(100),
  model_version VARCHAR(20),
  storage_path TEXT,
  storage_url TEXT,
  checksum TEXT,
  file_size BIGINT,
  performance_metrics JSONB,
  deployed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ym.id,
    ym.model_name,
    ym.model_version,
    ym.storage_path,
    ym.storage_url,
    ym.checksum,
    ym.file_size,
    ym.performance_metrics,
    ym.deployed_at
  FROM yolo_models ym
  WHERE
    ym.model_name = p_model_name
    AND ym.is_active = TRUE
    AND ym.status = 'deployed'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION TRACKING TABLE
-- ============================================================================

-- Create table to track model migration history
CREATE TABLE IF NOT EXISTS yolo_model_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES yolo_models(id) ON DELETE CASCADE,
  migration_type VARCHAR(50) NOT NULL, -- 'bytea_to_storage', 'storage_to_storage'
  source_location TEXT,
  destination_location TEXT,
  file_size BIGINT,
  checksum_before TEXT,
  checksum_after TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tracking migration status
CREATE INDEX idx_yolo_model_migrations_status
  ON yolo_model_migrations(status, created_at DESC);

-- ============================================================================
-- COLUMN DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN yolo_models.storage_path IS
  'Path to model file in Supabase Storage bucket (e.g., models/yolov11/v1.0/model.onnx)';

COMMENT ON COLUMN yolo_models.storage_bucket IS
  'Storage bucket name where model is stored (default: yolo-models)';

COMMENT ON COLUMN yolo_models.storage_url IS
  'Public or signed URL for accessing the model from storage';

COMMENT ON COLUMN yolo_models.storage_migration_status IS
  'Track migration status from BYTEA to Storage (pending/in_progress/completed/failed)';

COMMENT ON COLUMN yolo_models.checksum IS
  'SHA256 hash of model file for integrity verification';

COMMENT ON COLUMN yolo_models.model_type IS
  'Type of model format (onnx, tflite, pytorch, tensorflow, coreml)';

COMMENT ON COLUMN yolo_models.is_active IS
  'Indicates if this is the currently active model version for inference';

COMMENT ON COLUMN yolo_models.status IS
  'Deployment status of the model (pending, deployed, deprecated, failed)';

COMMENT ON COLUMN yolo_models.performance_metrics IS
  'JSON object containing model performance metrics (mAP, precision, recall, F1, etc.)';

COMMENT ON COLUMN yolo_models.training_samples_count IS
  'Number of training samples used to train this model version';

-- ============================================================================
-- DATA MIGRATION FOR EXISTING MODELS
-- ============================================================================

-- Mark existing models as needing migration
UPDATE yolo_models
SET
  storage_migration_status = 'pending',
  is_active = TRUE, -- Assume current models are active
  status = 'deployed'
WHERE
  model_data IS NOT NULL
  AND storage_migration_status IS NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_column_count INTEGER;
  v_pending_migrations INTEGER;
BEGIN
  -- Count new columns
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE
    table_schema = 'public'
    AND table_name = 'yolo_models'
    AND column_name IN (
      'storage_path', 'storage_bucket', 'storage_url',
      'storage_migration_status', 'checksum', 'model_type',
      'is_active', 'status', 'performance_metrics'
    );

  -- Count models needing migration
  SELECT COUNT(*) INTO v_pending_migrations
  FROM yolo_models
  WHERE storage_migration_status = 'pending';

  RAISE NOTICE 'Successfully added % storage-related columns to yolo_models table', v_column_count;
  RAISE NOTICE 'Found % models pending migration to storage', v_pending_migrations;
END $$;