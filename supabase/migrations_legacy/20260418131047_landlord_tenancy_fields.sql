BEGIN;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS is_rental_property BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS payer_user_id UUID NULL
    REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS tenancy_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_jobs_payer_user_id
  ON public.jobs (payer_user_id)
  WHERE payer_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_rental_property
  ON public.jobs (is_rental_property)
  WHERE is_rental_property = TRUE;

COMMIT;;
