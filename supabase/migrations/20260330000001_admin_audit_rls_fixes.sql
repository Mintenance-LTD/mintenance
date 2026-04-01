-- Migration: Admin Audit RLS Fixes
-- Date: 2026-03-30
-- Purpose: Fix critical RLS gaps found during admin structural audit
--
-- CRITICAL #2: Restrict password_reset_tokens and password_history to service_role
-- CRITICAL #3: Enable RLS on jobs_photos table
-- HIGH #6: Add admin SELECT policies for business-critical tables

-- ============================================================
-- CRITICAL #2: Lock down password_reset_tokens
-- ============================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "password_reset_tokens_all" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "password_reset_tokens_policy" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Enable all operations for password_reset_tokens" ON public.password_reset_tokens;

-- Only service_role can access password reset tokens
CREATE POLICY "password_reset_tokens_service_role_only"
  ON public.password_reset_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- CRITICAL #2: Lock down password_history
-- ============================================================

DROP POLICY IF EXISTS "password_history_all" ON public.password_history;
DROP POLICY IF EXISTS "password_history_policy" ON public.password_history;
DROP POLICY IF EXISTS "Enable all operations for password_history" ON public.password_history;

-- Only service_role can access password history
CREATE POLICY "password_history_service_role_only"
  ON public.password_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- CRITICAL #2: Lock down login_attempts
-- ============================================================

DROP POLICY IF EXISTS "login_attempts_all" ON public.login_attempts;
DROP POLICY IF EXISTS "login_attempts_policy" ON public.login_attempts;
DROP POLICY IF EXISTS "Enable all operations for login_attempts" ON public.login_attempts;

-- Only service_role can access login attempts
CREATE POLICY "login_attempts_service_role_only"
  ON public.login_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- CRITICAL #3: Enable RLS on jobs_photos (if table exists)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs_photos') THEN
    ALTER TABLE public.jobs_photos ENABLE ROW LEVEL SECURITY;

    -- Owner can see their job's photos
    EXECUTE 'CREATE POLICY "jobs_photos_owner_select" ON public.jobs_photos FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = jobs_photos.job_id AND j.homeowner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = jobs_photos.job_id AND j.contractor_id = auth.uid())
      OR public.is_admin(auth.uid())
    )';

    -- Contractor assigned to job can insert photos
    EXECUTE 'CREATE POLICY "jobs_photos_contractor_insert" ON public.jobs_photos FOR INSERT TO authenticated WITH CHECK (
      EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = jobs_photos.job_id AND j.contractor_id = auth.uid())
    )';

    -- Service role full access
    EXECUTE 'CREATE POLICY "jobs_photos_service_role" ON public.jobs_photos FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ============================================================
-- HIGH #6: Add admin SELECT policies for business tables
-- ============================================================

-- Admin can SELECT all jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'jobs_admin_select'
  ) THEN
    CREATE POLICY "jobs_admin_select" ON public.jobs
      FOR SELECT TO authenticated
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Admin can SELECT all bids
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bids' AND policyname = 'bids_admin_select'
  ) THEN
    CREATE POLICY "bids_admin_select" ON public.bids
      FOR SELECT TO authenticated
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Admin can SELECT all contracts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'contracts_admin_select'
  ) THEN
    CREATE POLICY "contracts_admin_select" ON public.contracts
      FOR SELECT TO authenticated
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Admin can SELECT all properties
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'properties' AND policyname = 'properties_admin_select'
  ) THEN
    CREATE POLICY "properties_admin_select" ON public.properties
      FOR SELECT TO authenticated
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Admin can SELECT all invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_admin_select'
  ) THEN
    CREATE POLICY "invoices_admin_select" ON public.invoices
      FOR SELECT TO authenticated
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Admin can SELECT all expenses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'expenses_admin_select'
  ) THEN
    CREATE POLICY "expenses_admin_select" ON public.expenses
      FOR SELECT TO authenticated
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Lock down webhook_events (HIGH #9 from audit)
DROP POLICY IF EXISTS "webhook_events_all" ON public.webhook_events;
DROP POLICY IF EXISTS "webhook_events_policy" ON public.webhook_events;
DROP POLICY IF EXISTS "Enable all operations for webhook_events" ON public.webhook_events;

DROP POLICY IF EXISTS "webhook_events_service_role_only" ON public.webhook_events;
CREATE POLICY "webhook_events_service_role_only"
  ON public.webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "webhook_events_admin_select"
  ON public.webhook_events
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
