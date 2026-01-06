-- Migration: Add YOLO Retraining Jobs Table
-- Created: 2025-03-01
-- Description: Tracks YOLO model retraining jobs for continuous learning

-- ============================================================================
-- YOLO RETRAINING JOBS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS yolo_retraining_jobs (
  id VARCHAR(100) PRIMARY KEY,
  
  -- Job status
  status VARCHAR(20) NOT NULL CHECK (
    status IN ('pending', 'running', 'completed', 'failed')
  ),
  
  -- Training data
  corrections_count INTEGER NOT NULL DEFAULT 0,
  
  -- Model information
  model_version VARCHAR(100),
  onnx_path TEXT,
  
  -- Metrics
  metrics_jsonb JSONB DEFAULT '{}',
  -- Format: {"mAP50": 0.85, "mAP50_95": 0.72, "precision": 0.88, "recall": 0.82}
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error information
  error_message TEXT,
  
  -- Metadata
  config_jsonb JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_yolo_retraining_jobs_status 
ON yolo_retraining_jobs(status);

CREATE INDEX IF NOT EXISTS idx_yolo_retraining_jobs_completed 
ON yolo_retraining_jobs(completed_at DESC) WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_yolo_retraining_jobs_version 
ON yolo_retraining_jobs(model_version);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE yolo_retraining_jobs IS 
  'Tracks YOLO model retraining jobs for continuous learning. Each job represents a training run that merges base dataset with user corrections.';

COMMENT ON COLUMN yolo_retraining_jobs.metrics_jsonb IS 
  'Model performance metrics after training: mAP50, mAP50-95, precision, recall.';

COMMENT ON COLUMN yolo_retraining_jobs.model_version IS 
  'Version identifier for the trained model (e.g., continuous-learning-v20250301_120000).';

