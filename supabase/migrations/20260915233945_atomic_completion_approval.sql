-- All entry points approve the same completion version under job -> escrow locks.
-- The service role supplies the authenticated actor; public clients cannot call this.
CREATE OR REPLACE FUNCTION public.prevent_completion_confirmation_reversal()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.completion_confirmed_by_homeowner IS TRUE AND NEW.completion_confirmed_by_homeowner IS NOT TRUE THEN
  IF (current_user='postgres' AND OLD.status='completed' AND NEW.status='in_progress'
    AND current_setting('mintenance.rework_job',true)=NEW.id::text) IS NOT TRUE THEN
   RAISE EXCEPTION 'Cannot unconfirm job completion outside the rework transaction'; END IF;
 END IF;
 IF NEW.completion_confirmed_by_homeowner IS TRUE AND OLD.completion_confirmed_by_homeowner IS NOT TRUE
    AND current_user NOT IN('postgres','service_role')
    AND coalesce(NEW.payer_user_id,NEW.homeowner_id) IS DISTINCT FROM auth.uid() THEN
  RAISE EXCEPTION 'Only the designated payer can confirm job completion'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.prevent_completion_confirmation_reversal() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_completion_confirmation_reversal() TO service_role;

CREATE OR REPLACE FUNCTION public.approve_job_completion(
 p_job_id uuid, p_actor_id uuid, p_expected_completed_at timestamptz,
 p_escrow_id uuid DEFAULT NULL, p_comments text DEFAULT NULL,
 p_automatic boolean DEFAULT false, p_waive_cooling_off boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE j public.jobs%ROWTYPE; e public.escrow_transactions%ROWTYPE;
 photo_urls jsonb; last_rework timestamptz; cooling_until timestamptz; notification_id uuid;
BEGIN
 IF p_actor_id IS NULL OR coalesce(length(p_comments),0)>5000 OR
    p_automatic IS NULL OR p_waive_cooling_off IS NULL OR
    (p_automatic AND p_waive_cooling_off) THEN
  RAISE EXCEPTION 'Invalid approval request' USING ERRCODE='23514'; END IF;
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job not found' USING ERRCODE='P0002'; END IF;
 IF coalesce(j.payer_user_id,j.homeowner_id) IS DISTINCT FROM p_actor_id THEN
  RAISE EXCEPTION 'Only the designated payer can approve completion' USING ERRCODE='42501'; END IF;
 IF j.status<>'completed' OR j.completed_at IS DISTINCT FROM p_expected_completed_at OR j.contractor_id IS NULL THEN
  RAISE EXCEPTION 'The job completion changed. Refresh before approving.' USING ERRCODE='23514'; END IF;
 SELECT * INTO e FROM public.escrow_transactions WHERE job_id=j.id ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No payment record found' USING ERRCODE='P0002'; END IF;
 IF (p_escrow_id IS NOT NULL AND p_escrow_id<>e.id) OR e.payee_id IS DISTINCT FROM j.contractor_id THEN
  RAISE EXCEPTION 'The payment record changed. Refresh before approving.' USING ERRCODE='23514'; END IF;

 -- A lost response must not extend the cooling-off window or create duplicate evidence.
 IF e.homeowner_approval IS TRUE AND j.completion_confirmed_by_homeowner IS TRUE THEN
  IF p_waive_cooling_off AND e.cooling_off_ends_at IS NOT NULL THEN
   RAISE EXCEPTION 'Completion is already approved with a cooling-off period' USING ERRCODE='23514'; END IF;
  RETURN jsonb_build_object('applied',false,'escrowId',e.id,'amount',e.amount,
    'coolingOffEndsAt',e.cooling_off_ends_at,'notificationId',NULL);
 END IF;
 IF e.status NOT IN('held','awaiting_homeowner_approval') OR
    coalesce(e.admin_hold_status,'none') NOT IN('none','admin_approved') OR EXISTS(
      SELECT 1 FROM public.disputes WHERE job_id=j.id AND status IN('open','under_review','pending')) THEN
  RAISE EXCEPTION 'The payment is not available for approval' USING ERRCODE='23514'; END IF;
 IF p_automatic AND (e.auto_release_enabled IS NOT TRUE OR e.auto_approval_date IS NULL OR
    e.auto_approval_date>now() OR e.photo_verification_status IS DISTINCT FROM 'verified' OR
    coalesce(e.photo_verification_score,0)<0.7) THEN
  RAISE EXCEPTION 'Automatic approval is not eligible' USING ERRCODE='23514'; END IF;

 SELECT max(created_at) INTO last_rework FROM public.job_rework_requests WHERE job_id=j.id;
 -- Lock the evidence we record, and exclude unverified/legacy-null and previous-cycle photos.
 SELECT jsonb_agg(p.photo_url ORDER BY p.id) INTO photo_urls FROM (
  SELECT id,photo_url FROM public.job_photos_metadata WHERE job_id=j.id AND photo_type='after'
    AND verified IS TRUE AND (last_rework IS NULL OR created_at>last_rework) FOR SHARE
 ) p;
 IF photo_urls IS NULL THEN
  RAISE EXCEPTION 'Verified after-photos are required for this completion' USING ERRCODE='23514'; END IF;

 cooling_until:=CASE WHEN p_waive_cooling_off THEN NULL ELSE now()+interval '48 hours' END;
 UPDATE public.jobs SET completion_confirmed_by_homeowner=true,completion_confirmed_at=now(),updated_at=now() WHERE id=j.id;
 UPDATE public.escrow_transactions SET status='held',homeowner_approval=true,homeowner_approval_at=now(),
  homeowner_inspection_completed=NOT p_automatic,homeowner_inspection_at=CASE WHEN p_automatic THEN NULL ELSE now() END,
  cooling_off_ends_at=cooling_until,auto_approval_date=NULL,auto_release_date=coalesce(cooling_until,now()),
  release_reason=CASE WHEN p_automatic THEN 'auto_approved' ELSE 'homeowner_approved' END,
  release_blocked_reason=CASE WHEN p_waive_cooling_off THEN NULL ELSE 'Cooling-off period active (48 hours)' END,
  updated_at=now() WHERE id=e.id;
 INSERT INTO public.homeowner_approval_history(escrow_transaction_id,homeowner_id,action,comments,photos_reviewed)
  VALUES(e.id,p_actor_id,'approved',p_comments,photo_urls);
 INSERT INTO public.escrow_release_status_log(escrow_transaction_id,status,blocking_reason,next_action,estimated_release_date,created_by)
  VALUES(e.id,CASE WHEN p_waive_cooling_off THEN 'approved' ELSE 'cooling_off' END,
    CASE WHEN p_automatic THEN 'Automatic completion approval' ELSE 'Homeowner approved completion' END,
    'Await payment release checks',coalesce(cooling_until,now()),p_actor_id);
 INSERT INTO public.notifications(user_id,title,message,type,action_url,metadata)
  VALUES(j.contractor_id,'Completion approved',
    CASE WHEN p_waive_cooling_off THEN 'Work is approved. Payment release is subject to final checks.'
    ELSE 'Work is approved. Payment can be released after the 48-hour cooling-off period, subject to final checks.' END,
    'escrow_approved','/contractor/jobs/'||j.id::text,
    jsonb_build_object('jobId',j.id,'escrowId',e.id,'completedAt',j.completed_at,'automatic',p_automatic))
  RETURNING id INTO notification_id;
 RETURN jsonb_build_object('applied',true,'escrowId',e.id,'amount',e.amount,
    'coolingOffEndsAt',cooling_until,'notificationId',notification_id);
END $$;
REVOKE ALL ON FUNCTION public.approve_job_completion(uuid,uuid,timestamptz,uuid,text,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.approve_job_completion(uuid,uuid,timestamptz,uuid,text,boolean,boolean) TO service_role;

-- Lock the same job/escrow rows as refunds and return the principal from that
-- serialization point. A read before an independent status CAS can be stale
-- after a concurrent refund completes and restores status='held'.
CREATE OR REPLACE FUNCTION public.claim_escrow_release(
 p_escrow_id uuid, p_release_reason text, p_reconciliation_id uuid
) RETURNS TABLE(escrow_id uuid, remaining_minor integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.escrow_transactions; j public.jobs; b public.escrow_refund_balances;
 job_key uuid; available integer;
BEGIN
 SELECT job_id INTO job_key FROM public.escrow_transactions WHERE id=p_escrow_id;
 IF job_key IS NULL THEN RETURN; END IF;
 SELECT * INTO j FROM public.jobs WHERE id=job_key FOR UPDATE;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR e.job_id IS DISTINCT FROM j.id OR e.status<>'held' THEN RETURN; END IF;
 IF j.status<>'completed' OR e.payee_id IS DISTINCT FROM j.contractor_id OR
    p_release_reason IS NULL OR p_release_reason='refund_pending' OR p_reconciliation_id IS NULL THEN
  RAISE EXCEPTION 'Escrow release prerequisites changed' USING ERRCODE='23514';
 END IF;
 -- Recheck the decision at the money claim, not only in earlier API/agent reads.
 IF e.homeowner_approval IS NOT TRUE OR e.cooling_off_ends_at>now() OR
    coalesce(e.admin_hold_status,'none') NOT IN('none','admin_approved') OR EXISTS(
     SELECT 1 FROM public.disputes WHERE job_id=j.id AND status IN('open','under_review','pending')) OR
    (p_release_reason='auto_release' AND (e.auto_release_enabled IS NOT TRUE OR
      e.auto_release_date IS NULL OR e.auto_release_date>now())) THEN
  RAISE EXCEPTION 'Completion approval or release conditions changed' USING ERRCODE='23514'; END IF;
 SELECT * INTO b FROM public.escrow_refund_balances WHERE escrow_refund_balances.escrow_id=e.id;
 IF FOUND THEN
  IF b.needs_review OR b.gross_minor<>round(e.amount*100) OR EXISTS(
   SELECT 1 FROM public.escrow_refund_operations r WHERE r.escrow_id=e.id
    AND r.state IN('reserved','pending','requires_action','reconciliation_required')
  ) THEN RAISE EXCEPTION 'Refund requires reconciliation before release' USING ERRCODE='23514'; END IF;
  available:=b.remaining_minor;
 ELSE available:=round(e.amount*100); END IF;
 IF available IS NULL OR available<=0 THEN
  RAISE EXCEPTION 'No funded principal remains for release' USING ERRCODE='23514'; END IF;
 UPDATE public.escrow_transactions SET status='release_pending',release_reason=p_release_reason,
  reconciliation_id=p_reconciliation_id,transfer_attempted_at=now(),updated_at=now() WHERE id=e.id;
 RETURN QUERY SELECT e.id,available;
END $$;
REVOKE ALL ON FUNCTION public.claim_escrow_release(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_escrow_release(uuid,text,uuid) TO service_role;
