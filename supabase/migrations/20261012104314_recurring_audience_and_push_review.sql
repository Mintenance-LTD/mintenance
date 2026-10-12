ALTER TABLE public.recurring_schedules
 ADD COLUMN preferred_contractor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 ADD COLUMN notification_audience text NOT NULL DEFAULT 'matching' CHECK (notification_audience IN ('matching','preferred'));
CREATE FUNCTION public.validate_recurring_contractor() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.preferred_contractor_id IS NOT DISTINCT FROM OLD.preferred_contractor_id
   AND NEW.notification_audience IS NOT DISTINCT FROM OLD.notification_audience
   AND NEW.owner_id IS NOT DISTINCT FROM OLD.owner_id THEN RETURN NEW; END IF;
 IF NEW.preferred_contractor_id IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM public.jobs j JOIN public.profiles p ON p.id=j.contractor_id
   WHERE j.homeowner_id=NEW.owner_id AND j.contractor_id=NEW.preferred_contractor_id
     AND j.status='completed' AND p.role='contractor') THEN
   RAISE EXCEPTION 'Choose a contractor previously hired by this property owner' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_recurring_contractor() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_recurring_contractor BEFORE INSERT OR UPDATE ON public.recurring_schedules
FOR EACH ROW EXECUTE FUNCTION public.validate_recurring_contractor();
CREATE OR REPLACE FUNCTION public.create_recurring_schedule_once(
  p_actor_id uuid, p_property_id uuid, p_request_id uuid, p_details jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_owner uuid;
  v_receipt public.recurring_schedule_requests%ROWTYPE;
  v_schedule public.recurring_schedules%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_property_id IS NULL OR p_request_id IS NULL
     OR p_details IS NULL OR jsonb_typeof(p_details) <> 'object' THEN
    RAISE EXCEPTION 'Invalid schedule request' USING ERRCODE = '22023';
  END IF;
  SELECT owner_id INTO v_owner FROM public.properties WHERE id = p_property_id FOR SHARE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Property not found' USING ERRCODE = '42501'; END IF;
  IF v_owner <> p_actor_id AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_actor_id AND role = 'admin'
  ) THEN
    PERFORM 1 FROM public.property_team_members
    WHERE property_id = p_property_id AND user_id = p_actor_id
      AND status = 'accepted' AND role IN ('manager', 'admin') FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Property not found' USING ERRCODE = '42501'; END IF;
  END IF;
  INSERT INTO public.recurring_schedule_requests(actor_id, property_id, request_id, request_payload)
  VALUES (p_actor_id, p_property_id, p_request_id, p_details)
  ON CONFLICT DO NOTHING;
  SELECT * INTO STRICT v_receipt FROM public.recurring_schedule_requests
  WHERE actor_id = p_actor_id AND property_id = p_property_id AND request_id = p_request_id FOR UPDATE;
  IF v_receipt.request_payload <> p_details THEN
    RAISE EXCEPTION 'Request identity already used with different details' USING ERRCODE = '22023';
  END IF;
  IF v_receipt.schedule_id IS NOT NULL THEN
    SELECT * INTO v_schedule FROM public.recurring_schedules WHERE id = v_receipt.schedule_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'This schedule was deleted. Start a new task to create another.' USING ERRCODE = 'P0002';
    END IF;
    RETURN to_jsonb(v_schedule);
  END IF;
  INSERT INTO public.recurring_schedules(property_id, owner_id, title, description,
    task_type, category, frequency, next_due_date, auto_create_job, is_active, preferred_contractor_id, notification_audience)
  VALUES (p_property_id, v_owner, p_details->>'title', p_details->>'description',
    p_details->>'task_type', p_details->>'category', p_details->>'frequency',
    (p_details->>'next_due_date')::date, (p_details->>'auto_create_job')::boolean, true,
    (p_details->>'preferred_contractor_id')::uuid, coalesce(p_details->>'notification_audience','matching'))
  RETURNING * INTO v_schedule;
  UPDATE public.recurring_schedule_requests SET schedule_id = v_schedule.id
  WHERE actor_id = p_actor_id AND property_id = p_property_id AND request_id = p_request_id;
  RETURN to_jsonb(v_schedule);
END;
$$;
REVOKE ALL ON FUNCTION public.create_recurring_schedule_once(uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_recurring_schedule_once(uuid, uuid, uuid, jsonb) TO service_role;

ALTER TABLE public.push_dispatch_attempts DROP CONSTRAINT push_dispatch_attempts_status_check;
ALTER TABLE public.push_dispatch_attempts ADD CONSTRAINT push_dispatch_attempts_status_check
 CHECK (status IN ('started','recorded','needs_review','reviewed_unknown'));
ALTER TABLE public.push_dispatch_attempts
 ADD COLUMN reviewed_at timestamptz,
 ADD COLUMN reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 ADD COLUMN review_note text;
