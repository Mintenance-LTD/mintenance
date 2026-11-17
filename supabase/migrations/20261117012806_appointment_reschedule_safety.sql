-- Serialize overlapping visit writes, including inserts that race rescheduling.
CREATE FUNCTION public.guard_appointment_overlap() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.status NOT IN('scheduled','confirmed','rescheduled','in_progress') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND (NEW.contractor_id,NEW.appointment_date,NEW.start_time,NEW.end_time,NEW.status)
  IS NOT DISTINCT FROM (OLD.contractor_id,OLD.appointment_date,OLD.start_time,OLD.end_time,OLD.status) THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('visit-calendar:'||NEW.contractor_id::text,0));
 IF EXISTS(SELECT FROM public.appointments a WHERE a.contractor_id=NEW.contractor_id AND a.id<>NEW.id
   AND a.appointment_date=NEW.appointment_date AND a.status IN('scheduled','confirmed','rescheduled','in_progress')
   AND a.start_time<NEW.end_time AND a.end_time>NEW.start_time) THEN
  RAISE EXCEPTION 'Visit overlaps an existing appointment' USING ERRCODE='23P01';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_appointment_overlap() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_appointment_overlap BEFORE INSERT OR UPDATE OF contractor_id,appointment_date,start_time,end_time,status
 ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.guard_appointment_overlap();
ALTER TABLE public.appointments DROP CONSTRAINT appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check CHECK(status IN('scheduled','confirmed','in_progress','completed','cancelled','no_show','rescheduled'));

CREATE FUNCTION public.update_contractor_appointment(p_actor uuid,p_id uuid,p_changes jsonb)
RETURNS SETOF public.appointments LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointments; changed public.appointments; new_date date; new_start time; new_end time; moved boolean; next_status text;
BEGIN
 IF p_changes IS NULL OR jsonb_typeof(p_changes)<>'object' OR p_changes='{}'::jsonb OR
    EXISTS(SELECT FROM jsonb_object_keys(p_changes) k WHERE k NOT IN('status','appointmentDate','startTime','endTime','notes','cancellationReason','expected','rescheduleReason')) THEN
  RAISE EXCEPTION 'Invalid appointment update' USING ERRCODE='22023';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('visit-calendar:'||p_actor::text,0));
 SELECT * INTO a FROM public.appointments WHERE id=p_id AND contractor_id=p_actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Appointment unavailable' USING ERRCODE='42501'; END IF;
 new_date:=coalesce((p_changes->>'appointmentDate')::date,a.appointment_date);
 new_start:=coalesce((p_changes->>'startTime')::time,a.start_time);
 new_end:=coalesce((p_changes->>'endTime')::time,a.end_time);
 moved:=(new_date,new_start,new_end) IS DISTINCT FROM (a.appointment_date,a.start_time,a.end_time);
 next_status:=coalesce(p_changes->>'status',a.status);
 IF new_end<=new_start THEN RAISE EXCEPTION 'End time must be after start time' USING ERRCODE='22023'; END IF;
 IF a.status IN('completed','cancelled','no_show') AND (moved OR next_status IS DISTINCT FROM a.status) THEN
  RAISE EXCEPTION 'This visit has ended; create a new visit' USING ERRCODE='40001';
 END IF;
 IF moved THEN
  IF a.status='in_progress' THEN RAISE EXCEPTION 'A visit already in progress cannot be rescheduled' USING ERRCODE='40001'; END IF;
  IF (p_changes->'expected'->>'date')::date IS DISTINCT FROM a.appointment_date OR
     (p_changes->'expected'->>'start')::time IS DISTINCT FROM a.start_time OR
     (p_changes->'expected'->>'end')::time IS DISTINCT FROM a.end_time THEN
   RAISE EXCEPTION 'Visit changed; reload before rescheduling' USING ERRCODE='40001';
  END IF;
  IF next_status NOT IN('scheduled','confirmed','rescheduled') THEN RAISE EXCEPTION 'Reschedule an upcoming visit separately from status changes' USING ERRCODE='22023'; END IF;
  IF ((new_date+new_start) AT TIME ZONE 'Europe/London')<=now() THEN RAISE EXCEPTION 'Choose today or a future date' USING ERRCODE='22023'; END IF;
  next_status:='rescheduled';
 END IF;
 UPDATE public.appointments SET appointment_date=new_date,start_time=new_start,end_time=new_end,status=next_status,
  notes=CASE WHEN moved AND length(btrim(p_changes->>'rescheduleReason'))>0 THEN concat_ws(E'\n\n',notes,'Rescheduled: '||(p_changes->>'rescheduleReason')) WHEN p_changes?'notes' THEN p_changes->>'notes' ELSE notes END,
  cancellation_reason=CASE WHEN p_changes?'cancellationReason' THEN p_changes->>'cancellationReason' ELSE cancellation_reason END,
  cancelled_at=CASE WHEN next_status='cancelled' THEN coalesce(cancelled_at,now()) ELSE cancelled_at END,
  completed_at=CASE WHEN next_status='completed' THEN coalesce(completed_at,now()) ELSE completed_at END,
  duration_minutes=extract(epoch FROM (new_end-new_start))/60,
  client_response=CASE WHEN moved THEN 'pending' ELSE client_response END,
  client_response_at=CASE WHEN moved THEN NULL ELSE client_response_at END,
  reminder_sent=CASE WHEN moved THEN false ELSE reminder_sent END,
  reminder_sent_at=CASE WHEN moved THEN NULL ELSE reminder_sent_at END,updated_at=now()
 WHERE id=a.id RETURNING * INTO changed;
 IF moved AND a.client_id IS NOT NULL THEN
  INSERT INTO public.notification_queue(user_id,notification_type,priority,title,message,action_url,metadata,scheduled_for)
  VALUES(a.client_id,'appointment_update','medium','Visit rescheduled',
    a.title||' is now scheduled for '||to_char(new_date,'DD Mon YYYY')||' at '||to_char(new_start,'HH24:MI')||' UK time. Please confirm the new visit time.',
    '/appointments/response',jsonb_build_object('appointmentId',a.id,'jobId',a.job_id,'previousDate',a.appointment_date,'previousStart',a.start_time,'date',new_date,'start',new_start,'end',new_end),now());
 END IF;
 RETURN NEXT changed;
