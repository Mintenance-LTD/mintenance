ALTER TABLE public.gpt4_training_labels
  DROP CONSTRAINT IF EXISTS gpt4_training_labels_severity_check;

ALTER TABLE public.gpt4_training_labels
  ADD CONSTRAINT gpt4_training_labels_severity_check
  CHECK (
    severity IS NULL OR
    severity::text = ANY (ARRAY[
      'early', 'developing', 'significant', 'dangerous',
      'midway', 'full'
    ])
  );

COMMENT ON COLUMN public.gpt4_training_labels.severity IS
  'Teacher (GPT-4o) damage severity. Canonical 4-tier scale: early|developing|significant|dangerous. Legacy progression values (midway|full) retained for historical rows.';;
