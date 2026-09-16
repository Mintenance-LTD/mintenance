CREATE FUNCTION public.record_completion_review(
 p_job_id uuid, p_escrow_id uuid, p_actor_id uuid, p_expected_completed_at timestamptz,
 p_action text, p_reason text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE j public.jobs%ROWTYPE; e public.escrow_transactions%ROWTYPE;
 last_rework timestamptz; photos jsonb; review_deadline timestamptz;
BEGIN
 IF p_action IS NULL OR p_action NOT IN('request','inspect','reject') OR p_actor_id IS NULL OR
  (p_action='reject' AND (p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 5000)) THEN
  RAISE EXCEPTION 'Invalid review request' USING ERRCODE='23514'; END IF;
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO e FROM public.escrow_transactions WHERE job_id=j.id ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR e.id IS DISTINCT FROM p_escrow_id THEN
  RAISE EXCEPTION 'Current escrow not found' USING ERRCODE='P0002'; END IF;
 IF p_action='request' THEN
  IF (p_actor_id IS DISTINCT FROM j.contractor_id OR p_actor_id IS DISTINCT FROM e.payee_id)
   AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor_id AND role='admin') THEN
   RAISE EXCEPTION 'Not authorized to request review' USING ERRCODE='42501'; END IF;
 ELSIF coalesce(j.payer_user_id,j.homeowner_id) IS DISTINCT FROM p_actor_id THEN
  RAISE EXCEPTION 'Only the designated payer can review completion' USING ERRCODE='42501';
 END IF;
 IF j.status<>'completed' OR j.completed_at IS DISTINCT FROM p_expected_completed_at THEN
  RAISE EXCEPTION 'The completion changed. Refresh before reviewing.' USING ERRCODE='23514'; END IF;
 IF e.status NOT IN('held','awaiting_homeowner_approval') THEN
  RAISE EXCEPTION 'Escrow is no longer available for review' USING ERRCODE='23514'; END IF;
 SELECT max(created_at) INTO last_rework FROM public.job_rework_requests WHERE job_id=j.id;

 IF p_action='reject' AND e.admin_hold_status='pending_review' AND EXISTS(
   SELECT 1 FROM public.homeowner_approval_history WHERE escrow_transaction_id=e.id
    AND homeowner_id=p_actor_id AND action='rejected' AND comments=btrim(p_reason)
    AND (last_rework IS NULL OR created_at>last_rework)) THEN RETURN false; END IF;
 IF coalesce(e.admin_hold_status,'none') NOT IN('none','admin_approved') THEN
  RAISE EXCEPTION 'This review requires administrator intervention' USING ERRCODE='23514'; END IF;
 IF p_action='request' AND (e.homeowner_approval IS TRUE OR e.status='awaiting_homeowner_approval') THEN RETURN false; END IF;
 IF p_action='reject' AND e.homeowner_approval IS TRUE THEN
  RAISE EXCEPTION 'Completion was already approved. Request changes or contact support.' USING ERRCODE='23514'; END IF;
 IF p_action='inspect' AND e.homeowner_inspection_completed IS TRUE THEN RETURN false; END IF;

 SELECT jsonb_agg(p.photo_url ORDER BY p.id) INTO photos FROM (
  SELECT id,photo_url FROM public.job_photos_metadata WHERE job_id=j.id AND photo_type='after'
    AND (last_rework IS NULL OR created_at>last_rework)
    AND (p_action='reject' OR verified IS TRUE) FOR SHARE
 ) p;
 IF p_action<>'reject' AND photos IS NULL THEN
  RAISE EXCEPTION 'Current verified completion photos are required' USING ERRCODE='23514'; END IF;

 IF p_action='request' THEN
  IF e.photo_verification_status IS DISTINCT FROM 'verified' THEN
   RAISE EXCEPTION 'Photo verification is incomplete' USING ERRCODE='23514'; END IF;
  review_deadline:=now()+interval '7 days';
  UPDATE public.escrow_transactions SET status='awaiting_homeowner_approval',auto_approval_date=review_deadline,
   release_blocked_reason='Waiting for homeowner approval',updated_at=now() WHERE id=e.id;
  INSERT INTO public.notifications(user_id,title,message,type,action_url,metadata)
   VALUES(coalesce(j.payer_user_id,j.homeowner_id),'Review completion photos',
    'Review the current completion photos. After the review deadline, automatic approval may apply if all checks pass.',
    'escrow_approval_request','/homeowner/escrow/approve?escrowId='||e.id::text,
    jsonb_build_object('jobId',j.id,'escrowId',e.id,'completedAt',j.completed_at,'autoApprovalDate',review_deadline));
 ELSIF p_action='inspect' THEN
  UPDATE public.escrow_transactions SET homeowner_inspection_completed=true,homeowner_inspection_at=now(),updated_at=now() WHERE id=e.id;
 ELSE
  UPDATE public.escrow_transactions SET homeowner_approval=false,admin_hold_status='pending_review',
   auto_approval_date=NULL,auto_release_date=NULL,cooling_off_ends_at=NULL,
   release_blocked_reason='Homeowner rejected: '||btrim(p_reason),updated_at=now() WHERE id=e.id;
  INSERT INTO public.homeowner_approval_history(escrow_transaction_id,homeowner_id,action,comments,photos_reviewed)
   VALUES(e.id,p_actor_id,'rejected',btrim(p_reason),coalesce(photos,'[]'::jsonb));
  INSERT INTO public.notifications(user_id,title,message,type,action_url,metadata)
   VALUES(j.contractor_id,'Completion requires review',btrim(p_reason),'escrow_rejected',
    '/contractor/jobs/'||j.id::text,jsonb_build_object('jobId',j.id,'escrowId',e.id,'completedAt',j.completed_at));
 END IF;
 INSERT INTO public.escrow_release_status_log(escrow_transaction_id,status,blocking_reason,created_by)
  VALUES(e.id,CASE p_action WHEN 'request' THEN 'awaiting_homeowner_approval' WHEN 'inspect' THEN 'inspected' ELSE 'admin_review' END,
    CASE WHEN p_action='reject' THEN btrim(p_reason) ELSE 'Completion review: '||p_action END,p_actor_id);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_completion_review(uuid,uuid,uuid,timestamptz,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_completion_review(uuid,uuid,uuid,timestamptz,text,text) TO service_role;
