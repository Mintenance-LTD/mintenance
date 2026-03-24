-- ================================================================
-- Security Advisor Fixes
-- Resolves Supabase Security Advisor findings:
--   Errors:   Security Definer Views, Exposed Auth Users
--   Warnings: RLS Policy Always True (public role), Function Search Path Mutable
-- ================================================================

-- ================================================================
-- PART 1: Fix Security Definer Views
-- ================================================================

-- 1a. Rebuild v_users without referencing auth.users
--     profiles.email is the source of truth (profiles has email column)
DROP VIEW IF EXISTS public.v_users;
CREATE VIEW public.v_users
  WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.email,
  p.role,
  p.first_name,
  p.last_name,
  p.phone,
  p.address,
  p.profile_image_url,
  p.created_at,
  p.updated_at
FROM public.profiles p;

-- Grant only to authenticated (anon was revoked in 20260318000001)
GRANT SELECT ON public.v_users TO authenticated;

-- 1b. Fix users view: set security_invoker so caller's RLS applies
ALTER VIEW public.users SET (security_invoker = true);

-- 1c. Fix v_contractor_stats: set security_invoker
ALTER VIEW public.v_contractor_stats SET (security_invoker = true);

-- ================================================================
-- PART 2: Fix critical RLS policies bound to {public} with USING(true)
-- These policies let ANY role (including anon) do ALL operations
-- ================================================================

-- checkout_sessions
DROP POLICY IF EXISTS "checkout_sessions_service" ON public.checkout_sessions;
CREATE POLICY "checkout_sessions_service"
  ON public.checkout_sessions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- coming_soon_signups: anon can INSERT (sign up), service manages the rest
DROP POLICY IF EXISTS "Service role manages signups" ON public.coming_soon_signups;
CREATE POLICY "coming_soon_anon_insert"
  ON public.coming_soon_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "coming_soon_service_manage"
  ON public.coming_soon_signups FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- contractor_quotes: was USING(true) — any user could edit ANY quote!
DROP POLICY IF EXISTS "Contractors can manage their own quotes" ON public.contractor_quotes;
CREATE POLICY "Contractors can manage their own quotes"
  ON public.contractor_quotes FOR ALL
  TO authenticated
  USING (contractor_id = auth.uid())
  WITH CHECK (contractor_id = auth.uid());

-- contractor_subscriptions
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.contractor_subscriptions;
CREATE POLICY "Service role can manage subscriptions"
  ON public.contractor_subscriptions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- feature_flag_config
DROP POLICY IF EXISTS "ff_config_service" ON public.feature_flag_config;
CREATE POLICY "ff_config_service"
  ON public.feature_flag_config FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- feature_flag_metrics
DROP POLICY IF EXISTS "ff_metrics_service" ON public.feature_flag_metrics;
CREATE POLICY "ff_metrics_service"
  ON public.feature_flag_metrics FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- feature_flag_rollbacks
DROP POLICY IF EXISTS "ff_rollbacks_service" ON public.feature_flag_rollbacks;
CREATE POLICY "ff_rollbacks_service"
  ON public.feature_flag_rollbacks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- invoice_payments
DROP POLICY IF EXISTS "invoice_payments_service" ON public.invoice_payments;
CREATE POLICY "invoice_payments_service"
  ON public.invoice_payments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- notification_queue
DROP POLICY IF EXISTS "Service can manage queue" ON public.notification_queue;
CREATE POLICY "Service can manage queue"
  ON public.notification_queue FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- payment_tracking
DROP POLICY IF EXISTS "Service role can manage payment tracking" ON public.payment_tracking;
CREATE POLICY "Service role can manage payment tracking"
  ON public.payment_tracking FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- refunds
DROP POLICY IF EXISTS "refunds_service" ON public.refunds;
CREATE POLICY "refunds_service"
  ON public.refunds FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- notifications_insert_policy: anyone could create a notification for any user
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ================================================================
-- PART 3: Fix INSERT-only system table policies (public → service_role)
-- ================================================================

