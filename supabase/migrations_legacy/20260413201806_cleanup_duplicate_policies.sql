-- Migration: Cleanup exact-duplicate RLS policies

DROP POLICY IF EXISTS "checkout_sessions_service" ON public.checkout_sessions;
DROP POLICY IF EXISTS "invoice_payments_service" ON public.invoice_payments;
DROP POLICY IF EXISTS "login_attempts_service_role" ON public.login_attempts;
DROP POLICY IF EXISTS "password_history_service_role" ON public.password_history;
DROP POLICY IF EXISTS "password_reset_tokens_service_role" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "refunds_service" ON public.refunds;

DROP POLICY IF EXISTS "Admins can view all security events" ON public.security_events;
DROP POLICY IF EXISTS "admins_read_security_events" ON public.security_events;
DROP POLICY IF EXISTS "security_events_admin_read" ON public.security_events;
DROP POLICY IF EXISTS "security_events_select" ON public.security_events;
DROP POLICY IF EXISTS "service_role_manage_security_events" ON public.security_events;
DROP POLICY IF EXISTS "security_events_service_role" ON public.security_events;

DROP POLICY IF EXISTS "Public can view contractor skills" ON public.contractor_skills;
DROP POLICY IF EXISTS "contractor_skills_select_public" ON public.contractor_skills;
DROP POLICY IF EXISTS "Contractors can manage their skills" ON public.contractor_skills;
DROP POLICY IF EXISTS "contractor_skills_manage_own" ON public.contractor_skills;;