END $$;
REVOKE ALL ON FUNCTION public.update_contractor_appointment(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.update_contractor_appointment(uuid,uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.respond_to_visit(p_actor uuid,p_id uuid,p_date date,p_start time,p_end time,p_response text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE a public.appointments%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public.appointments WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.client_id IS DISTINCT FROM p_actor THEN RAISE EXCEPTION 'Visit unavailable' USING ERRCODE='42501'; END IF;
 IF a.status NOT IN ('scheduled','confirmed','rescheduled') OR a.appointment_date IS DISTINCT FROM p_date OR a.start_time IS DISTINCT FROM p_start OR a.end_time IS DISTINCT FROM p_end THEN RAISE EXCEPTION 'Visit changed; reload' USING ERRCODE='40001'; END IF;
 IF p_response NOT IN ('confirmed','change_requested') THEN RAISE EXCEPTION 'Invalid response' USING ERRCODE='22023'; END IF;
 IF a.client_response=p_response THEN RETURN; END IF;
 UPDATE public.appointments SET client_response=p_response,client_response_at=now() WHERE id=p_id;
 INSERT INTO public.notification_queue(user_id,notification_type,priority,title,message,action_url,metadata,scheduled_for)
 VALUES(a.contractor_id,'appointment_update','medium','Visit response received',CASE WHEN p_response='confirmed' THEN 'The client confirmed the visit.' ELSE 'The client requested a different visit time.' END,'/contractor/scheduling',jsonb_build_object('appointmentId',p_id),now());
END $$;
