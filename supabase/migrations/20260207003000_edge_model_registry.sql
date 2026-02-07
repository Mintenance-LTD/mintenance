-- Phase 4: Edge Deployment Preparation
-- Track cloud vs edge models separately with deployment metadata.

ALTER TABLE yolo_models ADD COLUMN IF NOT EXISTS deployment_target TEXT DEFAULT 'cloud';
ALTER TABLE yolo_models ADD COLUMN IF NOT EXISTS quantization_type TEXT DEFAULT 'fp32';
ALTER TABLE yolo_models ADD COLUMN IF NOT EXISTS latency_ms FLOAT;
ALTER TABLE yolo_models ADD COLUMN IF NOT EXISTS model_size_bytes BIGINT;
ALTER TABLE yolo_models ADD COLUMN IF NOT EXISTS student_of TEXT;

-- Index for finding the best edge model per domain
CREATE INDEX IF NOT EXISTS idx_yolo_models_edge_deploy
  ON yolo_models (domain_id, deployment_target, quantization_type)
  WHERE is_active = true;
