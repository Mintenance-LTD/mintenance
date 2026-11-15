CREATE TABLE public.job_creation_requests (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  request_fingerprint text NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,request_id)
);
CREATE INDEX job_creation_requests_job_idx ON public.job_creation_requests(job_id);
ALTER TABLE public.job_creation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_creation_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.job_creation_requests TO service_role;

-- Only server-validated, owner-authorized payloads reach this service-role RPC.
-- Job, photo records and retry identity commit or roll back together.
CREATE FUNCTION public.create_job_once(p_user_id uuid,p_request_id uuid,p_fingerprint text,p_job jsonb,p_photo_urls text[] DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE inserted integer; saved public.job_creation_requests; result jsonb; columns_sql text;
 allowed constant text[] := ARRAY['title','homeowner_id','status','description','category','urgency','budget','budget_min','budget_max','show_budget_to_contractors','require_itemized_bids','location','required_skills','property_id','latitude','longitude','is_rental_property','payer_user_id','tenancy_metadata','requirements','city','postcode'];
BEGIN
 IF p_request_id IS NULL OR p_user_id IS NULL OR p_fingerprint IS NULL OR length(p_fingerprint)<>64 OR jsonb_typeof(p_job)<>'object' OR (p_job->>'homeowner_id')::uuid IS DISTINCT FROM p_user_id THEN
  RAISE EXCEPTION 'Invalid creation identity' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_job) k WHERE NOT k=ANY(allowed)) THEN
  RAISE EXCEPTION 'Unsupported job field' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.job_creation_requests(user_id,request_id,request_fingerprint) VALUES(p_user_id,p_request_id,p_fingerprint) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 SELECT * INTO saved FROM public.job_creation_requests WHERE user_id=p_user_id AND request_id=p_request_id FOR UPDATE;
 IF saved.request_fingerprint<>p_fingerprint THEN
  RAISE EXCEPTION 'Request already used for different job details' USING ERRCODE='22023';
 END IF;
 IF inserted=0 THEN
  SELECT to_jsonb(j) INTO result FROM public.jobs j WHERE id=saved.job_id AND homeowner_id=p_user_id;
  IF result IS NULL THEN RAISE EXCEPTION 'The original job is no longer available' USING ERRCODE='P0002'; END IF;
  RETURN jsonb_build_object('job',result,'created',false);
 END IF;
 -- Identifiers are selected from a fixed allowlist and quoted; values stay bound.
 SELECT string_agg(format('%I',k),',' ORDER BY k) INTO columns_sql FROM jsonb_object_keys(p_job) k;
 EXECUTE format('INSERT INTO public.jobs (%s) SELECT %s FROM jsonb_populate_record(NULL::public.jobs,$1) RETURNING to_jsonb(jobs.*)',columns_sql,columns_sql) INTO result USING p_job;
 INSERT INTO public.job_attachments(job_id,file_url,file_type,uploaded_by)
  SELECT (result->>'id')::uuid,url,'image',p_user_id FROM unnest(p_photo_urls) url;
 UPDATE public.job_creation_requests SET job_id=(result->>'id')::uuid WHERE user_id=p_user_id AND request_id=p_request_id;
 RETURN jsonb_build_object('job',result,'created',true);
END $$;
REVOKE ALL ON FUNCTION public.create_job_once(uuid,uuid,text,jsonb,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_job_once(uuid,uuid,text,jsonb,text[]) TO service_role;
