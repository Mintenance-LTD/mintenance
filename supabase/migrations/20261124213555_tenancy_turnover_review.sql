BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.property_inspection_reports
  ADD COLUMN outcome text CHECK (outcome IN ('no_issues_found', 'evidence_free'));

CREATE INDEX property_inspection_checkout_folder_idx
  ON public.property_inspection_reports (property_id, folder_id)
  WHERE kind = 'check_out';

CREATE FUNCTION public.read_property_tenancy_checkout_folders(p_property uuid, p_folders uuid[])
RETURNS TABLE (folder_id uuid)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT DISTINCT report.folder_id
  FROM public.property_inspection_reports report
  WHERE report.property_id = p_property
    AND report.folder_id = ANY(p_folders)
    AND report.kind = 'check_out';
$$;

-- Hold the property-level lock across the overlap check and the folder write.
-- The confirmation token is tied to the proposed dates and the matching records.
CREATE FUNCTION public.save_property_tenancy_folder_with_overlap(
  p_actor uuid, p_property uuid, p_folder uuid, p_revision integer,
  p_label text, p_starts date, p_ends date, p_confirm_dates boolean, p_overlap_token text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_previous public.property_tenancy_folders%ROWTYPE;
  v_review jsonb;
  v_token text;
  v_id uuid;
BEGIN
  PERFORM public.require_property_inspection_editor(p_actor, p_property);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-tenancy:' || p_property::text, 0));

  IF p_folder IS NOT NULL THEN
    SELECT * INTO v_previous FROM public.property_tenancy_folders
    WHERE id = p_folder AND property_id = p_property AND revision = p_revision;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Folder changed; reload before saving' USING ERRCODE = '40001';
    END IF;
  END IF;

  IF p_folder IS NULL OR v_previous.starts_on IS DISTINCT FROM p_starts
    OR v_previous.ends_on IS DISTINCT FROM p_ends THEN
    SELECT jsonb_agg(jsonb_build_object(
      'id', folder.id, 'label', folder.label, 'starts_on', folder.starts_on, 'ends_on', folder.ends_on
    ) ORDER BY folder.starts_on, folder.id) INTO v_review
    FROM public.property_tenancy_folders folder
    WHERE folder.property_id = p_property AND folder.id IS DISTINCT FROM p_folder
      AND folder.starts_on <= coalesce(p_ends, 'infinity'::date)
      AND p_starts <= coalesce(folder.ends_on, 'infinity'::date);

    IF v_review IS NOT NULL THEN
      v_token := md5(jsonb_build_array(p_property, p_folder, p_revision, p_starts, p_ends, v_review)::text);
      IF p_overlap_token IS DISTINCT FROM v_token THEN
        RETURN jsonb_build_object(
          'overlap', jsonb_build_object(
            'token', v_token, 'count', jsonb_array_length(v_review),
            'folders', (SELECT jsonb_agg(item ORDER BY ordinality)
                        FROM jsonb_array_elements(v_review) WITH ORDINALITY AS match(item, ordinality)
                        WHERE ordinality <= 5)
          )
        );
      END IF;
    END IF;
  END IF;

  IF p_folder IS NULL THEN
    v_id := public.create_property_tenancy_folder(p_actor, p_property, p_label, p_starts, p_ends);
  ELSE
    v_id := public.update_property_tenancy_folder_with_confirmation(
      p_actor, p_property, p_folder, p_revision, p_label, p_starts, p_ends, p_confirm_dates
    );
  END IF;
  RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE FUNCTION public.create_property_inspection_report_with_outcome(
  p_actor uuid, p_property uuid, p_folder uuid, p_title text,
  p_inspected date, p_kind text, p_notes text, p_photos uuid[],
  p_corrects uuid, p_exception text, p_outcome text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_id uuid;
  v_count integer;
  v_starts date;
  v_ends date;
  v_exception text;
BEGIN
  PERFORM public.require_property_inspection_editor(p_actor, p_property);
  IF p_outcome = 'evidence_free' AND (
    p_kind NOT IN ('check_in', 'check_out') OR btrim(p_notes) <> '' OR cardinality(p_photos) > 0
  ) THEN
    RAISE EXCEPTION 'Evidence-free confirmation does not match report' USING ERRCODE = '22023';
  END IF;
  SELECT starts_on, ends_on INTO v_starts, v_ends
  FROM public.property_tenancy_folders
  WHERE id = p_folder AND property_id = p_property FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Folder not found' USING ERRCODE = '22023'; END IF;
  IF p_inspected < v_starts OR p_inspected > v_ends THEN
    v_exception := nullif(btrim(p_exception), '');
    IF v_exception IS NULL THEN
      RAISE EXCEPTION 'Explain why the inspection falls outside the tenancy dates' USING ERRCODE = 'PT422';
    END IF;
  END IF;
  IF p_corrects IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.property_inspection_reports
    WHERE id = p_corrects AND property_id = p_property AND folder_id = p_folder AND kind = p_kind
  ) THEN
    RAISE EXCEPTION 'Corrected report must be the same inspection type and tenancy' USING ERRCODE = '22023';
  END IF;
  IF p_photos IS NULL OR cardinality(p_photos) > 50
    OR cardinality(p_photos) <> (SELECT count(DISTINCT id) FROM unnest(p_photos) id) THEN
    RAISE EXCEPTION 'Invalid photo selection' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.property_room_photos
  WHERE property_id = p_property AND id = ANY(p_photos) AND NOT deletion_pending
  ORDER BY id FOR SHARE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> cardinality(p_photos) THEN
    RAISE EXCEPTION 'Selected photos must be available for this property' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.property_inspection_reports (
    property_id, folder_id, title, inspected_on, kind, notes, created_by,
    tenancy_starts_on, tenancy_ends_on, date_exception_reason, corrects_report_id, outcome
  )
  VALUES (
    p_property, p_folder, btrim(p_title), p_inspected, p_kind, p_notes, p_actor,
    v_starts, v_ends, v_exception, p_corrects, p_outcome
  ) RETURNING id INTO v_id;
  INSERT INTO public.property_inspection_photos (
    report_id, property_id, source_photo_id, room_type, file_name, uploaded_at
  )
  SELECT v_id, p_property, id, room_type, file_name, created_at
  FROM public.property_room_photos WHERE property_id = p_property AND id = ANY(p_photos);
  RETURN v_id;
END;
$$;

-- Keep existing callers on the same atomic writer during deployment.
CREATE OR REPLACE FUNCTION public.create_property_inspection_report_with_context(
  p_actor uuid, p_property uuid, p_folder uuid, p_title text,
  p_inspected date, p_kind text, p_notes text, p_photos uuid[],
  p_corrects uuid, p_exception text
) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT public.create_property_inspection_report_with_outcome(
    p_actor, p_property, p_folder, p_title, p_inspected, p_kind, p_notes, p_photos, p_corrects, p_exception, NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.read_tenancy_comparison_check_in(
  p_property uuid, p_folder uuid, p_on date
) RETURNS TABLE (id uuid, title text, inspected_on date, notes text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT r.id, r.title, r.inspected_on,
    CASE r.outcome
      WHEN 'no_issues_found' THEN concat_ws(E'\n\n', 'No issues found.', nullif(r.notes, ''))
      WHEN 'evidence_free' THEN 'Recorded without observations or photos.'
      ELSE r.notes
    END
  FROM public.property_inspection_reports r
  WHERE r.property_id = p_property AND r.folder_id = p_folder
    AND r.kind = 'check_in' AND r.inspected_on <= p_on
    AND NOT EXISTS (
      SELECT 1 FROM public.property_inspection_reports correction WHERE correction.corrects_report_id = r.id
    )
  ORDER BY r.inspected_on DESC, r.created_at DESC, r.id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION
  public.read_property_tenancy_checkout_folders(uuid,uuid[]),
  public.save_property_tenancy_folder_with_overlap(uuid,uuid,uuid,integer,text,date,date,boolean,text),
  public.create_property_inspection_report_with_outcome(uuid,uuid,uuid,text,date,text,text,uuid[],uuid,text,text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.read_property_tenancy_checkout_folders(uuid,uuid[]),
  public.save_property_tenancy_folder_with_overlap(uuid,uuid,uuid,integer,text,date,date,boolean,text),
  public.create_property_inspection_report_with_outcome(uuid,uuid,uuid,text,date,text,text,uuid[],uuid,text,text)
TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
