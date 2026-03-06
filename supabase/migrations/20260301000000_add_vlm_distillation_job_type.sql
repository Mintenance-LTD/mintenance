-- Add vlm_distillation to the knowledge_distillation_jobs.job_type check constraint.
-- The original table definition only allowed: damage_classifier, segmentation_model, yolo_enhancement.
-- This migration also adds model_version and training_samples_count columns used by the VLM pipeline.

-- Step 1: Drop old check constraint
ALTER TABLE knowledge_distillation_jobs
  DROP CONSTRAINT IF EXISTS knowledge_distillation_jobs_job_type_check;

-- Step 2: Re-add with vlm_distillation included
ALTER TABLE knowledge_distillation_jobs
  ADD CONSTRAINT knowledge_distillation_jobs_job_type_check
    CHECK (job_type IN ('damage_classifier', 'segmentation_model', 'yolo_enhancement', 'vlm_distillation'));

-- Step 3: Add columns the VLM seeding script writes (idempotent)
ALTER TABLE knowledge_distillation_jobs
  ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS base_model_version TEXT,
  ADD COLUMN IF NOT EXISTS training_samples_count INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS triggered_by TEXT DEFAULT 'system';
