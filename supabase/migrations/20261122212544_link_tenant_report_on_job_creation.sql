-- Keep report conversion and job creation in the same transaction.
CREATE FUNCTION public.create_job_from_tenant_report_once(
  p_user_id uuid,
  p_request_id uuid,
  p_fingerprint text,
  p_job jsonb,
  p_photo_urls text[],
  p_report_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  source_report public.anonymous_reports%ROWTYPE;
  result jsonb;
BEGIN
  SELECT report.* INTO source_report
  FROM public.anonymous_reports report
  JOIN public.anonymous_report_tokens token ON token.id = report.token_id
  WHERE report.id = p_report_id AND token.owner_id = p_user_id
  FOR UPDATE OF report, token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant report unavailable' USING ERRCODE = '42501';
  END IF;

  IF source_report.property_id IS NULL
     OR (p_job->>'property_id')::uuid IS DISTINCT FROM source_report.property_id THEN
    RAISE EXCEPTION 'Job property must match its tenant report' USING ERRCODE = '23514';
  END IF;

  IF source_report.job_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.job_creation_requests request
      WHERE request.user_id = p_user_id
        AND request.request_id = p_request_id
        AND request.job_id = source_report.job_id
        AND request.request_fingerprint = p_fingerprint
    ) THEN
      RAISE EXCEPTION 'Tenant report is already linked to a job' USING ERRCODE = '23514';
    END IF;
  ELSIF source_report.status NOT IN ('new', 'acknowledged') THEN
    RAISE EXCEPTION 'Tenant report must be open to create a job' USING ERRCODE = '23514';
  END IF;

  result := public.create_job_once(p_user_id, p_request_id, p_fingerprint, p_job, p_photo_urls);
  IF (result->>'created')::boolean AND source_report.job_id IS NULL THEN
    UPDATE public.anonymous_reports
    SET job_id = (result->'job'->>'id')::uuid, status = 'converted', updated_at = now()
    WHERE id = source_report.id;
  ELSIF (result->'job'->>'id')::uuid IS DISTINCT FROM source_report.job_id THEN
    RAISE EXCEPTION 'Original report link has changed' USING ERRCODE = '23514';
  END IF;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_job_from_tenant_report_once(uuid,uuid,text,jsonb,text[],uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_job_from_tenant_report_once(uuid,uuid,text,jsonb,text[],uuid) TO service_role;
