-- Add teacher reasoning and human correction columns to vlm_training_buffer.
--
-- teacher_reasoning: GPT-4o's step-by-step diagnostic explanation extracted
--   from the JSON response. Used for chain-of-thought (CoT) distillation so
--   the student VLM learns the reasoning process, not just final answers.
--
-- human_corrected_response: Admin-supplied corrected Phase1BuildingAssessment
--   JSON that overrides the teacher label when GPT-4o was wrong. Takes
--   precedence over teacher_response in TrainingDataExporter.

ALTER TABLE vlm_training_buffer
  ADD COLUMN IF NOT EXISTS teacher_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS human_corrected_response JSONB;

-- Index to quickly find human-verified examples for priority training export
CREATE INDEX IF NOT EXISTS idx_buffer_human_verified
  ON vlm_training_buffer (human_verified, priority_score DESC)
  WHERE used_in_training = false;

COMMENT ON COLUMN vlm_training_buffer.teacher_reasoning IS
  'GPT-4o chain-of-thought reasoning extracted from assessment JSON. Included as <thinking> block in Qwen2.5-VL training JSONL for CoT distillation.';

COMMENT ON COLUMN vlm_training_buffer.human_corrected_response IS
  'Admin-corrected Phase1BuildingAssessment. When set, overrides teacher_response in training data export. Always paired with human_verified = true.';
