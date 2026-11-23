-- Record only visit slots and participant responses, never private visit notes.
CREATE TABLE public.appointment_visit_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('scheduled', 'rescheduled', 'response', 'status')),
  previous_slot jsonb,
  slot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX appointment_visit_history_appointment_idx
  ON public.appointment_visit_history (appointment_id, created_at DESC, id DESC);

ALTER TABLE public.appointment_visit_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointment_visit_history FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.appointment_visit_history TO service_role;

CREATE FUNCTION public.record_appointment_visit_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE event_kind text; old_slot jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_kind := 'scheduled';
  ELSIF (NEW.appointment_date, NEW.start_time, NEW.end_time)
      IS DISTINCT FROM (OLD.appointment_date, OLD.start_time, OLD.end_time) THEN
    event_kind := 'rescheduled';
    old_slot := jsonb_build_object(
      'date', OLD.appointment_date, 'start', OLD.start_time, 'end', OLD.end_time,
      'status', OLD.status, 'response', OLD.client_response, 'responseAt', OLD.client_response_at,
      'respondedBy', CASE WHEN OLD.client_response <> 'pending' THEN OLD.client_id END
    );
  ELSIF NEW.client_response <> 'pending' AND
      (NEW.client_response, NEW.client_response_at)
      IS DISTINCT FROM (OLD.client_response, OLD.client_response_at) THEN
    IF ((NEW.appointment_date + NEW.end_time) AT TIME ZONE 'Europe/London') <= now() THEN
      RAISE EXCEPTION 'This visit has ended' USING ERRCODE = '40001';
    END IF;
    event_kind := 'response';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    event_kind := 'status';
  ELSE
    RETURN NULL;
  END IF;

  INSERT INTO public.appointment_visit_history (appointment_id, kind, previous_slot, slot)
  VALUES (NEW.id, event_kind, old_slot, jsonb_build_object(
    'date', NEW.appointment_date, 'start', NEW.start_time, 'end', NEW.end_time,
    'status', NEW.status, 'response', NEW.client_response, 'responseAt', NEW.client_response_at,
    'respondedBy', CASE WHEN NEW.client_response <> 'pending' THEN NEW.client_id END
  ));
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.record_appointment_visit_history() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER record_appointment_visit_history
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.record_appointment_visit_history();
