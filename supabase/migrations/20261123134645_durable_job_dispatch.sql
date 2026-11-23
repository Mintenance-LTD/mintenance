CREATE TABLE public.job_dispatch (
  job_id uuid PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  options jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','queued','cancelled','needs_attention')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_until timestamptz,
  queued_count integer,
  finished_at timestamptz
);
CREATE INDEX job_dispatch_due_idx ON public.job_dispatch(next_attempt_at,job_id) WHERE status='pending';
CREATE INDEX job_dispatch_actor_idx ON public.job_dispatch(requested_by);
CREATE INDEX job_dispatch_attention_idx ON public.job_dispatch(job_id) WHERE status='needs_attention';
ALTER TABLE public.job_dispatch ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_dispatch FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.job_dispatch TO service_role;

CREATE FUNCTION public.create_job_with_dispatch_once(
  p_user_id uuid, p_request_id uuid, p_fingerprint text, p_job jsonb,
  p_photo_urls text[], p_report_id uuid, p_room_ids uuid[], p_dispatch_options jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  result jsonb;
  job_key uuid;
  job_property uuid;
  dispatch_status text;
BEGIN
  IF coalesce(cardinality(p_room_ids),0) > 20
     OR jsonb_typeof(p_dispatch_options) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid job scope' USING ERRCODE = '22023';
  END IF;
  IF p_report_id IS NULL THEN
    result := public.create_job_once(p_user_id,p_request_id,p_fingerprint,p_job,p_photo_urls);
  ELSE
    result := public.create_job_from_tenant_report_once(
      p_user_id,p_request_id,p_fingerprint,p_job,p_photo_urls,p_report_id
    );
  END IF;
  job_key := (result->'job'->>'id')::uuid;
  job_property := (result->'job'->>'property_id')::uuid;

  IF (result->>'created')::boolean THEN
    -- Missing/deleted rooms can be omitted. Rooms from another property
    -- can never enter the snapshot. A write failure rolls back the job.
    INSERT INTO public.job_rooms(job_id,property_room_id,name,room_type,size_sqm_at_post)
    SELECT job_key,r.id,r.name,r.room_type,r.size_sqm FROM public.property_rooms r
    WHERE r.property_id=job_property AND r.id=ANY(p_room_ids);

    IF (result->'job'->>'status') IN ('posted','open') THEN
      INSERT INTO public.job_dispatch(job_id,requested_by,options)
      VALUES(job_key,p_user_id,p_dispatch_options);
    END IF;
  END IF;

  SELECT status INTO dispatch_status FROM public.job_dispatch WHERE job_id=job_key;
  RETURN result || jsonb_build_object('dispatch_status',dispatch_status);
END;
$$;

CREATE FUNCTION public.claim_job_dispatch() RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  dispatch public.job_dispatch%ROWTYPE;
  job jsonb;
BEGIN
  -- A crash counts as an attempt. Exhausted leases appear in operator health.
  WITH expired AS (
    SELECT job_id FROM public.job_dispatch WHERE status='pending'
      AND attempts>=5 AND lease_until<=now()
    ORDER BY lease_until LIMIT 50 FOR UPDATE SKIP LOCKED
  )
  UPDATE public.job_dispatch d SET status='needs_attention', lease_token=NULL, lease_until=NULL
  FROM expired WHERE d.job_id=expired.job_id;

  WITH candidate AS (
    SELECT job_id FROM public.job_dispatch
    WHERE status='pending' AND attempts<5 AND next_attempt_at<=now()
      AND (lease_until IS NULL OR lease_until<=now())
    ORDER BY next_attempt_at,job_id LIMIT 1 FOR UPDATE SKIP LOCKED
  )
  UPDATE public.job_dispatch d
  SET attempts=d.attempts+1, lease_token=gen_random_uuid(), lease_until=now()+interval '2 minutes'
  FROM candidate WHERE d.job_id=candidate.job_id RETURNING d.* INTO dispatch;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'id',j.id,'title',j.title,'location',j.location,'latitude',j.latitude,
    'longitude',j.longitude,'city',j.city,'required_skills',j.required_skills
  ) INTO job FROM public.jobs j WHERE j.id=dispatch.job_id
    AND j.status IN ('posted','open') AND j.deleted_at IS NULL AND j.archived_at IS NULL;
  RETURN jsonb_build_object(
    'job_id',dispatch.job_id,'lease_token',dispatch.lease_token,'requested_by',dispatch.requested_by,
    'options',dispatch.options,'job',job
  );
