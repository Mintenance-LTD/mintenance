CREATE OR REPLACE FUNCTION "public"."validate_job_status_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Only validate when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only the trusted transaction with an exact open dispute may enter this state.
  IF NEW.status='disputed' AND OLD.status IN('completed','in_progress') AND current_user='postgres'
    AND EXISTS(SELECT FROM public.disputes d JOIN public.dispute_escrow_links l ON l.dispute_id=d.id
      JOIN public.escrow_transactions e ON e.id=l.escrow_id
      WHERE d.job_id=NEW.id AND e.job_id=NEW.id AND e.status='disputed'
        AND d.status IN('open','under_review','pending')) THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  CASE OLD.status
    WHEN 'draft' THEN
      IF NEW.status NOT IN ('posted', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'open' THEN
      IF NEW.status NOT IN ('posted', 'assigned', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'posted' THEN
      IF NEW.status NOT IN ('assigned', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'assigned' THEN
      IF NEW.status NOT IN ('in_progress', 'cancelled', 'posted') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'in_progress' THEN
      IF NEW.status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'completed' THEN
      IF NEW.status = 'in_progress' AND current_user = 'postgres'
         AND current_setting('mintenance.rework_job', true) = NEW.id::text THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Cannot transition from completed status';
    WHEN 'cancelled' THEN
      -- Cancelled is a terminal state
      RAISE EXCEPTION 'Cannot transition from cancelled status';
    ELSE
      -- Unknown status — allow (for backward compatibility)
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

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
 IF p_raised_by IS NULL OR (p_raised_by IS DISTINCT FROM e.payer_id AND p_raised_by IS DISTINCT FROM e.payee_id
   AND NOT (p_raised_by IS NOT DISTINCT FROM j.homeowner_id AND p_against IS NOT DISTINCT FROM e.payee_id
     AND e.payee_id IS NOT DISTINCT FROM j.contractor_id
     AND e.payer_id IS NOT DISTINCT FROM coalesce(j.payer_user_id,j.homeowner_id))) THEN
 RAISE EXCEPTION 'Not authorized to dispute escrow' USING ERRCODE='42501'; END IF;
 IF p_against IS NULL OR p_against=p_raised_by OR (p_against IS DISTINCT FROM e.payer_id AND p_against IS DISTINCT FROM e.payee_id) THEN
 RAISE EXCEPTION 'Invalid dispute participant' USING ERRCODE='23514'; END IF;
 IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 1 AND 2000 OR p_description IS NULL OR length(p_description)>60000 THEN
 RAISE EXCEPTION 'Invalid dispute details' USING ERRCODE='23514'; END IF;
 IF e.status='disputed' THEN
 SELECT d.id INTO existing_id FROM public.disputes d JOIN public.dispute_escrow_links l ON l.dispute_id=d.id
  WHERE l.escrow_id=e.id AND d.job_id=j.id AND d.raised_by=p_raised_by
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
 INSERT INTO public.dispute_escrow_links(dispute_id,escrow_id) VALUES(existing_id,e.id);
 RETURN QUERY SELECT existing_id,j.id;
END $$;
REVOKE ALL ON FUNCTION public.create_dispute_atomic(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_dispute_atomic(uuid,uuid,uuid,text,text) TO service_role;

-- Preserve the claimant and refuse ambiguous payments. Lock order: job, escrow.
CREATE OR REPLACE FUNCTION public.create_customer_job_dispute(p_job_id uuid,p_actor_id uuid,p_reason text,p_category text)
RETURNS TABLE(dispute_id uuid,job_id uuid,escrow_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE j public.jobs%ROWTYPE; candidate_ids uuid[]; result record;
BEGIN
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job not found' USING ERRCODE='P0002'; END IF;
 IF p_actor_id IS NULL OR (p_actor_id IS DISTINCT FROM j.homeowner_id AND p_actor_id IS DISTINCT FROM j.payer_user_id)
   OR NOT EXISTS(SELECT FROM public.profiles WHERE id=p_actor_id AND deleted_at IS NULL) THEN
  RAISE EXCEPTION 'Current customer required' USING ERRCODE='42501'; END IF;
 IF j.status NOT IN('in_progress','completed','disputed') OR j.contractor_id IS NULL THEN
  RAISE EXCEPTION 'Job is not eligible for dispute' USING ERRCODE='23514'; END IF;
 IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 20 AND 2000 OR p_category IS NULL OR
    p_category NOT IN('quality','incomplete','damage','different_from_agreed','other') THEN
  RAISE EXCEPTION 'Invalid dispute details' USING ERRCODE='23514'; END IF;
 SELECT array_agg(e.id ORDER BY e.id) INTO candidate_ids FROM public.escrow_transactions e
  WHERE e.job_id=j.id AND e.payer_id=coalesce(j.payer_user_id,j.homeowner_id) AND e.payee_id=j.contractor_id
    AND e.status IN('held','awaiting_homeowner_approval','disputed');
 IF coalesce(cardinality(candidate_ids),0)<>1 THEN
  RAISE EXCEPTION 'A single eligible escrow is required' USING ERRCODE='23514'; END IF;
 SELECT * INTO result FROM public.create_dispute_atomic(candidate_ids[1],p_actor_id,j.contractor_id,
   btrim(p_reason),'Category: '||p_category);
 IF j.status<>'disputed' THEN
  UPDATE public.jobs SET status='disputed',updated_at=now() WHERE id=j.id;
  INSERT INTO public.notifications(user_id,title,message,type,action_url,metadata)
   SELECT recipient,coalesce(j.title,'Job')||' — dispute opened',
    'A dispute has been opened. Payment release is paused while it is reviewed.','job_disputed',
    '/disputes/'||candidate_ids[1]::text,
    jsonb_build_object('jobId',j.id,'escrowId',candidate_ids[1],'disputeId',result.dispute_id)
   FROM (SELECT DISTINCT unnest(ARRAY[j.homeowner_id,j.payer_user_id,j.contractor_id]) AS recipient) parties
   WHERE recipient IS NOT NULL;
 END IF;
 RETURN QUERY SELECT result.dispute_id,j.id,candidate_ids[1];
END $$;
REVOKE ALL ON FUNCTION public.create_customer_job_dispute(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_job_dispute(uuid,uuid,text,text) TO service_role;

