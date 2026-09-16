CREATE OR REPLACE FUNCTION public.create_dispute_atomic(
 p_escrow_id uuid,p_raised_by uuid,p_against uuid,p_reason text,p_description text
) RETURNS TABLE(dispute_id uuid,job_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.escrow_transactions%ROWTYPE; j public.jobs%ROWTYPE; existing_id uuid; target_job uuid;
BEGIN
 SELECT x.job_id INTO target_job FROM public.escrow_transactions x WHERE x.id=p_escrow_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO j FROM public.jobs WHERE id=target_job FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR e.job_id IS DISTINCT FROM j.id THEN RAISE EXCEPTION 'Escrow changed' USING ERRCODE='23514'; END IF;
 IF p_raised_by IS NULL OR (p_raised_by IS DISTINCT FROM e.payer_id AND p_raised_by IS DISTINCT FROM e.payee_id) THEN
 RAISE EXCEPTION 'Not authorized to dispute escrow' USING ERRCODE='42501'; END IF;
 IF p_against IS NULL OR p_against=p_raised_by OR (p_against IS DISTINCT FROM e.payer_id AND p_against IS DISTINCT FROM e.payee_id) THEN
 RAISE EXCEPTION 'Invalid dispute participant' USING ERRCODE='23514'; END IF;
 IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 1 AND 2000 OR p_description IS NULL OR length(p_description)>60000 THEN
 RAISE EXCEPTION 'Invalid dispute details' USING ERRCODE='23514'; END IF;
 IF e.status='disputed' THEN
 SELECT d.id INTO existing_id FROM public.disputes d WHERE d.job_id=j.id AND d.raised_by=p_raised_by
  AND d.against=p_against AND d.reason=p_reason AND d.description=p_description
  AND d.status IN('open','under_review','pending') ORDER BY d.created_at DESC,d.id DESC LIMIT 1;
 IF FOUND THEN RETURN QUERY SELECT existing_id,j.id; RETURN; END IF;
 END IF;
 IF e.status NOT IN('held','awaiting_homeowner_approval') THEN
 RAISE EXCEPTION 'Escrow is not eligible for a new dispute' USING ERRCODE='23514'; END IF;
 UPDATE public.escrow_transactions SET status='disputed',admin_hold_status='pending_review',auto_approval_date=NULL,auto_release_date=NULL,
  sla_deadline=NULL,dispute_priority=NULL,escalation_level=0,
  release_blocked_reason='Dispute requires resolution',updated_at=now() WHERE id=e.id;
 INSERT INTO public.disputes(job_id,raised_by,against,reason,description,status)
 VALUES(j.id,p_raised_by,p_against,p_reason,p_description,'open') RETURNING id INTO existing_id;
 RETURN QUERY SELECT existing_id,j.id;
END $$;
REVOKE ALL ON FUNCTION public.create_dispute_atomic(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_dispute_atomic(uuid,uuid,uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.create_dispute_with_priority(
 p_escrow_id uuid,p_raised_by uuid,p_against uuid,p_reason text,p_description text,p_priority text
) RETURNS TABLE(dispute_id uuid,job_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result record; deadline_hours integer;
BEGIN
 deadline_hours:=CASE p_priority WHEN 'low' THEN 336 WHEN 'medium' THEN 168 WHEN 'high' THEN 72 WHEN 'critical' THEN 24 ELSE NULL END;
 IF deadline_hours IS NULL THEN RAISE EXCEPTION 'Invalid dispute priority' USING ERRCODE='23514'; END IF;
 SELECT * INTO result FROM public.create_dispute_atomic(p_escrow_id,p_raised_by,p_against,p_reason,p_description);
 -- The underlying call holds the escrow lock until this transaction commits.
 -- Replay preserves the original deadline and any escalation already applied.
 UPDATE public.escrow_transactions SET dispute_priority=p_priority,
  sla_deadline=now()+make_interval(hours=>deadline_hours),escalation_level=0
 WHERE id=p_escrow_id AND status='disputed' AND sla_deadline IS NULL;
 RETURN QUERY SELECT result.dispute_id,result.job_id;
END $$;
REVOKE ALL ON FUNCTION public.create_dispute_with_priority(uuid,uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_dispute_with_priority(uuid,uuid,uuid,text,text,text) TO service_role;
