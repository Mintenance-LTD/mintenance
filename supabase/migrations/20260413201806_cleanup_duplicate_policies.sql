-- Migration: Cleanup exact-duplicate RLS policies
-- Removes policies that are identical in logic but have different names.
-- Keeps the more descriptive name in each pair.

-- ============================================================
-- 1. SERVICE ROLE DUPLICATES (exact same: ALL for service_role with true)
-- ============================================================

-- checkout_sessions: keep checkout_sessions_service_role
DROP POLICY IF EXISTS "checkout_sessions_service" ON public.checkout_sessions;

-- invoice_payments: keep invoice_payments_service_role
DROP POLICY IF EXISTS "invoice_payments_service" ON public.invoice_payments;

-- login_attempts: keep login_attempts_service_role_only
DROP POLICY IF EXISTS "login_attempts_service_role" ON public.login_attempts;

-- password_history: keep password_history_service_role_only
DROP POLICY IF EXISTS "password_history_service_role" ON public.password_history;

-- password_reset_tokens: keep password_reset_tokens_service_role_only
DROP POLICY IF EXISTS "password_reset_tokens_service_role" ON public.password_reset_tokens;

-- refunds: keep refunds_service_role
DROP POLICY IF EXISTS "refunds_service" ON public.refunds;

-- ============================================================
-- 2. SECURITY_EVENTS DUPLICATES (5 identical admin SELECT policies)
-- Keep "security_events_select_policy" (uses is_admin()), drop the rest
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all security events" ON public.security_events;
DROP POLICY IF EXISTS "admins_read_security_events" ON public.security_events;
DROP POLICY IF EXISTS "security_events_admin_read" ON public.security_events;
DROP POLICY IF EXISTS "security_events_select" ON public.security_events;

-- Also consolidate service_role: keep Service role can manage, drop the alt
DROP POLICY IF EXISTS "service_role_manage_security_events" ON public.security_events;

-- Also consolidate INSERT: keep security_events_insert_policy, drop alt
DROP POLICY IF EXISTS "security_events_service_role" ON public.security_events;

-- ============================================================
-- 3. CONTRACTOR_SKILLS DUPLICATES
-- Keep: "Anyone can view contractor skills" (SELECT),
--        "Contractors can manage their own skills" (ALL),
--        "contractor_skills_service_role" (service_role ALL)
-- Drop the rest
-- ============================================================

DROP POLICY IF EXISTS "Public can view contractor skills" ON public.contractor_skills;
DROP POLICY IF EXISTS "contractor_skills_select_public" ON public.contractor_skills;
DROP POLICY IF EXISTS "Contractors can manage their skills" ON public.contractor_skills;
DROP POLICY IF EXISTS "contractor_skills_manage_own" ON public.contractor_skills;
