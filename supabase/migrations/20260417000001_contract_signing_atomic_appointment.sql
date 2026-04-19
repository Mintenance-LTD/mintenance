-- Sprint 7 fix (2.2): atomic contract acceptance -> appointment creation
--
-- Before: apps/web/app/api/contracts/[id]/accept/route.ts updated
-- contracts.status to 'accepted' and then, in a separate best-effort
-- try/catch, INSERTed into appointments. If the INSERT failed the
-- contract remained accepted with no matching appointment, and
-- dashboard "Upcoming Appointments" silently dropped the job.
--
-- After: this trigger fires AFTER UPDATE on contracts whenever the row
-- transitions INTO 'accepted' from any other status. It lives in the
-- same transaction as the UPDATE so if the appointment INSERT fails
-- the UPDATE rolls back too (contract stays in its prior pending_*
-- status and the route returns the error to the caller). This
-- guarantees the invariant: "accepted contract <-> appointment row".
--
-- The trigger is idempotent: a contract that is already 'accepted'
-- (another trigger or retry flipping it again) is skipped, so re-runs
-- cannot create duplicate appointments.

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
  -- Only fire on the transition INTO 'accepted'. If the prior status was
  -- already 'accepted' this is a no-op (prevents duplicates on retry).
  IF NEW.status IS DISTINCT FROM 'accepted' THEN
    RETURN NEW;
  END IF;
  IF OLD.status IS NOT DISTINCT FROM 'accepted' THEN
    RETURN NEW;
  END IF;

  -- We only auto-create an appointment when the contract carries a
  -- start_date; otherwise there's nothing sensible to schedule.
  IF NEW.start_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Idempotency: skip if an appointment already exists for this contract's
  -- job. This guards against replay / double-fire.
  SELECT id INTO v_existing_id
  FROM public.appointments
  WHERE job_id = NEW.job_id
    AND contractor_id = NEW.contractor_id
  LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Pull enrichment data. Nulls are OK — the column nullability in
  -- appointments allows it.
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

-- Drop prior incarnation if present; safe to re-run.
DROP TRIGGER IF EXISTS contract_accepted_create_appointment ON public.contracts;

CREATE TRIGGER contract_accepted_create_appointment
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_appointment_from_accepted_contract();

COMMENT ON FUNCTION public.create_appointment_from_accepted_contract()
  IS 'Sprint 7 (2.2): atomic appointment creation on contract acceptance. '
     'Fires AFTER UPDATE on contracts when status transitions INTO accepted. '
     'Idempotent — skips if an appointment already exists for the job.';
