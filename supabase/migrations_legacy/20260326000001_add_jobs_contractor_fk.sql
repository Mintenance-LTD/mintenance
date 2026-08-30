-- Add missing foreign key constraint on jobs.contractor_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'jobs_contractor_id_fkey'
    AND table_name = 'jobs'
  ) THEN
    ALTER TABLE public.jobs
    ADD CONSTRAINT jobs_contractor_id_fkey
    FOREIGN KEY (contractor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
