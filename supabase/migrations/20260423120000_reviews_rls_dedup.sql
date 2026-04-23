-- Dedup public.reviews RLS policies; restore the 7-day edit window.
--
-- Context
-- -------
-- Migration 20260318000003_restrict_reviews_to_job_participants.sql
-- recreated `reviews_update` WITHOUT the 7-day edit-window clause, but
-- left the pre-existing "Reviewers can update own reviews" policy
-- (which DID have the 7-day window) in place. Postgres RLS ORs together
-- policies on the same command, so the permissive `reviews_update` wins
-- and the 7-day edit window is silently ignored — a user can edit their
-- review indefinitely.
--
-- Also collapses the duplicate INSERT policies
-- (`reviews_insert_policy` on role=public is functionally equivalent to
-- `reviews_insert` on role=authenticated; anon can't satisfy
-- `reviewer_id = auth.uid()` either way).
--
-- Live state before this migration (verified via Supabase MCP
-- 2026-04-23): 3 rows in public.reviews, so the behavior change is
-- effectively cosmetic for existing data.

-- Drop both existing UPDATE policies so we can replace with one unified
-- policy that restores the 7-day edit window.
DROP POLICY IF EXISTS "Reviewers can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update" ON public.reviews;

CREATE POLICY "reviews_update" ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (
    reviewer_id = auth.uid()
    AND created_at > (now() - interval '7 days')
  )
  WITH CHECK (reviewer_id = auth.uid());

-- Drop the duplicate INSERT policy (was on role=public). Keep
-- `reviews_insert` (role=authenticated) as the single source of truth.
DROP POLICY IF EXISTS "reviews_insert_policy" ON public.reviews;
