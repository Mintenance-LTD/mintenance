ALTER TABLE public.vlm_shadow_comparisons
  ADD COLUMN IF NOT EXISTS findings_comparison jsonb,
  ADD COLUMN IF NOT EXISTS findings_precision double precision,
  ADD COLUMN IF NOT EXISTS findings_recall double precision,
  ADD COLUMN IF NOT EXISTS findings_f1 double precision,
  ADD COLUMN IF NOT EXISTS safety_finding_recall double precision;

COMMENT ON COLUMN public.vlm_shadow_comparisons.safety_finding_recall IS
  'Of the teacher''s safety-critical findings (dangerous / condition 3 / safety-critical taxonomy class), the fraction the student also found. The most important failure metric — a miss here is a safety-critical defect the student would have dropped.';;
