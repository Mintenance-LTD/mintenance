-- Teacher-Student VLM Distillation: Phase 1 - Shadow Comparison Logs
-- Stores field-by-field comparison between GPT-4o (teacher) and student VLM outputs
-- for monitoring student quality and populating the experience buffer.

CREATE TABLE IF NOT EXISTS vlm_shadow_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id TEXT NOT NULL,
  teacher_model TEXT NOT NULL DEFAULT 'gpt-4o',
  student_model TEXT NOT NULL DEFAULT 'qwen2.5-vl-3b',

  -- Agreement scores
  damage_type_match BOOLEAN NOT NULL,
  severity_match BOOLEAN NOT NULL,
  urgency_match BOOLEAN NOT NULL,
  confidence_delta FLOAT NOT NULL,
  safety_recall FLOAT NOT NULL,
  safety_precision FLOAT NOT NULL,
  overall_agreement FLOAT NOT NULL,

  -- Confidence metadata
  student_confidence FLOAT,
  teacher_confidence FLOAT,
  student_parse_success BOOLEAN NOT NULL DEFAULT true,

  -- Full responses for replay / training export
  student_response JSONB,
  teacher_response JSONB,

  -- Performance
  latency_ms INTEGER,
  cost_usd FLOAT,

  -- Categorization
  damage_category TEXT,
  image_count INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shadow_created ON vlm_shadow_comparisons (created_at DESC);
CREATE INDEX idx_shadow_category ON vlm_shadow_comparisons (damage_category, created_at DESC);
CREATE INDEX idx_shadow_agreement ON vlm_shadow_comparisons (overall_agreement);

ALTER TABLE vlm_shadow_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on vlm_shadow_comparisons"
  ON vlm_shadow_comparisons FOR ALL
  USING (auth.role() = 'service_role');
