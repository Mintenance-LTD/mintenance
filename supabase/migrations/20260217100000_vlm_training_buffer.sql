-- Teacher-Student VLM Distillation: Phase 2 - Experience Buffer
-- Prioritized training samples with surprise scoring for LoRA fine-tuning.

CREATE TABLE IF NOT EXISTS vlm_training_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id TEXT NOT NULL,
  shadow_comparison_id UUID REFERENCES vlm_shadow_comparisons(id),

  -- Training data (full prompt + response for Qwen2.5-VL fine-tuning)
  image_urls TEXT[] NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  teacher_response JSONB NOT NULL,
  student_response JSONB,

  -- Priority scoring
  surprise_score FLOAT NOT NULL DEFAULT 0,
  priority_score FLOAT NOT NULL DEFAULT 0,
  difficulty_score FLOAT,

  -- Categorization
  damage_category TEXT NOT NULL,
  severity TEXT,
  teacher_confidence FLOAT,

  -- Training lifecycle
  used_in_training BOOLEAN NOT NULL DEFAULT false,
  training_round INTEGER,
  marked_at TIMESTAMPTZ,

  -- Quality gate
  teacher_quality TEXT CHECK (teacher_quality IN ('high', 'medium', 'low', 'uncertain')),
  human_verified BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Priority-ordered fetch for training export (unused samples, highest priority first)
CREATE INDEX idx_buffer_priority
  ON vlm_training_buffer (priority_score DESC)
  WHERE used_in_training = false;

-- Category balancing queries
CREATE INDEX idx_buffer_category
  ON vlm_training_buffer (damage_category, priority_score DESC)
  WHERE used_in_training = false;

ALTER TABLE vlm_training_buffer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on vlm_training_buffer"
  ON vlm_training_buffer FOR ALL
  USING (auth.role() = 'service_role');
