-- Teacher-Student VLM Distillation: Phase 5 - Safety Violation Log
-- Tracks cases where the student VLM missed critical safety hazards.

CREATE TABLE IF NOT EXISTS vlm_safety_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id TEXT NOT NULL,
  category TEXT NOT NULL,
  fail_reason TEXT NOT NULL,
  student_assessment JSONB,
  teacher_assessment JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vlm_safety_violations_category
  ON vlm_safety_violations (category, created_at DESC);

ALTER TABLE vlm_safety_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on vlm_safety_violations"
  ON vlm_safety_violations FOR ALL
  USING (auth.role() = 'service_role');
