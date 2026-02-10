-- Migration: Core RLS policies for profiles, jobs, payments, and AI tables
-- Date: 2026-02-06

BEGIN;

-- Profiles
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles';

    EXECUTE 'CREATE POLICY "profiles_select_own" ON public.profiles
             FOR SELECT
             USING (
               id = auth.uid()
               OR EXISTS (
                 SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = ''admin''
               )
             )';

    EXECUTE 'CREATE POLICY "profiles_insert_own" ON public.profiles
             FOR INSERT
             WITH CHECK (id = auth.uid())';

    EXECUTE 'CREATE POLICY "profiles_update_own" ON public.profiles
             FOR UPDATE
             USING (id = auth.uid())
             WITH CHECK (
               id = auth.uid()
               AND (role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE id = auth.uid()))
             )';

    EXECUTE 'CREATE POLICY "profiles_delete_admin" ON public.profiles
             FOR DELETE
             USING (
               EXISTS (
                 SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = ''admin''
               )
             )';
  END IF;
END $$;

-- Companies
DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "companies_select_public" ON public.companies';
    EXECUTE 'DROP POLICY IF EXISTS "companies_manage_owner" ON public.companies';

    EXECUTE 'CREATE POLICY "companies_select_public" ON public.companies
             FOR SELECT
             USING (auth.role() IS NOT NULL)';

    EXECUTE 'CREATE POLICY "companies_manage_owner" ON public.companies
             FOR ALL
             USING (
               owner_id = auth.uid()
               OR EXISTS (
                 SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = ''admin''
               )
             )
             WITH CHECK (
               owner_id = auth.uid()
               OR EXISTS (
                 SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = ''admin''
               )
             )';
  END IF;
END $$;

-- Addresses
DO $$
BEGIN
  IF to_regclass('public.addresses') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "addresses_access_own" ON public.addresses';

    EXECUTE 'CREATE POLICY "addresses_access_own" ON public.addresses
             FOR ALL
             USING (
               profile_id = auth.uid()
               OR company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
             )
             WITH CHECK (
               profile_id = auth.uid()
               OR company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
             )';
  END IF;
END $$;

