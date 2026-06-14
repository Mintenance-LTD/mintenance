-- Phase 2 multi-finding shadow scoring: store the set-based comparison of the
-- teacher's findings[] vs the student's. The existing scalar metrics
-- (overall_agreement, safety_recall, …) remain the single primary-finding
-- comparison; these are additive and nullable so legacy rows are unaffected.
--
--  findings_comparison    full detail: matches, per-pair severity/condition, missed safety-critical
--  findings_precision     matched / studentCount  (student didn't invent defects)
--  findings_recall        matched / teacherCount   (student didn't miss defects)
--  findings_f1            harmonic mean
--  safety_finding_recall  of the teacher's safety-critical findings, fraction the student caught

ALTER TABLE public.vlm_shadow_comparisons
  ADD COLUMN IF NOT EXISTS findings_comparison jsonb,
  ADD COLUMN IF NOT EXISTS findings_precision double precision,
  ADD COLUMN IF NOT EXISTS findings_recall double precision,
  ADD COLUMN IF NOT EXISTS findings_f1 double precision,
  ADD COLUMN IF NOT EXISTS safety_finding_recall double precision;

COMMENT ON COLUMN public.vlm_shadow_comparisons.safety_finding_recall IS
  'Of the teacher''s safety-critical findings (dangerous / condition 3 / safety-critical taxonomy class), the fraction the student also found. The most important failure metric — a miss here is a safety-critical defect the student would have dropped.';
