-- R6 #19 of docs/RETENTION_ROADMAP_2026.md — landlord tenancy job fields.
--
-- Many of our "homeowners" are actually landlords (either directly or via
-- agency). The existing jobs schema has no way to say:
--   (a) this property is a rental (so tenant-comms rules apply)
--   (b) the person who posted the job is NOT the person who pays
--       (letting agents post, landlord pays; tenant reports, landlord pays)
--
-- Without these two flags, post-job nudges, escrow routing, and invoicing
-- all misfire for landlord customers.

BEGIN;

-- 1. Rental-property marker. Cheap to read; drives tenant-comms UI.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS is_rental_property BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Optional distinct payer. When NULL, payment-intent uses homeowner_id
--    (the poster) as the Stripe customer, preserving current behavior.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS payer_user_id UUID NULL
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Free-form tenancy flag — kept as JSONB for forward-compatibility
--    (e.g. { tenant_reported: true, landlord_notified: true, agreement_ref: ... }).
--    Initialised empty.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS tenancy_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 4. Speed up "jobs I'm paying for" lookups on the payer dashboard.
CREATE INDEX IF NOT EXISTS idx_jobs_payer_user_id
  ON public.jobs (payer_user_id)
  WHERE payer_user_id IS NOT NULL;

-- 5. Speed up tenant-reported-job filters.
CREATE INDEX IF NOT EXISTS idx_jobs_rental_property
  ON public.jobs (is_rental_property)
  WHERE is_rental_property = TRUE;

COMMIT;