-- Jobs
DO $$
BEGIN
  IF to_regclass('public.jobs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "jobs_select_public_or_owner" ON public.jobs';
    EXECUTE 'DROP POLICY IF EXISTS "jobs_insert_owner" ON public.jobs';
    EXECUTE 'DROP POLICY IF EXISTS "jobs_update_owner" ON public.jobs';
    EXECUTE 'DROP POLICY IF EXISTS "jobs_delete_owner" ON public.jobs';

    EXECUTE 'CREATE POLICY "jobs_select_public_or_owner" ON public.jobs
             FOR SELECT
             USING (
               status <> ''draft''
               OR homeowner_id = auth.uid()
             )';

    EXECUTE 'CREATE POLICY "jobs_insert_owner" ON public.jobs
             FOR INSERT
             WITH CHECK (homeowner_id = auth.uid())';

    EXECUTE 'CREATE POLICY "jobs_update_owner" ON public.jobs
             FOR UPDATE
             USING (homeowner_id = auth.uid())
             WITH CHECK (homeowner_id = auth.uid())';

    EXECUTE 'CREATE POLICY "jobs_delete_owner" ON public.jobs
             FOR DELETE
             USING (homeowner_id = auth.uid())';
  END IF;
END $$;

-- Bids
DO $$
BEGIN
  IF to_regclass('public.bids') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "bids_select_owner_or_homeowner" ON public.bids';
    EXECUTE 'DROP POLICY IF EXISTS "bids_insert_contractor" ON public.bids';
    EXECUTE 'DROP POLICY IF EXISTS "bids_update_contractor_or_homeowner" ON public.bids';
    EXECUTE 'DROP POLICY IF EXISTS "bids_delete_contractor" ON public.bids';

    EXECUTE 'CREATE POLICY "bids_select_owner_or_homeowner" ON public.bids
             FOR SELECT
             USING (
               contractor_id = auth.uid()
               OR EXISTS (
                 SELECT 1 FROM public.jobs j
                 WHERE j.id = bids.job_id AND j.homeowner_id = auth.uid()
               )
             )';

    EXECUTE 'CREATE POLICY "bids_insert_contractor" ON public.bids
             FOR INSERT
             WITH CHECK (contractor_id = auth.uid())';

    EXECUTE 'CREATE POLICY "bids_update_contractor_or_homeowner" ON public.bids
             FOR UPDATE
             USING (
               contractor_id = auth.uid()
               OR EXISTS (
                 SELECT 1 FROM public.jobs j
                 WHERE j.id = bids.job_id AND j.homeowner_id = auth.uid()
               )
             )
             WITH CHECK (
               contractor_id = auth.uid()
               OR EXISTS (
                 SELECT 1 FROM public.jobs j
                 WHERE j.id = bids.job_id AND j.homeowner_id = auth.uid()
               )
             )';

    EXECUTE 'CREATE POLICY "bids_delete_contractor" ON public.bids
             FOR DELETE
             USING (contractor_id = auth.uid())';
  END IF;
END $$;

-- Saved jobs (schema: user_id, NOT contractor_id)
DO $$
BEGIN
  IF to_regclass('public.saved_jobs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "saved_jobs_manage_own" ON public.saved_jobs';
    EXECUTE 'CREATE POLICY "saved_jobs_manage_own" ON public.saved_jobs
             FOR ALL
             USING (user_id = auth.uid())
             WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- Job views (schema: viewer_id, NOT contractor_id; homeowner sees views on their job)
DO $$
BEGIN
  IF to_regclass('public.job_views') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "job_views_insert" ON public.job_views';
    EXECUTE 'DROP POLICY IF EXISTS "job_views_select_owner" ON public.job_views';

    EXECUTE 'CREATE POLICY "job_views_insert" ON public.job_views
             FOR INSERT
             WITH CHECK (viewer_id IS NULL OR viewer_id = auth.uid())';

    EXECUTE 'CREATE POLICY "job_views_select_owner" ON public.job_views
             FOR SELECT
             USING (
               viewer_id = auth.uid()
               OR EXISTS (
                 SELECT 1 FROM public.jobs j
                 WHERE j.id = job_views.job_id AND j.homeowner_id = auth.uid()
               )
             )';
  END IF;
END $$;

-- Job milestones (schema: job_id; access via job owner or bid contractor)
DO $$
BEGIN
  IF to_regclass('public.job_milestones') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "job_milestones_access" ON public.job_milestones';
    EXECUTE 'CREATE POLICY "job_milestones_access" ON public.job_milestones
             FOR ALL
             USING (
               EXISTS (
                 SELECT 1 FROM public.jobs j
                 WHERE j.id = job_milestones.job_id
                   AND (j.homeowner_id = auth.uid()
                        OR EXISTS (SELECT 1 FROM public.bids b WHERE b.job_id = j.id AND b.contractor_id = auth.uid()))
               )
             )
             WITH CHECK (
               EXISTS (
                 SELECT 1 FROM public.jobs j
                 WHERE j.id = job_milestones.job_id
                   AND (j.homeowner_id = auth.uid()
                        OR EXISTS (SELECT 1 FROM public.bids b WHERE b.job_id = j.id AND b.contractor_id = auth.uid()))
               )
             )';
  END IF;
END $$;

-- Job guarantees (schema: job_id, bid_id — access via job owner or bid contractor)
DO $$
BEGIN
  IF to_regclass('public.job_guarantees') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "job_guarantees_access" ON public.job_guarantees';
    EXECUTE 'CREATE POLICY "job_guarantees_access" ON public.job_guarantees
             FOR ALL
             USING (
               EXISTS (
                 SELECT 1 FROM public.jobs j
                 WHERE j.id = job_guarantees.job_id
                   AND (j.homeowner_id = auth.uid()
                        OR EXISTS (SELECT 1 FROM public.bids b WHERE b.job_id = j.id AND b.contractor_id = auth.uid()))
               )
             )
             WITH CHECK (
               EXISTS (
                 SELECT 1 FROM public.jobs j
                 WHERE j.id = job_guarantees.job_id
                   AND (j.homeowner_id = auth.uid()
                        OR EXISTS (SELECT 1 FROM public.bids b WHERE b.job_id = j.id AND b.contractor_id = auth.uid()))
               )
             )';
  END IF;
END $$;

-- Payments
DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "payments_select_own" ON public.payments';
    EXECUTE 'DROP POLICY IF EXISTS "payments_service_role" ON public.payments';

    EXECUTE 'CREATE POLICY "payments_select_own" ON public.payments
             FOR SELECT
             USING (
               payer_id = auth.uid()
               OR payee_id = auth.uid()
               OR EXISTS (
                 SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = ''admin''
               )
             )';

    EXECUTE 'CREATE POLICY "payments_service_role" ON public.payments
             FOR ALL
             USING (auth.role() = ''service_role'')
             WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- Payment methods
DO $$
BEGIN
  IF to_regclass('public.payment_methods') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "payment_methods_manage_own" ON public.payment_methods';
    EXECUTE 'CREATE POLICY "payment_methods_manage_own" ON public.payment_methods
             FOR ALL
             USING (user_id = auth.uid())
             WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- Escrow accounts
DO $$
BEGIN
  IF to_regclass('public.escrow_accounts') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "escrow_accounts_select_own" ON public.escrow_accounts';
    EXECUTE 'DROP POLICY IF EXISTS "escrow_accounts_service_role" ON public.escrow_accounts';

    EXECUTE 'CREATE POLICY "escrow_accounts_select_own" ON public.escrow_accounts
             FOR SELECT
             USING (
               EXISTS (
                 SELECT 1 FROM public.payments p
                 WHERE p.id = escrow_accounts.payment_id
                   AND (p.payer_id = auth.uid() OR p.payee_id = auth.uid())
               )
             )';

    EXECUTE 'CREATE POLICY "escrow_accounts_service_role" ON public.escrow_accounts
             FOR ALL
             USING (auth.role() = ''service_role'')
             WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- Security events and audit logs (admin only; insert by service role)
DO $$
BEGIN
  IF to_regclass('public.security_events') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "security_events_admin_read" ON public.security_events';
    EXECUTE 'DROP POLICY IF EXISTS "security_events_service_role" ON public.security_events';

    EXECUTE 'CREATE POLICY "security_events_admin_read" ON public.security_events
             FOR SELECT
             USING (
               EXISTS (
                 SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = ''admin''
               )
             )';

    EXECUTE 'CREATE POLICY "security_events_service_role" ON public.security_events
             FOR INSERT
             WITH CHECK (auth.role() = ''service_role'')';
  END IF;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.audit_logs';
    EXECUTE 'DROP POLICY IF EXISTS "audit_logs_service_role" ON public.audit_logs';

    EXECUTE 'CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
             FOR SELECT
             USING (
               EXISTS (
                 SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = ''admin''
               )
             )';

    EXECUTE 'CREATE POLICY "audit_logs_service_role" ON public.audit_logs
             FOR INSERT
             WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- ML/AI tables (service role only)
DO $$
BEGIN
  IF to_regclass('public.yolo_models') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "yolo_models_service_role" ON public.yolo_models';
    EXECUTE 'CREATE POLICY "yolo_models_service_role" ON public.yolo_models
             FOR ALL
             USING (auth.role() = ''service_role'')
             WITH CHECK (auth.role() = ''service_role'')';
  END IF;

  IF to_regclass('public.confidence_calibration_data') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "confidence_calibration_service_role" ON public.confidence_calibration_data';
    EXECUTE 'CREATE POLICY "confidence_calibration_service_role" ON public.confidence_calibration_data
             FOR ALL
             USING (auth.role() = ''service_role'')
             WITH CHECK (auth.role() = ''service_role'')';
  END IF;

  IF to_regclass('public.hybrid_routing_decisions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "hybrid_routing_service_role" ON public.hybrid_routing_decisions';
    EXECUTE 'CREATE POLICY "hybrid_routing_service_role" ON public.hybrid_routing_decisions
             FOR ALL
             USING (auth.role() = ''service_role'')
             WITH CHECK (auth.role() = ''service_role'')';
  END IF;

  IF to_regclass('public.ai_analysis_results') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "ai_results_service_role" ON public.ai_analysis_results';
    EXECUTE 'CREATE POLICY "ai_results_service_role" ON public.ai_analysis_results
             FOR ALL
             USING (auth.role() = ''service_role'')
             WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

COMMIT;
