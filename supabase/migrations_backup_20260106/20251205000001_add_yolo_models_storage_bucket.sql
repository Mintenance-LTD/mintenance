-- Migration: 20251205000001_add_yolo_models_storage_bucket.sql
-- Purpose: Create dedicated storage bucket for YOLO models and transition from BYTEA to object storage
-- Author: Mintenance AI Team
-- Date: December 2024

-- ============================================================================
-- STORAGE BUCKET SETUP
-- ============================================================================

-- Create dedicated bucket for YOLO models
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  avif_autodetection
)
VALUES (
  'yolo-models',
  'yolo-models',
  false, -- Private bucket for security (models accessed via signed URLs)
  524288000, -- 500MB limit (future-proof for larger models)
  ARRAY['application/octet-stream', 'application/onnx', 'application/x-onnx'],
  false
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  public = EXCLUDED.public;

-- ============================================================================
-- RLS POLICIES FOR YOLO MODELS BUCKET
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role full access to YOLO models" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read YOLO models" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload YOLO models" ON storage.objects;

-- Service role: Full access to manage models
CREATE POLICY "Service role full access to YOLO models"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'yolo-models')
WITH CHECK (bucket_id = 'yolo-models');

-- Authenticated users: Read access for model download
CREATE POLICY "Authenticated users can read YOLO models"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'yolo-models');

-- Admin users: Upload capability (for manual uploads if needed)
-- Note: Main uploads should be done via service role in backend
CREATE POLICY "Admin users can upload YOLO models"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'yolo-models'
  AND auth.uid() IN (
    SELECT id FROM auth.users
    WHERE raw_user_meta_data->>'role' = 'admin'
  )
);

-- ============================================================================
-- ADDITIONAL STORAGE BUCKETS FOR TRAINING PIPELINE
-- ============================================================================

-- Create bucket for training datasets (exports from corrections)
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  avif_autodetection
)
VALUES (
  'training-datasets',
  'training-datasets',
  false, -- Private (contains user data)
  1073741824, -- 1GB limit (large datasets)
  ARRAY['application/zip', 'application/x-tar', 'application/gzip'],
  false
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create bucket for model artifacts (metrics, logs, checkpoints)
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  avif_autodetection
)
VALUES (
  'model-artifacts',
  'model-artifacts',
  false, -- Private
  52428800, -- 50MB limit
  ARRAY['application/json', 'text/plain', 'application/octet-stream'],
  false
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- RLS POLICIES FOR TRAINING DATASETS BUCKET
-- ============================================================================

-- Service role full access
CREATE POLICY "Service role full access to training datasets"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'training-datasets')
WITH CHECK (bucket_id = 'training-datasets');

-- ============================================================================
-- RLS POLICIES FOR MODEL ARTIFACTS BUCKET
-- ============================================================================

-- Service role full access
CREATE POLICY "Service role full access to model artifacts"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'model-artifacts')
WITH CHECK (bucket_id = 'model-artifacts');

-- Authenticated users can read artifacts (for monitoring dashboards)
CREATE POLICY "Authenticated users can read model artifacts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'model-artifacts');

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Service role full access to YOLO models" ON storage.objects IS
  'Allows service role to upload, update, and delete YOLO models for inference and deployment';

COMMENT ON POLICY "Authenticated users can read YOLO models" ON storage.objects IS
  'Allows authenticated users to download YOLO models for local inference (if needed)';

COMMENT ON POLICY "Admin users can upload YOLO models" ON storage.objects IS
  'Allows admin users to manually upload models for testing or emergency deployment';

COMMENT ON POLICY "Service role full access to training datasets" ON storage.objects IS
  'Allows backend services to manage training data exports and imports';

COMMENT ON POLICY "Service role full access to model artifacts" ON storage.objects IS
  'Allows backend services to store training metrics, logs, and checkpoints';

-- ============================================================================
-- VERIFICATION QUERY (for testing after migration)
-- ============================================================================

DO $$
DECLARE
  bucket_count INTEGER;
BEGIN
  -- Verify all buckets were created
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets
  WHERE name IN ('yolo-models', 'training-datasets', 'model-artifacts');

  IF bucket_count != 3 THEN
    RAISE EXCEPTION 'Not all storage buckets were created successfully. Expected 3, got %', bucket_count;
  END IF;

  RAISE NOTICE 'Successfully created % storage buckets for YOLO model pipeline', bucket_count;
END $$;