CREATE OR REPLACE FUNCTION public.request_job_rework(p_job_id uuid, p_actor_id uuid, p_request_key text, p_comments text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE j public.jobs%ROWTYPE; e public.escrow_transactions%ROWTYPE; prior public.job_rework_requests%ROWTYPE; request_id uuid;
BEGIN
  IF p_request_key IS NULL OR length(p_request_key) NOT BETWEEN 1 AND 255 OR
     p_comments IS NULL OR length(btrim(p_comments)) NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'Invalid rework request' USING ERRCODE='23514';
  END IF;
  SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found' USING ERRCODE='P0002'; END IF;
  IF coalesce(j.payer_user_id,j.homeowner_id) IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
  END IF;
  SELECT * INTO prior FROM public.job_rework_requests WHERE actor_id=p_actor_id AND request_key=p_request_key;
  IF FOUND THEN
    IF prior.job_id <> p_job_id OR prior.comments <> btrim(p_comments) THEN
      RAISE EXCEPTION 'Request key payload mismatch' USING ERRCODE='23514';
    END IF;
    RETURN false;
  END IF;
  IF j.status <> 'completed' THEN RAISE EXCEPTION 'Job is not completed' USING ERRCODE='23514'; END IF;
  SELECT * INTO e FROM public.escrow_transactions WHERE job_id=p_job_id ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR e.status NOT IN('held','awaiting_homeowner_approval') THEN
    RAISE EXCEPTION 'Escrow is not available for rework' USING ERRCODE='23514';
  END IF;
  UPDATE public.escrow_transactions SET status='held',homeowner_approval=false, homeowner_approval_at=NULL,
    homeowner_inspection_completed=false, homeowner_inspection_at=NULL, auto_release_date=NULL,auto_approval_date=NULL,cooling_off_ends_at=NULL,
    release_blocked_reason='Rework requested; completion must be reviewed again',
    release_reason=NULL, updated_at=now() WHERE id=e.id;
  PERFORM set_config('mintenance.rework_job',p_job_id::text,true);
  UPDATE public.jobs SET status='in_progress',completed_at=NULL,completion_confirmed_by_homeowner=false,
    completion_confirmed_at=NULL,updated_at=now() WHERE id=p_job_id;
  PERFORM set_config('mintenance.rework_job','',true);
  INSERT INTO public.job_rework_requests(job_id,actor_id,request_key,comments)
    VALUES(p_job_id,p_actor_id,p_request_key,btrim(p_comments)) RETURNING id INTO request_id;
  INSERT INTO public.notifications(user_id,title,message,type,action_url,metadata)
    VALUES(j.contractor_id,coalesce(j.title,'Job')||' — changes requested',btrim(p_comments),'changes_requested',
      '/contractor/jobs/'||j.id::text,jsonb_build_object('jobId',j.id,'reworkRequestId',request_id,'reworkRequestKey',p_request_key));
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.request_job_rework(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_job_rework(uuid,uuid,text,text) TO service_role;
