CREATE TABLE public.tenant_report_submissions (
  token_id uuid NOT NULL REFERENCES public.anonymous_report_tokens(id) ON DELETE CASCADE,
  key_hash text NOT NULL CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  report_id uuid REFERENCES public.anonymous_reports(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (token_id, key_hash),
  UNIQUE (report_id)
);

ALTER TABLE public.tenant_report_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tenant_report_submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.tenant_report_submissions TO service_role;

CREATE FUNCTION public.submit_tenant_report_once(
  p_token text,
  p_key_hash text,
  p_receipt_hash text,
  p_payload_hash text,
  p_report jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  link public.anonymous_report_tokens%ROWTYPE;
  saved public.tenant_report_submissions%ROWTYPE;
  report public.anonymous_reports%ROWTYPE;
BEGIN
  IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$'
     OR p_receipt_hash IS NULL OR p_receipt_hash !~ '^[0-9a-f]{64}$'
     OR (p_report IS NOT NULL AND (jsonb_typeof(p_report) <> 'object'
         OR p_payload_hash IS NULL OR p_payload_hash !~ '^[0-9a-f]{64}$'))
     OR (p_report IS NULL AND p_payload_hash IS NOT NULL) THEN
    RAISE EXCEPTION 'Invalid submission' USING ERRCODE = '22023';
  END IF;

  -- Serialize writes and deactivation on this exact reporting link. Recovery
  -- can only return a report already committed by a previous request.
  SELECT * INTO link FROM public.anonymous_report_tokens
  WHERE token = p_token FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid reporting link' USING ERRCODE = 'PT404';
  END IF;
  IF NOT link.is_active OR link.property_id IS NULL THEN
    RAISE EXCEPTION 'Reporting link unavailable' USING ERRCODE = 'PT410';
  END IF;

  SELECT * INTO saved FROM public.tenant_report_submissions
  WHERE token_id = link.id AND key_hash = p_key_hash;
  IF FOUND THEN
    SELECT * INTO report FROM public.anonymous_reports
    WHERE id = saved.report_id AND token_id = link.id AND property_id = link.property_id
      AND conversation_key_hash = p_receipt_hash;
    IF NOT FOUND OR saved.created_at < now() - interval '1 hour' THEN
      RAISE EXCEPTION 'Report recovery unavailable' USING ERRCODE = 'PT410';
    END IF;
    IF p_report IS NOT NULL AND saved.payload_hash <> p_payload_hash THEN
      RAISE EXCEPTION 'Report already saved with different details' USING ERRCODE = 'PT409';
    END IF;
    RETURN jsonb_build_object(
      'id', report.id, 'urgency', report.urgency, 'status', report.status, 'created', false
    );
  END IF;

  IF p_report IS NULL THEN
    RAISE EXCEPTION 'No saved report for this submission' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.anonymous_reports (
    token_id, property_id, reporter_name, reporter_phone, reporter_email,
    reporter_unit, category, description, urgency, photos, status, conversation_key_hash
  ) VALUES (
    link.id, link.property_id, p_report->>'reporter_name', p_report->>'reporter_phone',
    p_report->>'reporter_email', p_report->>'reporter_unit', p_report->>'category',
    p_report->>'description', p_report->>'urgency',
    CASE WHEN jsonb_typeof(p_report->'photos') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_report->'photos')) END,
    'new', p_receipt_hash
  ) RETURNING * INTO report;

  INSERT INTO public.tenant_report_submissions (token_id, key_hash, payload_hash, report_id)
  VALUES (link.id, p_key_hash, p_payload_hash, report.id);
  UPDATE public.anonymous_report_tokens
  SET last_report_at = now(), total_reports = coalesce(total_reports, 0) + 1
  WHERE id = link.id;

  RETURN jsonb_build_object(
    'id', report.id, 'urgency', report.urgency, 'status', report.status,
    'owner_id', link.owner_id, 'created', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_tenant_report_once(text,text,text,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_tenant_report_once(text,text,text,text,jsonb)
  TO service_role;
