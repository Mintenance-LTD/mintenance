CREATE OR REPLACE FUNCTION public.create_appointment_from_accepted_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_job_title       TEXT;
  v_job_location    TEXT;
  v_job_address     TEXT;
  v_homeowner_name  TEXT;
  v_homeowner_email TEXT;
  v_homeowner_phone TEXT;
  v_existing_id     UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM 'accepted' THEN
    RETURN NEW;
  END IF;
  IF OLD.status IS NOT DISTINCT FROM 'accepted' THEN
    RETURN NEW;
  END IF;

  IF NEW.start_date IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing_id
  FROM public.appointments
  WHERE job_id = NEW.job_id
    AND contractor_id = NEW.contractor_id
  LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT title, location, address
    INTO v_job_title, v_job_location, v_job_address
  FROM public.jobs
  WHERE id = NEW.job_id;

  SELECT TRIM(CONCAT_WS(' ', first_name, last_name)), email, phone
    INTO v_homeowner_name, v_homeowner_email, v_homeowner_phone
  FROM public.profiles
  WHERE id = NEW.homeowner_id;

  INSERT INTO public.appointments (
    contractor_id,
    client_id,
    job_id,
    title,
    appointment_date,
    start_time,
    end_time,
    location_type,
    location_address,
    client_name,
    client_email,
    client_phone,
    status,
    notes
  ) VALUES (
    NEW.contractor_id,
    NEW.homeowner_id,
    NEW.job_id,
    COALESCE(v_job_title, NEW.title, 'Scheduled Job'),
    NEW.start_date,
    '09:00'::time,
    '17:00'::time,
    'onsite',
    COALESCE(v_job_address, v_job_location),
    NULLIF(v_homeowner_name, ''),
    v_homeowner_email,
    v_homeowner_phone,
    'scheduled',
    CONCAT('Auto-created from contract "',
           COALESCE(NEW.title, 'Untitled'),
           '" acceptance.')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contract_accepted_create_appointment ON public.contracts;

CREATE TRIGGER contract_accepted_create_appointment
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_appointment_from_accepted_contract();

COMMENT ON FUNCTION public.create_appointment_from_accepted_contract()
  IS 'Sprint 7 (2.2): atomic appointment creation on contract acceptance. Fires AFTER UPDATE on contracts when status transitions INTO accepted. Idempotent — skips if an appointment already exists for the job.';;
