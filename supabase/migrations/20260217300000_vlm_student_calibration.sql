-- Teacher-Student VLM Distillation: Phase 4 - Student Calibration + Routing Log
-- Per-category accuracy tracking for confidence-based routing decisions.

CREATE TABLE IF NOT EXISTS vlm_student_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  correct_predictions INTEGER NOT NULL DEFAULT 0,
  accuracy FLOAT NOT NULL DEFAULT 0,
  safety_recall FLOAT NOT NULL DEFAULT 0,
  safety_total INTEGER NOT NULL DEFAULT 0,
  safety_correct INTEGER NOT NULL DEFAULT 0,
  ema_accuracy FLOAT NOT NULL DEFAULT 0,
  ema_safety_recall FLOAT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vlm_routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('student_only', 'teacher_only', 'shadow_compare')),
  reasoning TEXT,
  category TEXT,
  student_accuracy FLOAT,
  safety_recall FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vlm_routing_created ON vlm_routing_decisions (created_at DESC);

ALTER TABLE vlm_student_calibration ENABLE ROW LEVEL SECURITY;
ALTER TABLE vlm_routing_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on vlm_student_calibration"
  ON vlm_student_calibration FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on vlm_routing_decisions"
  ON vlm_routing_decisions FOR ALL
  USING (auth.role() = 'service_role');
