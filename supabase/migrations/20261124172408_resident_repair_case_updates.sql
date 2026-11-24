-- These updates reuse the case email outbox, which only delivers to the
-- verified, opted-in resident. No contractor notes or payment details enter it.
CREATE SCHEMA IF NOT EXISTS private;
CREATE FUNCTION private.record_resident_repair_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  linked_job uuid;
  linked_property uuid;
  update_text text;
BEGIN
  IF TG_TABLE_NAME = 'appointments' THEN
    IF NEW.job_id IS NULL OR NEW.client_id IS NULL THEN RETURN NULL; END IF;
    SELECT id, property_id INTO linked_job, linked_property
    FROM public.jobs
    WHERE id = NEW.job_id AND homeowner_id = NEW.client_id AND is_rental_property;
    update_text := 'Visit confirmed for ' ||
      to_char(NEW.appointment_date, 'DD Mon YYYY') || ', ' ||
      to_char(NEW.start_time, 'HH24:MI') || '–' ||
      to_char(NEW.end_time, 'HH24:MI') || ' UK time.';
  ELSE
    IF NEW.is_rental_property IS NOT TRUE THEN RETURN NULL; END IF;
    linked_job := NEW.id;
    linked_property := NEW.property_id;
    update_text := CASE WHEN NEW.status = 'completed' THEN 'Work completed.'
      ELSE 'The contractor has started work.' END;
  END IF;
  INSERT INTO public.report_messages(id, report_id, author_role, body)
  SELECT gen_random_uuid(), id, 'system', update_text
  FROM public.anonymous_reports
  WHERE job_id = linked_job AND property_id = linked_property
    AND status NOT IN ('dismissed', 'resolved');
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION private.record_resident_repair_update() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER record_resident_confirmed_visit
  AFTER UPDATE OF client_response ON public.appointments
  FOR EACH ROW
  WHEN (NEW.client_response = 'confirmed' AND OLD.client_response IS DISTINCT FROM NEW.client_response)
  EXECUTE FUNCTION private.record_resident_repair_update();

CREATE TRIGGER record_resident_work_progress
  AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND
    (NEW.status = 'completed' OR (NEW.status = 'in_progress' AND OLD.started_at IS NULL)))
  EXECUTE FUNCTION private.record_resident_repair_update();
