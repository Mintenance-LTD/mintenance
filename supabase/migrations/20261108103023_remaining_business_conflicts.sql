-- Release compatible API mappings before applying this function-only migration.
-- Deterministic stale state/lease conflicts must not trigger serialization retries.
-- Seven SQLSTATE substitutions only; preserve bodies, grants, locks and side effects.
-- Property follow-up is already covered by 20261108005044; do not overwrite it.
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.finish_account_cleanup_step(p_step_id uuid,p_lease_token uuid,p_outcome text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF p_outcome NOT IN ('completed','retry','needs_review') THEN RAISE EXCEPTION 'Invalid cleanup outcome' USING ERRCODE='23514'; END IF;
 UPDATE public.account_deletion_cleanup_steps SET
  status=CASE WHEN p_outcome='retry' THEN 'pending' ELSE p_outcome END,
  completed_at=CASE WHEN p_outcome='completed' THEN clock_timestamp() ELSE NULL END,
  last_outcome=p_outcome,lease_token=NULL,lease_expires_at=NULL,
  next_attempt_at=clock_timestamp()+make_interval(secs=>least(3600,30*power(2,least(attempts,7)))::integer)
 WHERE id=p_step_id AND status='pending' AND lease_token=p_lease_token AND lease_expires_at>clock_timestamp();
 IF NOT FOUND THEN RAISE EXCEPTION 'Cleanup lease expired or replaced' USING ERRCODE='PT409'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.review_retained_evidence(p_admin_id uuid,p_kind text,p_record_id uuid,
 p_expected_revision integer,p_legal_hold boolean,p_reason text,p_review_due_at timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE current_revision integer; next_revision integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_admin_id AND role='admin' AND deleted_at IS NULL) THEN
  RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 IF p_kind IS NULL OR p_kind NOT IN ('contract','dispute') OR p_expected_revision IS NULL OR p_expected_revision<0
  OR p_legal_hold IS NULL OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 1000
  OR p_review_due_at IS NULL OR p_review_due_at<=clock_timestamp() OR p_review_due_at>clock_timestamp()+interval '366 days'
  OR (p_legal_hold AND p_review_due_at>clock_timestamp()+interval '90 days') THEN
  RAISE EXCEPTION 'Invalid review decision' USING ERRCODE='22023'; END IF;
 -- Lock the immutable source even for the first review: concurrent first decisions serialize.
 IF p_kind='contract' THEN
  PERFORM 1 FROM public.retained_contract_records WHERE contract_id=p_record_id FOR UPDATE;
 ELSE
  PERFORM 1 FROM public.retained_dispute_records WHERE dispute_id=p_record_id FOR UPDATE;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Record not found' USING ERRCODE='P0002'; END IF;
 SELECT revision INTO current_revision FROM public.evidence_retention_reviews WHERE record_kind=p_kind AND record_id=p_record_id;
 IF coalesce(current_revision,0)<>p_expected_revision THEN RAISE EXCEPTION 'Review changed; reload' USING ERRCODE='PT409'; END IF;
 next_revision:=coalesce(current_revision,0)+1;
 INSERT INTO public.evidence_retention_reviews(record_kind,record_id,revision,legal_hold,reason,review_due_at,reviewed_by)
 VALUES(p_kind,p_record_id,next_revision,p_legal_hold,btrim(p_reason),p_review_due_at,p_admin_id)
 ON CONFLICT(record_kind,record_id) DO UPDATE SET revision=excluded.revision,legal_hold=excluded.legal_hold,
  reason=excluded.reason,review_due_at=excluded.review_due_at,reviewed_by=excluded.reviewed_by,reviewed_at=clock_timestamp();
 INSERT INTO public.evidence_retention_review_log(record_kind,record_id,revision,legal_hold,reason,review_due_at,actor_id)
 VALUES(p_kind,p_record_id,next_revision,p_legal_hold,btrim(p_reason),p_review_due_at,p_admin_id);
 IF p_kind='contract' THEN
  UPDATE public.retained_contract_records SET requires_retention_review=false,review_due_at=p_review_due_at WHERE contract_id=p_record_id;
 ELSE
  UPDATE public.retained_dispute_records SET requires_retention_review=false,review_due_at=p_review_due_at WHERE dispute_id=p_record_id;
 END IF;
 RETURN next_revision;
END $$;

CREATE OR REPLACE FUNCTION public.schedule_retained_evidence_disposal(p_admin_id uuid,p_kind text,p_record_id uuid,
 p_expected_revision integer,p_scheduled_for timestamptz,p_reason text,p_inventory_reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.evidence_retention_reviews%ROWTYPE; existing public.evidence_disposal_requests%ROWTYPE; result uuid; needs_review boolean; retain_until timestamptz;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_admin_id AND role='admin' AND deleted_at IS NULL) THEN
  RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 IF p_kind IS NULL OR p_kind NOT IN ('contract','dispute') OR p_expected_revision IS NULL OR p_expected_revision<1
  OR p_scheduled_for IS NULL
  OR p_scheduled_for>clock_timestamp()+interval '10 years'
  OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 1000
  OR p_inventory_reference IS NULL OR length(btrim(p_inventory_reference)) NOT BETWEEN 5 AND 200 THEN
  RAISE EXCEPTION 'Invalid disposal decision' USING ERRCODE='22023'; END IF;
 -- Same first lock as review/hold decisions. Never lock a queue row before its source.
 IF p_kind='contract' THEN
  SELECT requires_retention_review,retention_until INTO needs_review,retain_until FROM public.retained_contract_records WHERE contract_id=p_record_id FOR UPDATE;
 ELSE
  SELECT requires_retention_review INTO needs_review FROM public.retained_dispute_records WHERE dispute_id=p_record_id FOR UPDATE;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Record not found' USING ERRCODE='P0002'; END IF;
 IF retain_until IS NOT NULL AND p_scheduled_for<retain_until THEN RAISE EXCEPTION 'Retention period has not ended' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM public.evidence_retention_reviews WHERE record_kind=p_kind AND record_id=p_record_id;
 IF NOT FOUND OR r.revision<>p_expected_revision OR r.legal_hold OR needs_review THEN
  RAISE EXCEPTION 'Review changed or record remains held/unclassified' USING ERRCODE='PT409'; END IF;
 SELECT * INTO existing FROM public.evidence_disposal_requests WHERE record_kind=p_kind AND record_id=p_record_id AND status IN ('scheduled','needs_reconciliation') FOR UPDATE;
 IF FOUND THEN
  IF existing.status='scheduled' AND existing.review_revision=p_expected_revision AND existing.scheduled_for=p_scheduled_for
   AND existing.reason=btrim(p_reason) AND existing.inventory_reference=btrim(p_inventory_reference) AND existing.requested_by=p_admin_id THEN
   RETURN existing.id;
  END IF;
  RAISE EXCEPTION 'Disposal decision already exists; reconcile before scheduling again' USING ERRCODE='PT409';
 END IF;
 IF p_scheduled_for<clock_timestamp()+interval '24 hours' THEN RAISE EXCEPTION 'Disposal requires 24 hours notice' USING ERRCODE='22023'; END IF;
 INSERT INTO public.evidence_disposal_requests(record_kind,record_id,review_revision,scheduled_for,reason,inventory_reference,requested_by)
 VALUES(p_kind,p_record_id,p_expected_revision,p_scheduled_for,btrim(p_reason),btrim(p_inventory_reference),p_admin_id) RETURNING id INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.respond_to_visit(p_actor uuid,p_id uuid,p_date date,p_start time,p_end time,p_response text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE a public.appointments%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public.appointments WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.client_id IS DISTINCT FROM p_actor THEN RAISE EXCEPTION 'Visit unavailable' USING ERRCODE='42501'; END IF;
 IF a.status NOT IN ('scheduled','confirmed','rescheduled') OR a.appointment_date IS DISTINCT FROM p_date OR a.start_time IS DISTINCT FROM p_start OR a.end_time IS DISTINCT FROM p_end THEN RAISE EXCEPTION 'Visit changed; reload' USING ERRCODE='PT409'; END IF;
 IF p_response NOT IN ('confirmed','change_requested') THEN RAISE EXCEPTION 'Invalid response' USING ERRCODE='22023'; END IF;
 IF a.client_response=p_response THEN RETURN; END IF;
 UPDATE public.appointments SET client_response=p_response,client_response_at=now() WHERE id=p_id;
 INSERT INTO public.notification_queue(user_id,notification_type,priority,title,message,action_url,metadata,scheduled_for)
 VALUES(a.contractor_id,'appointment_update','medium','Visit response received',CASE WHEN p_response='confirmed' THEN 'The client confirmed the visit.' ELSE 'The client requested a different visit time.' END,'/contractor/appointments',jsonb_build_object('appointmentId',p_id),now());
END $$;

CREATE OR REPLACE FUNCTION public.update_property_tenancy_folder(p_actor uuid,p_property uuid,p_folder uuid,p_revision integer,p_label text,p_starts date,p_ends date)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 PERFORM public.require_property_inspection_editor(p_actor,p_property);
 UPDATE public.property_tenancy_folders SET label=btrim(p_label),starts_on=p_starts,ends_on=p_ends,revision=revision+1
 WHERE id=p_folder AND property_id=p_property AND revision=p_revision RETURNING id INTO v_id;
 IF v_id IS NULL THEN RAISE EXCEPTION 'Folder changed; reload before saving' USING ERRCODE='PT409'; END IF;
 RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.update_support_case(p_ticket uuid,p_actor uuid,p_revision integer,p_status text,p_assigned uuid,p_priority text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE t public.support_tickets%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND role='admin' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 SELECT * INTO t FROM public.support_tickets WHERE id=p_ticket FOR UPDATE;
 IF t.id IS NULL OR t.revision<>p_revision THEN RAISE EXCEPTION 'Case changed' USING ERRCODE='PT409'; END IF;
 IF p_status NOT IN ('open','in_progress','resolved','closed') OR p_priority NOT IN ('low','normal','high','urgent') OR length(trim(p_reason)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid update' USING ERRCODE='23514'; END IF;
 IF p_assigned IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.support_operator_settings s ON s.admin_id=p.id WHERE p.id=p_assigned AND p.role='admin' AND p.deleted_at IS NULL AND s.available) THEN RAISE EXCEPTION 'Assignee unavailable' USING ERRCODE='23514'; END IF;
 UPDATE public.support_tickets SET status=p_status,assigned_to=p_assigned,priority=p_priority,revision=revision+1,updated_at=now() WHERE id=p_ticket RETURNING * INTO t;
 INSERT INTO public.support_case_events(ticket_id,actor_id,action,details) VALUES(p_ticket,p_actor,'updated',jsonb_build_object('status',p_status,'assigned_to',p_assigned,'priority',p_priority,'reason',p_reason));
 RETURN to_jsonb(t);
END $$;
