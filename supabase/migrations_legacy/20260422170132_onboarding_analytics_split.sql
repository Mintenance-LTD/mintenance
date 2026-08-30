-- Phase 3 #5: split onboarding_completed into three analytics signals.
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS intro_swiper_dismissed_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.intro_swiper_dismissed_at IS
  'Timestamp when the user dismissed the 3-slide intro swiper. '
  'Distinct from onboarding_completed_at post-2026-04-22 audit: '
  'the swiper is Tier 0 context, the rest of Tier 1 (identity, '
  'DBS, selfie, service area, payout) is separate.';

COMMENT ON COLUMN public.profiles.activated_at IS
  'Timestamp of first meaningful business action. Homeowner: '
  'first row in public.jobs with homeowner_id = profile.id. '
  'Contractor: first accepted/won row in public.bids with '
  'contractor_id = profile.id. Null = signed up but never '
  'activated. Populated via triggers.';

UPDATE public.profiles
SET intro_swiper_dismissed_at = onboarding_completed_at
WHERE onboarding_completed = true
  AND onboarding_completed_at IS NOT NULL
  AND intro_swiper_dismissed_at IS NULL;

UPDATE public.profiles p
SET activated_at = sub.first_job_at
FROM (
  SELECT homeowner_id, MIN(created_at) AS first_job_at
  FROM public.jobs
  WHERE homeowner_id IS NOT NULL
  GROUP BY homeowner_id
) sub
WHERE p.id = sub.homeowner_id
  AND p.activated_at IS NULL;

UPDATE public.profiles p
SET activated_at = sub.first_accept_at
FROM (
  SELECT contractor_id, MIN(COALESCE(updated_at, created_at)) AS first_accept_at
  FROM public.bids
  WHERE contractor_id IS NOT NULL
    AND status IN ('accepted', 'won')
  GROUP BY contractor_id
) sub
WHERE p.id = sub.contractor_id
  AND p.activated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_intro_swiper_dismissed_at_active
  ON public.profiles (intro_swiper_dismissed_at)
  WHERE intro_swiper_dismissed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_activated_at_active
  ON public.profiles (activated_at)
  WHERE activated_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.stamp_homeowner_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET activated_at = NEW.created_at
  WHERE id = NEW.homeowner_id
    AND activated_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_stamp_homeowner_activation ON public.jobs;

CREATE TRIGGER trg_jobs_stamp_homeowner_activation
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  WHEN (NEW.homeowner_id IS NOT NULL)
  EXECUTE FUNCTION public.stamp_homeowner_activation();

CREATE OR REPLACE FUNCTION public.stamp_contractor_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status IN ('accepted', 'won'))
     OR (TG_OP = 'UPDATE'
         AND NEW.status IN ('accepted', 'won')
         AND (OLD.status IS DISTINCT FROM NEW.status))
  THEN
    UPDATE public.profiles
    SET activated_at = COALESCE(NEW.updated_at, NEW.created_at, NOW())
    WHERE id = NEW.contractor_id
      AND activated_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bids_stamp_contractor_activation ON public.bids;

CREATE TRIGGER trg_bids_stamp_contractor_activation
  AFTER INSERT OR UPDATE OF status ON public.bids
  FOR EACH ROW
  WHEN (NEW.contractor_id IS NOT NULL)
  EXECUTE FUNCTION public.stamp_contractor_activation();

COMMIT;;
