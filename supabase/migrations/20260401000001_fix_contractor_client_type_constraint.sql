-- Fix: contractor_clients client_type CHECK constraint is too restrictive.
-- The auto_populate_contractor_client trigger inserts 'homeowner' but the
-- constraint only allows: residential, commercial, industrial, government.
-- This was silently breaking bid acceptance — the job status never updated
-- from 'posted' to 'assigned' because the trigger constraint violation
-- rolled back the entire UPDATE on the jobs table.

-- Option 1: Add 'homeowner' to the allowed values
ALTER TABLE public.contractor_clients
  DROP CONSTRAINT IF EXISTS contractor_clients_client_type_check;

ALTER TABLE public.contractor_clients
  ADD CONSTRAINT contractor_clients_client_type_check
  CHECK (client_type IN ('residential', 'commercial', 'industrial', 'government', 'homeowner'));

-- Also fix the trigger function to use 'residential' as a more appropriate default
-- since homeowners are typically residential clients
CREATE OR REPLACE FUNCTION public.auto_populate_contractor_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Only trigger when contractor_id is set (job assigned)
  IF NEW.contractor_id IS NOT NULL AND (OLD.contractor_id IS NULL OR OLD.contractor_id != NEW.contractor_id) THEN
    INSERT INTO public.contractor_clients (id, contractor_id, first_name, last_name, email, client_type, relationship_status, source, total_jobs, created_at, updated_at)
    SELECT
      gen_random_uuid(),
      NEW.contractor_id,
      p.first_name,
      p.last_name,
      p.email,
      'residential',  -- was 'homeowner' which violated the CHECK constraint
      'active',
      'job_platform',
      1,
      NOW(),
      NOW()
    FROM public.profiles p WHERE p.id = NEW.homeowner_id
    ON CONFLICT DO NOTHING;

    -- Update existing client's job count
    UPDATE public.contractor_clients
    SET total_jobs = total_jobs + 1,
        last_job_date = NOW(),
        relationship_status = 'active',
        updated_at = NOW()
    WHERE contractor_id = NEW.contractor_id
      AND email = (SELECT email FROM public.profiles WHERE id = NEW.homeowner_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Now fix the boiler issue job that was stuck
UPDATE public.jobs
SET status = 'assigned',
    contractor_id = '236c6e76-4c29-4569-acb6-54d65b67f83e',
    updated_at = NOW()
WHERE id = '673fe11c-3834-4168-9f81-0f031a7532e6'
  AND status = 'posted';

-- Also fix any other jobs that have accepted bids but are still 'posted'
UPDATE public.jobs j
SET status = 'assigned',
    contractor_id = b.contractor_id,
    updated_at = NOW()
FROM public.bids b
WHERE b.job_id = j.id
  AND b.status = 'accepted'
  AND j.status = 'posted'
  AND j.contractor_id IS NULL;
