ALTER TABLE public.job_rework_requests ADD COLUMN completion_version timestamptz;
CREATE FUNCTION public.request_job_rework_for_completion(
 p_job_id uuid,p_actor_id uuid,p_request_key text,p_comments text,p_expected_completed_at timestamptz
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE j public.jobs%ROWTYPE; prior public.job_rework_requests%ROWTYPE; applied boolean;
BEGIN
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job not found' USING ERRCODE='P0002'; END IF;
 IF coalesce(j.payer_user_id,j.homeowner_id) IS DISTINCT FROM p_actor_id THEN
  RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO prior FROM public.job_rework_requests WHERE actor_id=p_actor_id AND request_key=p_request_key;
 IF FOUND THEN
  IF prior.job_id IS DISTINCT FROM p_job_id OR prior.comments IS DISTINCT FROM btrim(p_comments) OR
   prior.completion_version IS DISTINCT FROM p_expected_completed_at THEN
   RAISE EXCEPTION 'Request key payload mismatch' USING ERRCODE='23514'; END IF;
  RETURN false;
 END IF;
 -- A restarted client may send a new transport key for the same decision.
 IF EXISTS(SELECT 1 FROM public.job_rework_requests WHERE job_id=p_job_id AND actor_id=p_actor_id
  AND completion_version=p_expected_completed_at AND comments=btrim(p_comments)) THEN RETURN false; END IF;
 IF p_expected_completed_at IS NULL OR j.completed_at IS DISTINCT FROM p_expected_completed_at THEN
  RAISE EXCEPTION 'Completion changed. Refresh before requesting changes.' USING ERRCODE='23514'; END IF;
 applied:=public.request_job_rework(p_job_id,p_actor_id,p_request_key,p_comments);
 UPDATE public.job_rework_requests SET completion_version=p_expected_completed_at
 WHERE actor_id=p_actor_id AND request_key=p_request_key;
 RETURN applied;
END $$;
REVOKE ALL ON FUNCTION public.request_job_rework_for_completion(uuid,uuid,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_job_rework_for_completion(uuid,uuid,text,text,timestamptz) TO service_role;
