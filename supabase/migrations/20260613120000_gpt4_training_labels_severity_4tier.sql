-- gpt4_training_labels.severity CHECK accepted only the legacy progression
-- vocabulary {early, midway, full}, but KnowledgeDistillationService.storeGPT4Label
-- inserts damageAssessment.severity, which is the 4-tier damage scale
-- {early, developing, significant, dangerous}. Every teacher-label insert
-- since the 4-tier rollout silently threw a CHECK violation inside the
-- fire-and-forget capture (1 row since 2026-02-03, all real assessments lost
-- from the training corpus). Widen to the UNION of both vocabularies so the
-- one historical 'midway' row stays valid and new 4-tier rows insert.

ALTER TABLE public.gpt4_training_labels
  DROP CONSTRAINT IF EXISTS gpt4_training_labels_severity_check;

ALTER TABLE public.gpt4_training_labels
  ADD CONSTRAINT gpt4_training_labels_severity_check
  CHECK (
    severity IS NULL OR
    severity::text = ANY (ARRAY[
      -- canonical 4-tier damage scale (current code output)
      'early', 'developing', 'significant', 'dangerous',
      -- legacy progression scale (pre-existing rows)
      'midway', 'full'
    ])
  );

COMMENT ON COLUMN public.gpt4_training_labels.severity IS
  'Teacher (GPT-4o) damage severity. Canonical 4-tier scale: early|developing|significant|dangerous. Legacy progression values (midway|full) retained for historical rows.';
