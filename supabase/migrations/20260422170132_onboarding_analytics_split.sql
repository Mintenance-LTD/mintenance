-- Phase 3 item #5 of the 2026-04-19 mobile onboarding audit
-- (PDF §5.7, Analytics). Splits the single `onboarding_completed`
-- / `onboarding_completed_at` signal into three distinct
-- analytics events so we can measure the funnel properly:
--
--   intro_swiper_dismissed_at
--     — timestamp the user dismissed the 3-slide intro swiper.
--       TODAY this is what `onboarding_completed_at` actually
--       tracks (the swiper is the only caller that sets
--       onboarding_completed=true). Teasing it out means we can
--       tell "finished the intro animation" apart from
--       "finished the Tier 1 setup ladder".
--
--   onboarding_completed / onboarding_completed_at
--     — semantic STAYS the same for now to avoid cascading
--       breakage across the gate hooks (useLocationSoftAskGate,
--       useServiceAreaGate, useIdentitySetupGate, …) which all
--       gate on `user.onboarding_completed === true` to know
--       "swiper dismissed, ok to stack the next prompt".
--
--       A future migration may promote this to mean "full Tier 1
--       ladder complete" — but only after the gate hooks get
--       re-pointed to `intro_swiper_dismissed_at IS NOT NULL`.
--       Scope-controlled here.
--
--   activated_at
--     — timestamp of first meaningful business action:
--         homeowner → first row in `public.jobs` with
--                      homeowner_id = profile.id
--         contractor → first row in `public.bids` with
--                      contractor_id = profile.id AND
--                      status IN ('accepted','won')
--       Null = signed up but never activated. Lets us compute
--       true activation funnels and time-to-first-$ metrics.
--
-- Design choices:
--   • timestamptz for both columns — lines up with the rest of
--     the audit migrations (20260422000001) and avoids the
--     parseLegacyExpiry V8 misparse class of bug that license_
--     expiry's TEXT type caused.
--   • `activated_at` is stamped via Postgres triggers so the
--     stamp is guaranteed regardless of which API route runs
--     the INSERT/UPDATE. Also keeps analytics honest even when
--     data arrives via admin tools or migrations.
--   • Partial indexes on `IS NOT NULL` so we don't index the
--     untouched rows for retention-cohort queries.
--
-- RLS: inherits `profiles` existing policies — no policy change.
-- Writes happen via SECURITY DEFINER trigger functions so the
-- triggers work even on restricted role contexts.

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

-- ---------- Backfill --------------------------------------------------
--
-- Until this migration, the swiper's dismissal was the ONLY writer of
-- onboarding_completed=true (OnboardingService.markOnboardingComplete).
-- So any existing `onboarding_completed_at` is, in effect, already the
-- intro_swiper_dismissed_at timestamp. Copy it over so historical
-- cohorts keep their swiper-dismissal attribution.

UPDATE public.profiles
SET intro_swiper_dismissed_at = onboarding_completed_at
WHERE onboarding_completed = true
  AND onboarding_completed_at IS NOT NULL
  AND intro_swiper_dismissed_at IS NULL;

-- Backfill `activated_at` from existing data so we don't nuke the
-- cohort of users who activated before the trigger existed.

-- Homeowner activation: earliest jobs row per homeowner_id.
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

-- Contractor activation: earliest accepted/won bid per contractor_id.
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

-- ---------- Indexes ---------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_intro_swiper_dismissed_at_active
  ON public.profiles (intro_swiper_dismissed_at)
  WHERE intro_swiper_dismissed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_activated_at_active
  ON public.profiles (activated_at)
  WHERE activated_at IS NOT NULL;

-- ---------- Trigger: stamp activated_at on first homeowner job --------

CREATE OR REPLACE FUNCTION public.stamp_homeowner_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No-op if already activated; idempotent.
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

-- ---------- Trigger: stamp activated_at on first accepted bid ---------

CREATE OR REPLACE FUNCTION public.stamp_contractor_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fire only on transition INTO accepted/won, not on every UPDATE
  -- to an already-accepted row.
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

COMMIT;
