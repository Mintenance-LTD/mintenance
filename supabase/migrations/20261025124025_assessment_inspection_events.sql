-- Reported activity is separate from AI predictions and expert-approved labels.
CREATE TABLE public.assessment_inspection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.building_assessments(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  actor_role text NOT NULL CHECK (actor_role IN ('owner', 'admin')),
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  occurred_on date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('correction', 'repair', 'follow_up')),
  notes text NOT NULL CHECK (char_length(btrim(notes)) BETWEEN 10 AND 4000),
  outcome text,
  evidence_image_ids uuid[] NOT NULL DEFAULT '{}',
  source_fingerprint text NOT NULL CHECK (source_fingerprint ~ '^[a-f0-9]{64}$'),
  source_snapshot jsonb NOT NULL CHECK (jsonb_typeof(source_snapshot) = 'object'),
  protocol_version text NOT NULL DEFAULT 'reported-inspection-v1' CHECK (protocol_version = 'reported-inspection-v1'),
  UNIQUE (assessment_id, actor_id, request_id),
  CHECK (cardinality(evidence_image_ids) <= 40),
  CHECK (
    (kind = 'repair' AND outcome IS NULL) OR
    (kind = 'correction' AND outcome IS NOT NULL AND outcome IN ('visible_defect', 'no_visible_defect', 'insufficient_evidence') AND cardinality(evidence_image_ids) > 0) OR
    (kind = 'follow_up' AND outcome IS NOT NULL AND outcome IN ('resolved', 'improved', 'unchanged', 'worse', 'unknown') AND cardinality(evidence_image_ids) > 0)
  )
);
CREATE INDEX assessment_inspection_events_history ON public.assessment_inspection_events (assessment_id, created_at DESC, id DESC);
CREATE INDEX assessment_inspection_events_actor ON public.assessment_inspection_events (actor_id);
ALTER TABLE public.assessment_inspection_events ENABLE ROW LEVEL SECURITY;
-- Access is mediated by owner/admin API checks; never expose service credentials.
REVOKE ALL ON public.assessment_inspection_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.assessment_inspection_events TO service_role;

CREATE FUNCTION public.check_inspection_event_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM unnest(NEW.evidence_image_ids) AS selected(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.assessment_images image
      WHERE image.id = selected.id AND image.assessment_id = NEW.assessment_id
    )
  ) OR cardinality(NEW.evidence_image_ids) <> (
    SELECT count(DISTINCT id) FROM unnest(NEW.evidence_image_ids) AS selected(id)
  ) THEN
    RAISE EXCEPTION 'Evidence must contain unique photos from this assessment' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.check_inspection_event_evidence() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER inspection_event_evidence BEFORE INSERT ON public.assessment_inspection_events
FOR EACH ROW EXECUTE FUNCTION public.check_inspection_event_evidence();
COMMENT ON TABLE public.assessment_inspection_events IS 'Append-only owner/admin reports. Not expert verification, model truth or training consent.';
