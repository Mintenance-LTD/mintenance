-- Phase 2: Multi-Teacher Ensemble Distillation
-- Add teacher agreement and difficulty scoring to GPT-4 labels
-- for curriculum learning and active learning prioritization.

ALTER TABLE gpt4_training_labels ADD COLUMN IF NOT EXISTS teacher_agreement_score FLOAT;
ALTER TABLE gpt4_training_labels ADD COLUMN IF NOT EXISTS difficulty_score FLOAT;
ALTER TABLE gpt4_training_labels ADD COLUMN IF NOT EXISTS sam3_agreement BOOLEAN;

-- Index for curriculum learning queries (sort by agreement score)
CREATE INDEX IF NOT EXISTS idx_gpt4_labels_agreement
  ON gpt4_training_labels (teacher_agreement_score DESC)
  WHERE used_in_training = false AND teacher_agreement_score IS NOT NULL;

-- Index for active learning queries (unreviewed routing decisions)
CREATE INDEX IF NOT EXISTS idx_routing_decisions_unreviewed
  ON hybrid_routing_decisions (created_at DESC)
  WHERE reviewed = false;
