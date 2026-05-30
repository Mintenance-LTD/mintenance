-- 2026-05-23: jobs.budget has been NOT NULL since the original
-- minimal_schema migration (now disabled). The 2026-05-22 budget-
-- removal commit (c578e8ecf) stopped collecting budget from the
-- homeowner forms entirely — but the live DB constraint stayed,
-- so every new job insert that omits `budget` would now error
-- with a NOT NULL violation.
--
-- Drop the NOT NULL constraint so the new "contractors set their
-- own price on each bid" flow can post jobs. The CHECK constraint
-- `budget > 0` (if present) still applies — CHECK passes NULL
-- naturally, so it doesn't need touching.
--
-- Note: this only affects new inserts. Existing rows with non-null
-- budgets keep them; the app will continue to surface them on the
-- legacy /jobs/[id]/edit screen.

ALTER TABLE public.jobs ALTER COLUMN budget DROP NOT NULL;
