-- =====================================================
-- Migration: Fix Supabase Security Advisor Warnings
-- Date: 2026-03-17
-- Addresses:
--   ERROR  (1): spatial_ref_sys missing RLS → revoke anon/authenticated access
--   WARNING(3): RLS policies with USING(true) on ALL operations
--   WARNING(1): notification_engagement INSERT allows any user to write any record
--   WARNING(3): Sensitive materialized views exposed via PostgREST
-- =====================================================

BEGIN;

-- =====================================================
-- 1. FIX ERROR: Revoke public API access to spatial_ref_sys
-- PostGIS extension owns this table so we cannot ALTER it. Revoking
-- anon/authenticated SELECT prevents it being read via PostgREST.
-- service_role (used by backend) still has full access.
-- =====================================================
REVOKE SELECT ON public.spatial_ref_sys FROM anon, authenticated;


-- =====================================================
-- 2. FIX "RLS Policy Always True" — DROP overly broad ALL policies
-- These "service_*" policies were intended for backend use, but service_role
-- bypasses RLS entirely — so they inadvertently grant ALL authenticated users
-- unrestricted read + write on sensitive tables.
-- =====================================================

-- ab_audit_log: admins already have SELECT; authenticated already have INSERT.
DROP POLICY IF EXISTS "service_all_ab_audit" ON public.ab_audit_log;

-- newsletter_subscriptions: admins already have SELECT; anon already have INSERT.
DROP POLICY IF EXISTS "service_all_newsletter" ON public.newsletter_subscriptions;

-- coming_soon_signups: anon already have INSERT. Drop ALL/true policy and add
-- a proper admin-only SELECT policy in its place.
DROP POLICY IF EXISTS "coming_soon_service_manage" ON public.coming_soon_signups;

DROP POLICY IF EXISTS "coming_soon_admin_select" ON public.coming_soon_signups;
CREATE POLICY "coming_soon_admin_select" ON public.coming_soon_signups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- =====================================================
-- 3. FIX notification_engagement INSERT: scope to current user
-- WITH CHECK (true) lets any authenticated user insert engagement records
-- for other users' notifications. Restrict inserts to own user_id only.
-- =====================================================
DROP POLICY IF EXISTS "Service can insert engagement" ON public.notification_engagement;
DROP POLICY IF EXISTS "users_insert_own_engagement" ON public.notification_engagement;

CREATE POLICY "users_insert_own_engagement" ON public.notification_engagement
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- =====================================================
-- 4. FIX "Materialized View in API": revoke public API access
-- dashboard_stats  → exposes total_revenue, active_jobs, active_contractors
-- mv_user_activity → exposes per-user job/bid/rating data with user IDs
-- mv_user_performance_analytics → exposes per-user performance metrics
-- Accessible server-side only (service_role bypasses grants).
-- =====================================================
REVOKE SELECT ON public.dashboard_stats FROM anon, authenticated;
REVOKE SELECT ON public.mv_user_activity FROM anon, authenticated;
REVOKE SELECT ON public.mv_user_performance_analytics FROM anon, authenticated;

GRANT SELECT ON public.dashboard_stats TO service_role;
GRANT SELECT ON public.mv_user_activity TO service_role;
GRANT SELECT ON public.mv_user_performance_analytics TO service_role;


COMMIT;
