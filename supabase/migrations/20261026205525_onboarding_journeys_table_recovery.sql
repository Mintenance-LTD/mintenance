-- Table-only recovery for /api/onboarding/progress.
-- No notifications, early-access grants, cohort logic or existing-user backfill.
-- Apply only after the review in docs/operations/onboarding-table-recovery.md.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.onboarding_journeys (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  journey text NOT NULL CHECK (length(journey) BETWEEN 1 AND 120),
  platform text NOT NULL CHECK (platform IN ('web', 'mobile')),
  version integer NOT NULL DEFAULT 2 CHECK (version > 0),
  status text NOT NULL CHECK (status IN ('in_progress', 'completed', 'skipped')),
  step integer NOT NULL DEFAULT 0 CHECK (step BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, journey, platform, version)
);

-- Clients can read only their own progress. Writes remain behind the existing
-- authenticated API, which owns user_id/version and validates role/guide access.
-- RLS does not protect TRUNCATE, so remove inherited/default client privileges.
ALTER TABLE public.onboarding_journeys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.onboarding_journeys FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.onboarding_journeys TO authenticated;
GRANT ALL ON public.onboarding_journeys TO service_role;
DROP POLICY IF EXISTS onboarding_read_own ON public.onboarding_journeys;
CREATE POLICY onboarding_read_own ON public.onboarding_journeys
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- Make the new relation visible to PostgREST after the transaction commits.
NOTIFY pgrst, 'reload schema';
COMMIT;
