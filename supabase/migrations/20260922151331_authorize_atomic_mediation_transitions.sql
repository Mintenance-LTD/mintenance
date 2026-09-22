-- No payment settlement occurs here. Every action serializes against job/escrow
-- settlement and persists its notification and audit trail in the same transaction.
CREATE OR REPLACE FUNCTION public.transition_dispute_mediation(
 p_escrow_id uuid,p_actor_id uuid,p_action text,p_scheduled_at timestamptz DEFAULT NULL,
 p_mediator_id uuid DEFAULT NULL,p_outcome text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.escrow_transactions%ROWTYPE; j public.jobs%ROWTYPE;
 job_key uuid; actor_admin boolean; changed boolean:=false;
BEGIN
 SELECT role='admin' INTO actor_admin FROM public.profiles WHERE id=p_actor_id AND deleted_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current account required' USING ERRCODE='42501'; END IF;
 actor_admin:=coalesce(actor_admin,false);
 IF p_action IS NULL OR p_action NOT IN('request','schedule','complete') THEN
  RAISE EXCEPTION 'Invalid mediation action' USING ERRCODE='23514'; END IF;
 SELECT job_id INTO job_key FROM public.escrow_transactions WHERE id=p_escrow_id;
 SELECT * INTO j FROM public.jobs WHERE id=job_key FOR UPDATE;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR j.id IS NULL OR e.job_id IS DISTINCT FROM j.id THEN
  RAISE EXCEPTION 'Dispute not found' USING ERRCODE='P0002'; END IF;
 IF NOT actor_admin AND (p_action<>'request' OR
   (p_actor_id IS DISTINCT FROM e.payer_id AND p_actor_id IS DISTINCT FROM e.payee_id AND
    NOT (p_actor_id IS NOT DISTINCT FROM j.homeowner_id AND e.payee_id IS NOT DISTINCT FROM j.contractor_id
      AND e.payer_id IS NOT DISTINCT FROM coalesce(j.payer_user_id,j.homeowner_id)))) THEN
  RAISE EXCEPTION 'Not authorized for mediation action' USING ERRCODE='42501'; END IF;
 IF e.status<>'disputed' THEN RAISE EXCEPTION 'Dispute is not open' USING ERRCODE='23514'; END IF;
 IF p_action='request' THEN
  IF e.mediation_requested IS NOT TRUE THEN
   UPDATE public.escrow_transactions SET mediation_requested=true,mediation_requested_by=p_actor_id,
    mediation_requested_at=now(),mediation_status='pending',updated_at=now() WHERE id=e.id RETURNING * INTO e;
   INSERT INTO public.notifications(user_id,title,message,type,action_url,metadata)
    SELECT id,'Mediation requested','A dispute has a new mediation request. Review it in the disputes dashboard.',
     'mediation_request','/admin/disputes',jsonb_build_object('escrowId',e.id,'jobId',j.id)
    FROM public.profiles WHERE role='admin' AND deleted_at IS NULL;
   changed:=true;
  ELSIF e.mediation_status NOT IN('pending','scheduled','in_progress','completed') OR e.mediation_status IS NULL THEN
   RAISE EXCEPTION 'Existing mediation requires review' USING ERRCODE='23514';
  END IF;
 ELSIF p_action='schedule' THEN
  IF p_scheduled_at IS NULL OR p_mediator_id IS NULL OR
   NOT EXISTS(SELECT FROM public.profiles WHERE id=p_mediator_id AND deleted_at IS NULL) THEN
   RAISE EXCEPTION 'A valid schedule and mediator are required' USING ERRCODE='23514'; END IF;
  IF e.mediation_status='scheduled' AND e.mediation_scheduled_at=p_scheduled_at AND e.mediation_mediator_id=p_mediator_id THEN
   NULL;
  ELSIF e.mediation_requested IS TRUE AND e.mediation_status IN('pending','scheduled') AND p_scheduled_at>now() THEN
   UPDATE public.escrow_transactions SET mediation_scheduled_at=p_scheduled_at,mediation_mediator_id=p_mediator_id,
    mediation_status='scheduled',updated_at=now() WHERE id=e.id RETURNING * INTO e;
   changed:=true;
  ELSE RAISE EXCEPTION 'Mediation cannot be scheduled in its current state' USING ERRCODE='23514'; END IF;
 ELSE
  IF p_outcome IS NULL OR length(btrim(p_outcome)) NOT BETWEEN 5 AND 5000 THEN
   RAISE EXCEPTION 'A mediation outcome is required' USING ERRCODE='23514'; END IF;
  IF e.mediation_status='completed' AND e.mediation_outcome=btrim(p_outcome) THEN NULL;
  ELSIF e.mediation_status IN('scheduled','in_progress') AND e.mediation_scheduled_at<=now() THEN
   UPDATE public.escrow_transactions SET mediation_status='completed',mediation_outcome=btrim(p_outcome),
    mediation_completed_at=now(),updated_at=now() WHERE id=e.id RETURNING * INTO e;
   changed:=true;
  ELSE RAISE EXCEPTION 'Mediation cannot be completed in its current state' USING ERRCODE='23514'; END IF;
 END IF;
 IF changed THEN
  IF p_action<>'request' THEN
   INSERT INTO public.notifications(user_id,title,message,type,action_url,metadata)
    SELECT recipient,'Mediation updated','The mediation record has been updated. View the dispute for details.',
     'mediation_request','/disputes/'||e.id::text,jsonb_build_object('escrowId',e.id,'jobId',j.id,'mediationStatus',e.mediation_status)
    FROM (SELECT DISTINCT unnest(ARRAY[e.payer_id,e.payee_id,j.homeowner_id]) AS recipient) parties WHERE recipient IS NOT NULL;
  END IF;
  INSERT INTO public.audit_logs(user_id,table_name,record_id,action,new_values)
   VALUES(p_actor_id,'escrow_transactions',e.id,'UPDATE',jsonb_build_object('event','MEDIATION_'||upper(p_action),
     'mediationStatus',e.mediation_status,'scheduledAt',e.mediation_scheduled_at,'mediatorId',e.mediation_mediator_id));
 END IF;
 RETURN jsonb_build_object('escrowId',e.id,'status',e.mediation_status,'requestedAt',e.mediation_requested_at,
  'scheduledAt',e.mediation_scheduled_at,'completedAt',e.mediation_completed_at);
END $$;
REVOKE ALL ON FUNCTION public.transition_dispute_mediation(uuid,uuid,text,timestamptz,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.transition_dispute_mediation(uuid,uuid,text,timestamptz,uuid,text) TO service_role;
