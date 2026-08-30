-- 2026-05-27 audit-88 P1: jobs RLS exposes posted rows to anon + every
-- contractor via two over-broad legacy policies. The authenticated read
-- path is fully covered by jobs_select_policy (status != draft OR
-- own-row), so the legacy policies are pure leak surface:
--   1. "Anyone can view published jobs"  — polroles=PUBLIC (anon-readable
--      posted/published rows).
--   2. "Contractors can view jobs with controlled budget visibility" —
--      polroles=PUBLIC; gates on auth.uid() but evaluated against
--      every role including anon (anon's auth.uid() is null, so the
--      gate falls through to the profile-role EXISTS subquery which
--      is also null-safe — net effect is still authenticated-broad).
--
-- Dropping both leaves:
--   - jobs_select_policy (authenticated, non-draft OR own-row)
--   - jobs_admin_select (admin, all rows)
--   - "Contractors can view assigned jobs" (authenticated, own)
--   - jobs_service_role (service_role, all)
--   - homeowner/contractor INSERT/UPDATE/DELETE policies unchanged
--
-- App impact: /api/jobs/discover uses serverSupabase (service-role),
-- so it bypasses RLS — the API's verification gate + radius filter
-- remain the single source of truth. Mobile/web direct supabase
-- reads from logged-in users still resolve via jobs_select_policy.
-- Anon callers (and the unauthenticated Realtime channel) lose the
-- broadcast access they had on posted rows.

DROP POLICY IF EXISTS "Anyone can view published jobs" ON public.jobs;
DROP POLICY IF EXISTS "Contractors can view jobs with controlled budget visibility" ON public.jobs;;
