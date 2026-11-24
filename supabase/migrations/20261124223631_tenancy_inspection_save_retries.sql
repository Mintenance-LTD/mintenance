BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.property_inspection_save_receipts (
  property_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  request_id uuid NOT NULL,
  payload_hash bytea NOT NULL,
  report_id uuid NOT NULL,
  PRIMARY KEY (property_id, actor_id, request_id),
  FOREIGN KEY (report_id, property_id)
    REFERENCES public.property_inspection_reports (id, property_id) ON DELETE CASCADE
);
CREATE INDEX property_inspection_save_receipts_report_idx
  ON public.property_inspection_save_receipts (report_id, property_id);
ALTER TABLE public.property_inspection_save_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_inspection_save_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.property_inspection_save_receipts TO service_role;

CREATE FUNCTION public.save_property_inspection_report(
  p_actor uuid, p_property uuid, p_folder uuid, p_title text,
  p_inspected date, p_kind text, p_notes text, p_photos uuid[],
  p_corrects uuid, p_exception text, p_outcome text, p_request_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_hash bytea;
  v_receipt public.property_inspection_save_receipts%ROWTYPE;
  v_report_id uuid;
BEGIN
  IF p_request_id IS NULL THEN
    RETURN public.create_property_inspection_report_with_outcome(
      p_actor, p_property, p_folder, p_title, p_inspected, p_kind, p_notes,
      p_photos, p_corrects, p_exception, p_outcome
    );
  END IF;

  PERFORM public.require_property_inspection_editor(p_actor, p_property);
  -- Serialize attempts for this save before reading or recording its receipt.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'property-inspection:' || p_property::text || ':' || p_actor::text || ':' || p_request_id::text, 0
  ));

  v_hash := sha256(convert_to(jsonb_build_array(
    p_folder, btrim(p_title), p_inspected, p_kind, btrim(p_notes),
    ARRAY(SELECT id FROM unnest(p_photos) AS id ORDER BY id), p_corrects,
    nullif(btrim(p_exception), ''), p_outcome
  )::text, 'UTF8'));
  SELECT * INTO v_receipt FROM public.property_inspection_save_receipts
  WHERE property_id = p_property AND actor_id = p_actor AND request_id = p_request_id;
  IF FOUND THEN
    IF v_receipt.payload_hash IS DISTINCT FROM v_hash THEN
      RAISE EXCEPTION 'This save already recorded a different version of the report'
        USING ERRCODE = 'PT409', DETAIL = v_receipt.report_id::text;
    END IF;
    RETURN v_receipt.report_id;
  END IF;

  v_report_id := public.create_property_inspection_report_with_outcome(
    p_actor, p_property, p_folder, p_title, p_inspected, p_kind, p_notes,
    p_photos, p_corrects, p_exception, p_outcome
  );
  INSERT INTO public.property_inspection_save_receipts
    (property_id, actor_id, request_id, payload_hash, report_id)
  VALUES (p_property, p_actor, p_request_id, v_hash, v_report_id);
  RETURN v_report_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_property_tenancy_folder_with_confirmation(
  p_actor uuid, p_property uuid, p_folder uuid, p_revision integer,
  p_label text, p_starts date, p_ends date, p_confirm boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_starts date;
  v_ends date;
  v_review jsonb;
BEGIN
  PERFORM public.require_property_inspection_editor(p_actor, p_property);
  SELECT starts_on, ends_on INTO v_starts, v_ends
  FROM public.property_tenancy_folders
  WHERE id = p_folder AND property_id = p_property AND revision = p_revision FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Folder changed; reload before saving' USING ERRCODE = '40001'; END IF;

  IF NOT coalesce(p_confirm, false) THEN
    SELECT jsonb_build_object(
      'count', max(affected.total),
      'reports', jsonb_agg(jsonb_build_object(
        'id', affected.id, 'title', affected.title, 'inspected_on', affected.inspected_on
      ) ORDER BY affected.inspected_on, affected.id)
    ) INTO v_review
    FROM (
      SELECT id, title, inspected_on, count(*) OVER () AS total
      FROM public.property_inspection_reports
      WHERE property_id = p_property AND folder_id = p_folder
        AND inspected_on >= v_starts AND (v_ends IS NULL OR inspected_on <= v_ends)
        AND (inspected_on < p_starts OR inspected_on > p_ends)
      ORDER BY inspected_on, id
      LIMIT 5
    ) affected
    HAVING count(*) > 0;
    IF v_review IS NOT NULL THEN
      RAISE EXCEPTION 'New tenancy dates exclude an existing inspection'
        USING ERRCODE = 'PT422', DETAIL = v_review::text;
    END IF;
  END IF;
  RETURN public.update_property_tenancy_folder(
    p_actor, p_property, p_folder, p_revision, p_label, p_starts, p_ends
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_property_inspection_report(
  uuid,uuid,uuid,text,date,text,text,uuid[],uuid,text,text,uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_property_inspection_report(
  uuid,uuid,uuid,text,date,text,text,uuid[],uuid,text,text,uuid
) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
