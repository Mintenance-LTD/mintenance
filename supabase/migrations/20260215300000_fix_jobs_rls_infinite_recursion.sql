-- Migration: Fix infinite recursion in jobs RLS policies
-- Date: 2026-02-15
-- Issue: Old migrations left behind overlapping policies on public.jobs.
--   Specifically, "jobs_select" (from 20251221181018) queries public.bids,
--   whose own RLS policy queries public.jobs back, creating an infinite loop.
--   PostgreSQL detects this and throws error 42P17.
--
-- Fix: Drop ALL existing policies on jobs table (old and new), then recreate
--   clean policies that avoid cross-table references to RLS-protected tables.

BEGIN;

-- ============================================================
-- Step 1: Drop ALL known policies on public.jobs
-- (covers every policy name from every migration, old or new)
-- ============================================================

-- From 20260206009000_core_rls_policies.sql (current)
DROP POLICY IF EXISTS "jobs_select_public_or_owner" ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert_owner" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_owner" ON public.jobs;
DROP POLICY IF EXISTS "jobs_delete_owner" ON public.jobs;

-- From 20251221181018_add_rls_policies_critical_tables.sql (old - causes recursion!)
DROP POLICY IF EXISTS "jobs_select" ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update" ON public.jobs;

-- From 20250107000002_complete_rls_and_admin_overrides.sql (old)
DROP POLICY IF EXISTS "jobs_select_policy" ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert_policy" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_policy" ON public.jobs;
DROP POLICY IF EXISTS "jobs_delete_policy" ON public.jobs;

-- From 20251208000003_add_contractor_job_discovery_policy.sql (old)
DROP POLICY IF EXISTS "Contractors can view posted jobs available for bidding" ON public.jobs;

-- From minimal_schema.sql (old - likely never ran, but be safe)
DROP POLICY IF EXISTS "Users can view jobs they're involved in" ON public.jobs;
DROP POLICY IF EXISTS "Homeowners can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Homeowners can update their own jobs" ON public.jobs;

-- From even earlier versions
DROP POLICY IF EXISTS "Anyone can view posted jobs" ON public.jobs;
DROP POLICY IF EXISTS "Homeowners can update their jobs" ON public.jobs;
DROP POLICY IF EXISTS "Contractors can update assigned jobs" ON public.jobs;
DROP POLICY IF EXISTS "admin_full_access_jobs" ON public.jobs;

-- ============================================================
-- Step 2: Recreate clean policies
-- IMPORTANT: No cross-references to bids/profiles to avoid recursion.
-- The service_role client (used by API routes) bypasses RLS entirely.
-- These policies only affect direct client-side Supabase queries.
-- ============================================================

-- SELECT: Anyone authenticated can see non-draft jobs.
-- Homeowners can also see their own drafts.
-- Contractors can see jobs they're assigned to (any status).
CREATE POLICY "jobs_select_policy" ON public.jobs
  FOR SELECT
  TO authenticated
  USING (
    status NOT IN ('draft')
    OR homeowner_id = auth.uid()
    OR contractor_id = auth.uid()
  );

-- INSERT: Only the homeowner (job creator) can insert.
CREATE POLICY "jobs_insert_policy" ON public.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (homeowner_id = auth.uid());

-- UPDATE: Homeowner or assigned contractor can update.
CREATE POLICY "jobs_update_policy" ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (homeowner_id = auth.uid() OR contractor_id = auth.uid())
  WITH CHECK (homeowner_id = auth.uid() OR contractor_id = auth.uid());

-- DELETE: Only the homeowner can delete.
CREATE POLICY "jobs_delete_policy" ON public.jobs
  FOR DELETE
  TO authenticated
  USING (homeowner_id = auth.uid());

-- Service role bypass (for API server-side operations)
DROP POLICY IF EXISTS "jobs_service_role" ON public.jobs;
CREATE POLICY "jobs_service_role" ON public.jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
