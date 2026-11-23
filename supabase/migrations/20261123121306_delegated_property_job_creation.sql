-- Keep job ownership and default payment with the property owner. The
-- creation request and attachment uploader record the actual actor.
CREATE OR REPLACE FUNCTION public.create_job_once(
  p_user_id uuid,
  p_request_id uuid,
  p_fingerprint text,
  p_job jsonb,
  p_photo_urls text[] DEFAULT '{}'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  inserted integer;
  saved public.job_creation_requests%ROWTYPE;
  result jsonb;
  columns_sql text;
  property_id_input uuid;
  owner_id_input uuid;
  owner_id_current uuid;
  payer_id_input uuid;
  active_profiles integer;
  allowed constant text[] := ARRAY[
    'title','homeowner_id','status','description','category','urgency','budget',
    'budget_min','budget_max','show_budget_to_contractors','require_itemized_bids',
    'location','required_skills','property_id','latitude','longitude',
    'is_rental_property','payer_user_id','tenancy_metadata','requirements','city','postcode'
  ];
BEGIN
  IF p_request_id IS NULL OR p_user_id IS NULL
     OR p_fingerprint IS NULL OR length(p_fingerprint) <> 64
     OR jsonb_typeof(p_job) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid creation identity' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_job) k WHERE NOT k = ANY(allowed)) THEN
    RAISE EXCEPTION 'Unsupported job field' USING ERRCODE = '22023';
  END IF;

  property_id_input := (p_job->>'property_id')::uuid;
  owner_id_input := (p_job->>'homeowner_id')::uuid;
  payer_id_input := (p_job->>'payer_user_id')::uuid;

  IF property_id_input IS NULL THEN
    IF owner_id_input IS DISTINCT FROM p_user_id OR payer_id_input IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid creation identity' USING ERRCODE = '22023';
    END IF;
  ELSE
    -- Team management locks the property before membership. Keep that order
    -- and hold both locks until commit so revocation cannot race the insert.
    SELECT p.owner_id INTO owner_id_current
    FROM public.properties p
    WHERE p.id = property_id_input
    FOR SHARE;

    IF owner_id_current IS NULL OR owner_id_input IS DISTINCT FROM owner_id_current THEN
      RAISE EXCEPTION 'Property ownership changed or is unavailable' USING ERRCODE = '42501';
    END IF;

    PERFORM 1 FROM public.profiles
    WHERE id IN (p_user_id, owner_id_current) AND deleted_at IS NULL
    ORDER BY id FOR SHARE;
    GET DIAGNOSTICS active_profiles = ROW_COUNT;
    IF active_profiles <> (CASE WHEN p_user_id = owner_id_current THEN 1 ELSE 2 END) THEN
      RAISE EXCEPTION 'Job creator or owner is unavailable' USING ERRCODE = '42501';
    END IF;

    IF p_user_id <> owner_id_current THEN
      PERFORM 1 FROM public.property_team_members m
      WHERE m.property_id = property_id_input AND m.user_id = p_user_id
        AND m.status = 'accepted' AND m.role IN ('admin', 'manager')
      FOR SHARE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Property job creation is not permitted' USING ERRCODE = '42501';
      END IF;

      IF payer_id_input IS NOT NULL
         OR nullif(p_job->'tenancy_metadata'->>'payer_email', '') IS NOT NULL
         OR coalesce(p_job->>'status', 'posted') NOT IN ('draft', 'open', 'posted') THEN
        RAISE EXCEPTION 'Delegated job exceeds creation authority' USING ERRCODE = '42501';
      END IF;
    ELSIF payer_id_input IS NOT NULL AND payer_id_input <> owner_id_current THEN
      PERFORM 1 FROM public.property_team_members m
      JOIN public.profiles payer ON payer.id = m.user_id AND payer.deleted_at IS NULL
      WHERE m.property_id = property_id_input AND m.user_id = payer_id_input
        AND m.status = 'accepted' AND m.role IN ('admin', 'manager')
      FOR SHARE OF m, payer;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Designated payer is unavailable' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.job_creation_requests(user_id, request_id, request_fingerprint)
  VALUES (p_user_id, p_request_id, p_fingerprint)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;

  SELECT * INTO saved FROM public.job_creation_requests
  WHERE user_id = p_user_id AND request_id = p_request_id FOR UPDATE;
  IF saved.request_fingerprint <> p_fingerprint THEN
    RAISE EXCEPTION 'Request already used for different job details' USING ERRCODE = '22023';
  END IF;
  IF inserted = 0 THEN
    SELECT to_jsonb(j) INTO result FROM public.jobs j
    WHERE j.id = saved.job_id AND j.homeowner_id = owner_id_input
      AND j.property_id IS NOT DISTINCT FROM property_id_input
      AND j.deleted_at IS NULL;
    IF result IS NULL THEN
      RAISE EXCEPTION 'The original job is no longer available' USING ERRCODE = 'P0002';
    END IF;
    RETURN jsonb_build_object('job', result, 'created', false);
  END IF;

  -- Identifiers come from the fixed allowlist above. Bind all values.
  SELECT string_agg(format('%I', k), ',' ORDER BY k) INTO columns_sql
  FROM jsonb_object_keys(p_job) k;
  EXECUTE format(
    'INSERT INTO public.jobs (%s) SELECT %s FROM jsonb_populate_record(NULL::public.jobs,$1) RETURNING to_jsonb(jobs.*)',
    columns_sql, columns_sql
  ) INTO result USING p_job;

  INSERT INTO public.job_attachments(job_id, file_url, file_type, uploaded_by)
  SELECT (result->>'id')::uuid, url, 'image', p_user_id FROM unnest(p_photo_urls) url;
  UPDATE public.job_creation_requests SET job_id = (result->>'id')::uuid
  WHERE user_id = p_user_id AND request_id = p_request_id;
  RETURN jsonb_build_object('job', result, 'created', true);
END;
$$;

REVOKE ALL ON FUNCTION public.create_job_once(uuid,uuid,text,jsonb,text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_job_once(uuid,uuid,text,jsonb,text[]) TO service_role;
