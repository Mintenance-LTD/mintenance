-- Teacher-Student VLM Distillation: Phase 3 - VLM distillation job type
-- Index for efficient VLM-specific job queries on knowledge_distillation_jobs.

CREATE INDEX IF NOT EXISTS idx_distillation_jobs_vlm
  ON knowledge_distillation_jobs (created_at DESC)
  WHERE job_type = 'vlm_distillation';
