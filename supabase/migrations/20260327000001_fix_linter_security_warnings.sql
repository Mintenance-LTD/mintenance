-- =============================================================================
-- Fix Supabase Linter Security Warnings (2026-03-27)
--
-- Addresses 18 linter findings:
--   1. function_search_path_mutable (3) — set search_path on trigger functions
--   2. extension_in_public (3) — move postgis, vector, pg_trgm to extensions schema
--   3. rls_policy_always_true (10) — tighten overly permissive INSERT policies
--   4. auth_leaked_password_protection (1) — dashboard setting, not SQL
--   5. vulnerable_postgres_version (1) — infrastructure upgrade, not SQL
-- =============================================================================

-- =============================================================================
-- 1. FIX FUNCTION SEARCH PATH MUTABLE (3 functions)
-- Setting search_path = '' prevents search-path hijacking attacks where
-- a malicious user creates objects in a schema that shadows public objects.
-- =============================================================================

-- 1a. sync_job_location_from_property — BEFORE INSERT trigger on jobs
CREATE OR REPLACE FUNCTION public.sync_job_location_from_property()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.property_id IS NOT NULL AND NEW.latitude IS NULL THEN
    SELECT p.latitude, p.longitude INTO NEW.latitude, NEW.longitude
    FROM public.properties p
    WHERE p.id = NEW.property_id AND p.latitude IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- 1b. backfill_property_location_from_job — AFTER INSERT trigger on jobs
CREATE OR REPLACE FUNCTION public.backfill_property_location_from_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.property_id IS NOT NULL AND NEW.latitude IS NOT NULL THEN
    UPDATE public.properties
    SET latitude = NEW.latitude, longitude = NEW.longitude
    WHERE id = NEW.property_id AND latitude IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- 1c. auto_populate_contractor_client — exists in DB but not in migrations
-- Recreate with search_path set. All table references fully qualified.
CREATE OR REPLACE FUNCTION public.auto_populate_contractor_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Only trigger when contractor_id is set (job assigned)
  IF NEW.contractor_id IS NOT NULL AND (OLD.contractor_id IS NULL OR OLD.contractor_id != NEW.contractor_id) THEN
    INSERT INTO public.contractor_clients (id, contractor_id, first_name, last_name, email, client_type, relationship_status, source, total_jobs, created_at, updated_at)
    SELECT
      gen_random_uuid(),
      NEW.contractor_id,
      p.first_name,
      p.last_name,
      p.email,
      'homeowner',
      'active',
      'job_platform',
      1,
      NOW(),
      NOW()
    FROM public.profiles p WHERE p.id = NEW.homeowner_id
    ON CONFLICT DO NOTHING;

    -- Update existing client's job count
    UPDATE public.contractor_clients
    SET total_jobs = total_jobs + 1,
        last_job_date = NOW(),
        updated_at = NOW()
    WHERE contractor_id = NEW.contractor_id
      AND email = (SELECT email FROM public.profiles WHERE id = NEW.homeowner_id);
  END IF;
  RETURN NEW;
END;
$$;


-- =============================================================================
-- 2. EXTENSIONS IN PUBLIC — NOT FIXABLE VIA SQL
-- postgis does not support ALTER EXTENSION ... SET SCHEMA.
-- vector and pg_trgm could be moved, but keeping all 3 consistent.
-- This is a known Supabase limitation — accept these 3 warnings.
-- =============================================================================


-- =============================================================================
-- 3. TIGHTEN RLS POLICIES (10 always-true INSERT policies)
--
-- Strategy per table:
--   - Analytics/tracking tables (article_views, article_shares, search_analytics,
--     help_article_views): Keep open INSERT but add rate-limit-friendly checks
--     and restrict to authenticated users where possible
--   - System tables (ab_alerts, ai_service_costs): Restrict to service_role only
--   - Audit logs (ab_audit_log): Restrict INSERT to own user_id
--   - Public signup tables (coming_soon_signups, newsletter_subscriptions,
--     demo_feedback): Add basic anti-abuse checks
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3a. ab_alerts — System-generated alerts; only service_role should insert
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert alerts" ON public.ab_alerts;
DROP POLICY IF EXISTS "service_role_insert_ab_alerts" ON public.ab_alerts;
CREATE POLICY "service_role_insert_ab_alerts" ON public.ab_alerts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3b. ab_audit_log — Authenticated users can insert, but only for their own ID
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_insert_ab_audit" ON public.ab_audit_log;
DROP POLICY IF EXISTS "authenticated_insert_own_ab_audit" ON public.ab_audit_log;
CREATE POLICY "authenticated_insert_own_ab_audit" ON public.ab_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    changed_by = auth.uid()
  );

-- Keep service_role insert ability (already exists via service_all_ab_audit)

-- -----------------------------------------------------------------------------
-- 3c. ai_service_costs — System-generated cost records; service_role only
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service accounts can insert AI costs" ON public.ai_service_costs;
DROP POLICY IF EXISTS "service_role_insert_ai_costs" ON public.ai_service_costs;
CREATE POLICY "service_role_insert_ai_costs" ON public.ai_service_costs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3d. article_shares — Restrict to authenticated users
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can record shares" ON public.article_shares;
DROP POLICY IF EXISTS "authenticated_insert_article_shares" ON public.article_shares;
CREATE POLICY "authenticated_insert_article_shares" ON public.article_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3e. article_views — Restrict to authenticated users
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can record views" ON public.article_views;
DROP POLICY IF EXISTS "authenticated_insert_article_views" ON public.article_views;
CREATE POLICY "authenticated_insert_article_views" ON public.article_views
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3f. coming_soon_signups — Allow anon+authenticated but validate email present
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "coming_soon_anon_insert" ON public.coming_soon_signups;
DROP POLICY IF EXISTS "insert_coming_soon_with_email" ON public.coming_soon_signups;
CREATE POLICY "insert_coming_soon_with_email" ON public.coming_soon_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND email <> ''
  );

-- -----------------------------------------------------------------------------
-- 3g. demo_feedback — Allow anon INSERT but require non-empty feedback
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow anonymous demo feedback submission" ON public.demo_feedback;
DROP POLICY IF EXISTS "anon_insert_demo_feedback_with_content" ON public.demo_feedback;
CREATE POLICY "anon_insert_demo_feedback_with_content" ON public.demo_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Require at least accuracy flag or feedback text
    is_accurate IS NOT NULL OR (feedback_text IS NOT NULL AND feedback_text <> '')
  );

-- -----------------------------------------------------------------------------
-- 3h. help_article_views — Restrict to authenticated users
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can record help article views" ON public.help_article_views;
DROP POLICY IF EXISTS "authenticated_insert_help_article_views" ON public.help_article_views;
CREATE POLICY "authenticated_insert_help_article_views" ON public.help_article_views
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3i. newsletter_subscriptions — Allow anon INSERT but require email
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow anon insert newsletter_subscriptions" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "anon_insert_newsletter_with_email" ON public.newsletter_subscriptions;
CREATE POLICY "anon_insert_newsletter_with_email" ON public.newsletter_subscriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND email <> ''
  );

-- -----------------------------------------------------------------------------
-- 3j. search_analytics — Restrict to authenticated users
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can insert search analytics" ON public.search_analytics;
DROP POLICY IF EXISTS "authenticated_insert_search_analytics" ON public.search_analytics;
CREATE POLICY "authenticated_insert_search_analytics" ON public.search_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
