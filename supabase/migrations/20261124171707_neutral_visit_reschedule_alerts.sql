-- The linked visit is the source of truth for the current slot and response.
CREATE OR REPLACE FUNCTION public.link_visit_notification_to_record()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.metadata->>'appointmentId' ~ '^[0-9a-fA-F-]{36}$' THEN
    IF NEW.action_url = '/appointments/response' THEN
      NEW.action_url := '/appointments/' || (NEW.metadata->>'appointmentId');
      IF NEW.title = 'Visit rescheduled' THEN
        NEW.message := regexp_replace(NEW.message,
          ' Please confirm the new visit time[.]$', ' View visit for the latest time and status.');
      END IF;
    ELSIF NEW.action_url = '/contractor/scheduling' THEN
      NEW.action_url := '/contractor/appointments/' || (NEW.metadata->>'appointmentId');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Correct legacy notices in the inbox and any copies awaiting delivery.
UPDATE public.notifications
SET message = regexp_replace(message,
  ' Please confirm the new visit time[.]$', ' View visit for the latest time and status.')
WHERE type = 'appointment_update' AND title = 'Visit rescheduled'
  AND metadata->>'appointmentId' ~ '^[0-9a-fA-F-]{36}$'
  AND message LIKE '% Please confirm the new visit time.';

UPDATE public.notification_queue
SET message = regexp_replace(message,
  ' Please confirm the new visit time[.]$', ' View visit for the latest time and status.')
WHERE notification_type = 'appointment_update' AND title = 'Visit rescheduled'
  AND metadata->>'appointmentId' ~ '^[0-9a-fA-F-]{36}$'
  AND message LIKE '% Please confirm the new visit time.';