-- escrow_audit_log
DROP POLICY IF EXISTS "escrow_audit_log_insert_policy" ON public.escrow_audit_log;
CREATE POLICY "escrow_audit_log_insert_policy"
  ON public.escrow_audit_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- assessment_evidence
DROP POLICY IF EXISTS "assessment_evidence_insert_service" ON public.assessment_evidence;
CREATE POLICY "assessment_evidence_insert_service"
  ON public.assessment_evidence FOR INSERT
  TO service_role
  WITH CHECK (true);

-- building_assessment_outcomes
DROP POLICY IF EXISTS "System can insert assessment outcomes" ON public.building_assessment_outcomes;
CREATE POLICY "System can insert assessment outcomes"
  ON public.building_assessment_outcomes FOR INSERT
  TO service_role
  WITH CHECK (true);

-- hybrid_routing_decisions
DROP POLICY IF EXISTS "System can insert routing decisions" ON public.hybrid_routing_decisions;
CREATE POLICY "System can insert routing decisions"
  ON public.hybrid_routing_decisions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- integration_logs
DROP POLICY IF EXISTS "integration_logs_system_insert" ON public.integration_logs;
CREATE POLICY "integration_logs_system_insert"
  ON public.integration_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- mfa_attempts
DROP POLICY IF EXISTS "System can insert mfa attempts" ON public.mfa_attempts;
CREATE POLICY "System can insert mfa attempts"
  ON public.mfa_attempts FOR INSERT
  TO service_role
  WITH CHECK (true);

-- platform_fee_transfers
DROP POLICY IF EXISTS "Service role can insert fee transfers" ON public.platform_fee_transfers;
CREATE POLICY "Service role can insert fee transfers"
  ON public.platform_fee_transfers FOR INSERT
  TO service_role
  WITH CHECK (true);

-- pricing_analytics
DROP POLICY IF EXISTS "Only agents can insert pricing analytics" ON public.pricing_analytics;
CREATE POLICY "Only agents can insert pricing analytics"
  ON public.pricing_analytics FOR INSERT
  TO service_role
  WITH CHECK (true);

-- verification_history
DROP POLICY IF EXISTS "Service role can insert verification history" ON public.verification_history;
CREATE POLICY "Service role can insert verification history"
  ON public.verification_history FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ================================================================
-- PART 4: Fix Function Search Path Mutable
-- ALTER FUNCTION/PROCEDURE SET search_path = '' prevents search_path hijacking
-- ================================================================

ALTER FUNCTION public.calculate_distance_km(numeric, numeric, numeric, numeric)
  SET search_path = '';

ALTER FUNCTION public.immutable_array_to_text(text[], text)
  SET search_path = '';

ALTER FUNCTION public.update_updated_at()
  SET search_path = '';

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = '';

ALTER FUNCTION public.update_video_calls_updated_at()
  SET search_path = '';

ALTER FUNCTION public.validate_job_status_transition()
  SET search_path = '';

ALTER FUNCTION public.validate_job_status_transition(text, text, text)
  SET search_path = '';

ALTER FUNCTION public.is_location_in_service_area(uuid, numeric, numeric)
  SET search_path = '';

ALTER FUNCTION public.find_contractors_for_location(numeric, numeric, numeric)
  SET search_path = '';

ALTER FUNCTION public.search_pathology_semantic(vector, double precision, integer)
  SET search_path = '';

ALTER FUNCTION public.cleanup_old_webhook_events()
  SET search_path = '';

ALTER FUNCTION public.mark_webhook_processed(uuid, text, text)
  SET search_path = '';

ALTER FUNCTION public.increment_webhook_retry(uuid)
  SET search_path = '';

ALTER FUNCTION public.check_webhook_idempotency(text, text, text, text, jsonb)
  SET search_path = '';

ALTER PROCEDURE public.recalibrate_conformal_models(boolean)
  SET search_path = '';
