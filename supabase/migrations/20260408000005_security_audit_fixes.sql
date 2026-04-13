-- Migration: Critical RLS & Function Security Fixes
-- Addresses findings from security audit of RLS policies and database functions.

-- ============================================================
-- 1A. FIX ANNOUNCEMENTS RLS (CRITICAL)
-- Current: ALL operations open to {public} with USING(true)
-- Fix: Read-only for authenticated, admin-only for writes
-- ============================================================

DROP POLICY IF EXISTS "admin_manage_announcements" ON public.announcements;

CREATE POLICY "Anyone can read announcements" ON public.announcements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================================
-- 1B. FIX EMAIL_PREFERENCES RLS (HIGH)
-- Current: SELECT with USING(true) exposes all records to anonymous
-- Fix: Scope to own records only
-- ============================================================

DROP POLICY IF EXISTS "email_preferences_unsubscribe" ON public.email_preferences;

-- Unsubscribe flows should go through server actions (service_role), not direct DB access
CREATE POLICY "Users can view own email preferences" ON public.email_preferences
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- 1C. FIX PRICING_ANALYTICS RLS (HIGH)
-- Current: SELECT with USING(true) exposes internal pricing data
-- Fix: Admin-only
-- ============================================================

DROP POLICY IF EXISTS "Everyone can view pricing analytics" ON public.pricing_analytics;

CREATE POLICY "Admins can view pricing analytics" ON public.pricing_analytics
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================================
-- 1D. FIX INCIDENTS RLS (HIGH)
-- Current: Authenticated users can read ALL incidents
-- Fix: Remove the overly permissive policy (admin policies remain)
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can read incidents" ON public.incidents;

-- Existing admin-only SELECT policies remain:
-- "Admins can view incidents" (admin check via subquery)

-- ============================================================
-- 1E. FIX ESCROW_AUTO_RELEASE_RULES RLS (MEDIUM)
-- Current: SELECT with USING(true) exposes business logic
-- Fix: Admin-only
-- ============================================================

DROP POLICY IF EXISTS "Everyone can view auto-release rules" ON public.escrow_auto_release_rules;

CREATE POLICY "Admins can view auto-release rules" ON public.escrow_auto_release_rules
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================================
-- 1F. FIX REVIEWED_ID IN DB FUNCTIONS (HIGH)
-- Both functions reference reviewed_id which will be dropped
-- by migration 20260408000004. Update to use reviewee_id.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_average_rating(user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(rating), 0)
    FROM public.reviews
    WHERE reviewee_id = user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_contractor_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 2)
    FROM public.reviews
    WHERE reviewee_id = NEW.reviewee_id
  )
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1G. FIX IS_ADMIN() SEARCH_PATH (MEDIUM)
-- is_admin(uuid) has unsafe search_path=public, pg_temp
-- pg_temp allows temp schema injection attacks
-- ============================================================

ALTER FUNCTION public.is_admin(UUID) SET search_path = '';
ALTER FUNCTION public.is_admin() SET search_path = '';

-- ============================================================
-- 1H. MAKE PASSWORD FUNCTIONS SECURITY DEFINER (CRITICAL)
-- These handle raw passwords and should run in elevated context
-- ============================================================

ALTER FUNCTION public.hash_password(text) SECURITY DEFINER SET search_path = '';
ALTER FUNCTION public.verify_password(text, text) SECURITY DEFINER SET search_path = '';
ALTER FUNCTION public.check_password_strength(text) SECURITY DEFINER SET search_path = '';

-- ============================================================
-- 1I. MARK READ-ONLY FUNCTIONS AS STABLE
-- Allows PostgreSQL query planner to optimize
-- ============================================================

ALTER FUNCTION public.is_account_locked(UUID) STABLE;
ALTER FUNCTION public.is_job_participant(UUID) STABLE;
