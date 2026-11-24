BEGIN;
SET LOCAL lock_timeout = '5s';

-- Older reports have no reliable historical tenancy dates to backfill.
ALTER TABLE public.property_inspection_reports
  ADD COLUMN tenancy_starts_on date,
  ADD COLUMN tenancy_ends_on date,
  ADD COLUMN date_exception_reason text CHECK (length(date_exception_reason) BETWEEN 1 AND 1000),
  ADD COLUMN corrects_report_id uuid UNIQUE,
  ADD CONSTRAINT inspection_correction_is_distinct CHECK (corrects_report_id <> id),
  ADD CONSTRAINT inspection_tenancy_dates_valid CHECK (
    tenancy_ends_on IS NULL OR (tenancy_starts_on IS NOT NULL AND tenancy_ends_on >= tenancy_starts_on)
  ),
  ADD CONSTRAINT inspection_corrects_report_fk
    FOREIGN KEY (corrects_report_id, property_id)
    REFERENCES public.property_inspection_reports(id, property_id);

ALTER TABLE public.property_room_photos
  ADD COLUMN deletion_pending boolean NOT NULL DEFAULT false;

-- A direct photo-row deletion must also respect saved evidence. Deferring the
-- check allows a complete property deletion to remove both rows by cascade.
ALTER TABLE public.property_inspection_photos
  DROP CONSTRAINT property_inspection_photos_source_photo_id_fkey,
  ADD CONSTRAINT property_inspection_photos_source_photo_id_fkey
    FOREIGN KEY (source_photo_id) REFERENCES public.property_room_photos(id)
    DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION public.create_property_inspection_report_with_context(
  p_actor uuid, p_property uuid, p_folder uuid, p_title text,
  p_inspected date, p_kind text, p_notes text, p_photos uuid[],
  p_corrects uuid, p_exception text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_id uuid;
  v_count integer;
  v_starts date;
  v_ends date;
  v_exception text;
BEGIN
  PERFORM public.require_property_inspection_editor(p_actor, p_property);
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
    tenancy_starts_on, tenancy_ends_on, date_exception_reason, corrects_report_id
  )
  VALUES (
    p_property, p_folder, btrim(p_title), p_inspected, p_kind, p_notes, p_actor,
    v_starts, v_ends, v_exception, p_corrects
  ) RETURNING id INTO v_id;
  INSERT INTO public.property_inspection_photos (
    report_id, property_id, source_photo_id, room_type, file_name, uploaded_at
  )
  SELECT v_id, p_property, id, room_type, file_name, created_at
  FROM public.property_room_photos WHERE property_id = p_property AND id = ANY(p_photos);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_property_inspection_report(
  p_actor uuid, p_property uuid, p_folder uuid, p_title text,
  p_inspected date, p_kind text, p_notes text, p_photos uuid[]
) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT public.create_property_inspection_report_with_context(
    p_actor, p_property, p_folder, p_title, p_inspected, p_kind, p_notes, p_photos, NULL, NULL
  );
$$;

CREATE INDEX property_inspection_reports_folder_date_idx
  ON public.property_inspection_reports (property_id, folder_id, inspected_on DESC, created_at DESC, id);

CREATE FUNCTION public.read_tenancy_comparison_check_in(
  p_property uuid, p_folder uuid, p_on date
) RETURNS TABLE (id uuid, title text, inspected_on date, notes text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT r.id, r.title, r.inspected_on, r.notes
  FROM public.property_inspection_reports r
  WHERE r.property_id = p_property AND r.folder_id = p_folder
    AND r.kind = 'check_in' AND r.inspected_on <= p_on
    AND NOT EXISTS (
      SELECT 1 FROM public.property_inspection_reports correction
      WHERE correction.corrects_report_id = r.id
    )
  ORDER BY r.inspected_on DESC, r.created_at DESC, r.id
  LIMIT 1;
$$;

CREATE FUNCTION public.update_property_tenancy_folder_with_confirmation(
  p_actor uuid, p_property uuid, p_folder uuid, p_revision integer,
  p_label text, p_starts date, p_ends date, p_confirm boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_starts date; v_ends date;
BEGIN
  PERFORM public.require_property_inspection_editor(p_actor, p_property);
  SELECT starts_on, ends_on INTO v_starts, v_ends
  FROM public.property_tenancy_folders
  WHERE id = p_folder AND property_id = p_property AND revision = p_revision FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Folder changed; reload before saving' USING ERRCODE = '40001'; END IF;
  IF NOT coalesce(p_confirm, false) AND EXISTS (
    SELECT 1 FROM public.property_inspection_reports
    WHERE property_id = p_property AND folder_id = p_folder
      AND inspected_on >= v_starts AND (v_ends IS NULL OR inspected_on <= v_ends)
      AND (inspected_on < p_starts OR inspected_on > p_ends)
  ) THEN
    RAISE EXCEPTION 'New tenancy dates exclude an existing inspection' USING ERRCODE = 'PT422';
  END IF;
  RETURN public.update_property_tenancy_folder(
    p_actor, p_property, p_folder, p_revision, p_label, p_starts, p_ends
  );
END;
$$;

CREATE FUNCTION public.begin_property_room_photo_delete(p_property uuid, p_photo uuid)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_path text;
BEGIN
  SELECT storage_path INTO v_path FROM public.property_room_photos
  WHERE property_id = p_property AND id = p_photo FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF EXISTS (
    SELECT 1 FROM public.property_inspection_photos WHERE source_photo_id = p_photo
  ) THEN
    RAISE EXCEPTION 'Photo is evidence in a saved report' USING ERRCODE = 'PT409';
  END IF;
  UPDATE public.property_room_photos SET deletion_pending = true
  WHERE property_id = p_property AND id = p_photo;
  RETURN v_path;
END;
$$;

REVOKE ALL ON FUNCTION
  public.create_property_inspection_report_with_context(uuid,uuid,uuid,text,date,text,text,uuid[],uuid,text),
  public.read_tenancy_comparison_check_in(uuid,uuid,date),
  public.update_property_tenancy_folder_with_confirmation(uuid,uuid,uuid,integer,text,date,date,boolean),
  public.begin_property_room_photo_delete(uuid,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.create_property_inspection_report_with_context(uuid,uuid,uuid,text,date,text,text,uuid[],uuid,text),
  public.read_tenancy_comparison_check_in(uuid,uuid,date),
  public.update_property_tenancy_folder_with_confirmation(uuid,uuid,uuid,integer,text,date,date,boolean),
  public.begin_property_room_photo_delete(uuid,uuid)
TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