END;
$$;

CREATE FUNCTION public.finish_job_dispatch(
  p_job_id uuid, p_lease_token uuid, p_invites jsonb
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  dispatch public.job_dispatch%ROWTYPE;
  active_job boolean;
  queued integer;
BEGIN
  -- Follow the same job-before-dispatch lock order as deletion cascades.
  PERFORM 1 FROM public.jobs WHERE id=p_job_id AND status IN ('posted','open')
    AND deleted_at IS NULL AND archived_at IS NULL FOR SHARE;
  active_job := FOUND;
  SELECT * INTO dispatch FROM public.job_dispatch
  WHERE job_id=p_job_id AND status='pending' AND lease_token=p_lease_token AND lease_until>now()
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  IF NOT active_job THEN
    UPDATE public.job_dispatch SET status='cancelled',lease_token=NULL,lease_until=NULL,finished_at=now()
    WHERE job_id=p_job_id;
    RETURN true;
  END IF;
  IF p_invites IS NULL THEN
    UPDATE public.job_dispatch
    SET status=CASE WHEN attempts>=5 THEN 'needs_attention' ELSE 'pending' END,
      next_attempt_at=now()+attempts*interval '5 minutes',lease_token=NULL,lease_until=NULL
    WHERE job_id=p_job_id;
    RETURN true;
  END IF;
  IF jsonb_typeof(p_invites) <> 'array' OR jsonb_array_length(p_invites)>50 THEN
    RAISE EXCEPTION 'Invalid dispatch audience' USING ERRCODE = '22023';
  END IF;

  -- A claim commits its whole fanout once. The queue IDs are subsequently
  -- reused by delivery, so a delivery retry cannot duplicate in-app rows.
  INSERT INTO public.notification_queue(
    user_id,notification_type,title,message,action_url,metadata,scheduled_for,priority,status
  )
  SELECT DISTINCT ON (p.id) p.id,i.type,i.title,i.message,
    CASE WHEN i.type='job_invitation_from_repeat_client' THEN '/contractor/jobs/' ELSE '/jobs/' END || p_job_id,
    jsonb_build_object('jobId',p_job_id,'_job_dispatch',true),
    greatest(now(),i.scheduled_for),
    CASE WHEN i.type='job_invitation_from_repeat_client' THEN 'high' ELSE 'medium' END,
    'pending'
  FROM jsonb_to_recordset(p_invites) AS i(user_id uuid,type text,title text,message text,scheduled_for timestamptz)
  JOIN public.profiles p ON p.id=i.user_id AND p.role='contractor' AND p.deleted_at IS NULL
  WHERE i.type IN ('job_nearby','job_invitation_from_repeat_client')
  ORDER BY p.id, (i.type='job_invitation_from_repeat_client') DESC;
  GET DIAGNOSTICS queued=ROW_COUNT;

  UPDATE public.job_dispatch SET status='queued',queued_count=queued,lease_token=NULL,lease_until=NULL,finished_at=now()
  WHERE job_id=p_job_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_job_with_dispatch_once(uuid,uuid,text,jsonb,text[],uuid,uuid[],jsonb),
  public.claim_job_dispatch(), public.finish_job_dispatch(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_job_with_dispatch_once(uuid,uuid,text,jsonb,text[],uuid,uuid[],jsonb),
  public.claim_job_dispatch(), public.finish_job_dispatch(uuid,uuid,jsonb) TO service_role;
