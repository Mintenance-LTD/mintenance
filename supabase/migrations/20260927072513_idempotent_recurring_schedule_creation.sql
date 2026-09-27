-- Create the schedule and retry receipt atomically. Receipts survive schedule
-- deletion so a delayed retry cannot recreate a deliberately deleted task.
CREATE TABLE public.recurring_schedule_requests (
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  request_payload jsonb NOT NULL,
  schedule_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, property_id, request_id)
);
ALTER TABLE public.recurring_schedule_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recurring_schedule_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.recurring_schedule_requests TO service_role;
CREATE INDEX recurring_schedule_requests_property_idx ON public.recurring_schedule_requests(property_id);

CREATE FUNCTION public.create_recurring_schedule_once(
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
    task_type, category, frequency, next_due_date, auto_create_job, is_active)
  VALUES (p_property_id, v_owner, p_details->>'title', p_details->>'description',
    p_details->>'task_type', p_details->>'category', p_details->>'frequency',
    (p_details->>'next_due_date')::date, (p_details->>'auto_create_job')::boolean, true)
  RETURNING * INTO v_schedule;
  UPDATE public.recurring_schedule_requests SET schedule_id = v_schedule.id
  WHERE actor_id = p_actor_id AND property_id = p_property_id AND request_id = p_request_id;
  RETURN to_jsonb(v_schedule);
END;
$$;
REVOKE ALL ON FUNCTION public.create_recurring_schedule_once(uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_recurring_schedule_once(uuid, uuid, uuid, jsonb) TO service_role;
