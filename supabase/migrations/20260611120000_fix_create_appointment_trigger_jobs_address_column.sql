-- 2026-06-11 P0: create_appointment_from_accepted_contract selected a
-- non-existent jobs.address column, so the trigger 500'd on the SECOND
-- contract signature (when contracts.status flips to 'accepted'). Result:
-- no contract could ever be fully accepted, which blocked escrow funding
-- and the entire job lifecycle (web + mobile share this trigger via
-- /api/contracts/[id]/accept). jobs has location, city, postcode (no
-- address) — compose a human-readable address from those instead.
CREATE OR REPLACE FUNCTION public.create_appointment_from_accepted_contract()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- jobs has no `address` column; build one from location/city/postcode.
  SELECT title,
         location,
         NULLIF(TRIM(CONCAT_WS(', ', location, city, postcode)), '')
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
$function$;
