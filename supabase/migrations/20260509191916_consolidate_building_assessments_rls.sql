-- AUDIT_PUNCH_LIST P2 #34 (D-P2-2) — `building_assessments` had 10
-- RLS policies (audit said 8 overlapping SELECT). On inspection
-- 2026-05-09, only ONE was truly redundant:
--
--   "Admins can view all assessments" (SELECT)
--     USING: EXISTS profiles WHERE id = auth.uid() AND role = 'admin'
--   This is fully subsumed by `Users can view assessments for their
--   jobs or own assessments` whose USING clause already terminates
--   with the same admin EXISTS check.
--
-- The other "duplicates" handle distinct concerns:
--   - "Users can view own assessments" — ALSO allows reads of
--     `user_id IS NULL` shadow-mode rows (intentional ML community
--     surface; not covered by the broader policy).
--   - "Contractors can view assessments for assigned jobs" — uses a
--     different join path through `job_photos_metadata`; the wider
--     policy doesn't reach this scenario.
--   - "Users can create assessments for their jobs" + "Users can
--     create own assessments" — different shadow_mode handling
--     (the first enforces job-ownership when job_id is set, the
--     second permits server-style shadow_mode inserts). NB: there
--     is a real INSERT-bypass here — see comment below.
--   - "Admins can update" + "Users can update their own" — distinct
--     subjects, both legitimate.
--
-- KEEPING everything except the one strictly-redundant SELECT policy.
--
-- ---------------------------------------------------------------
-- FOLLOW-UP (separate finding, P2 candidate, NOT FIXED HERE):
-- The two INSERT policies are OR'd, so a user submitting
-- `{ user_id = self, job_id = OTHER_USER_JOB, shadow_mode = false }`
-- bypasses the job-ownership check in policy 1 because policy 2's
-- `(!shadow_mode AND auth.uid() = user_id)` branch passes.
-- Tightening policy 2 to ONLY allow `(shadow_mode AND user_id IS NULL)`
-- would close the bypass, but that's a behavior change requiring
-- product sign-off on whether shadow-mode authenticated inserts
-- should still be possible. Logged for follow-up.
-- ---------------------------------------------------------------

BEGIN;

DROP POLICY IF EXISTS "Admins can view all assessments" ON public.building_assessments;

COMMIT;
