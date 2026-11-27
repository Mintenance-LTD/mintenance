-- Staff can hand off completed work without changing the resident-facing report.
ALTER TABLE public.property_action_followups
  ADD COLUMN completion_revision integer,
  ADD COLUMN completion_note text CHECK (length(completion_note) <= 5000),
  ADD COLUMN completion_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN completion_at timestamptz;

CREATE FUNCTION public.submit_report_staff_completion(
  p_actor uuid, p_property uuid, p_source uuid, p_revision integer, p_note text
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  f public.property_action_followups%ROWTYPE;
  owner_key uuid;
  cleaned_note text := btrim(p_note);
BEGIN
  IF p_revision IS NULL OR p_revision < 0 OR cleaned_note IS NULL
     OR length(cleaned_note) NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'Invalid completion note' USING ERRCODE = '22023';
  END IF;

  SELECT owner_id INTO owner_key FROM public.properties
    WHERE id = p_property FOR SHARE;
  IF NOT FOUND OR p_actor IS NULL OR p_actor = owner_key THEN
    RAISE EXCEPTION 'Only the assigned teammate can submit for review' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.profiles
    WHERE id = p_actor AND deleted_at IS NULL FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Teammate unavailable' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.property_team_members
    WHERE property_id = p_property AND user_id = p_actor
      AND status = 'accepted' AND role IN ('manager', 'admin') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Teammate unavailable' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.anonymous_reports
    WHERE id = p_source AND property_id = p_property
      AND status = 'acknowledged' AND job_id IS NULL FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only open internal reports can be submitted' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO f FROM public.property_action_followups
    WHERE kind = 'report' AND source_id = p_source AND property_id = p_property
    FOR UPDATE;
  IF NOT FOUND OR f.assigned_to IS DISTINCT FROM p_actor THEN
    RAISE EXCEPTION 'Only the assigned teammate can submit for review' USING ERRCODE = '42501';
  END IF;

  -- If the first response was lost, the identical request is safe to retry.
  IF f.completion_revision = f.revision AND f.revision = p_revision + 1
     AND f.completion_by = p_actor AND f.completion_note = cleaned_note THEN
    RETURN;
  END IF;
  IF f.revision <> p_revision OR f.completion_revision = f.revision THEN
    RAISE EXCEPTION 'Follow-up changed. Refresh to review the latest state.' USING ERRCODE = 'PT409';
  END IF;

  UPDATE public.property_action_followups
    SET waiting_for = 'approval', revision = f.revision + 1,
        completion_revision = f.revision + 1, completion_note = cleaned_note,
        completion_by = p_actor, completion_at = now(), updated_at = now()
    WHERE kind = 'report' AND source_id = p_source AND property_id = p_property;

  INSERT INTO public.property_action_updates(kind, source_id, author_id, body)
    VALUES ('report', p_source, p_actor, 'Submitted for owner review' || E'\n' || cleaned_note);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_report_staff_completion(uuid, uuid, uuid, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_report_staff_completion(uuid, uuid, uuid, integer, text)
  TO service_role;
