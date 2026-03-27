-- =============================================================================
-- Migration: Fix RLS policy gaps and add missing indexes
-- Date: 2026-03-26
-- Purpose: Tighten materials RLS to require authentication, add granular
--          address policies, and create composite indexes for hot query paths
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: RLS POLICY FIXES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1a. Materials table - tighten SELECT from public to authenticated-only
--
-- The original materials_read_all policy used USING (true) which allows
-- unauthenticated (anon) reads. Replace with authenticated-only access.
-- INSERT/UPDATE/DELETE admin policies already exist and are correct.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.materials') IS NOT NULL THEN
    -- Drop the overly permissive SELECT policy
    EXECUTE 'DROP POLICY IF EXISTS "materials_read_all" ON public.materials';

    -- Re-create with authenticated-only access
    EXECUTE 'CREATE POLICY "materials_select_authenticated" ON public.materials
             FOR SELECT
             TO authenticated
             USING (true)';

    -- Ensure admin write policies exist (idempotent - skip if already present)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'materials' AND policyname = 'materials_admin_insert'
    ) THEN
      EXECUTE 'CREATE POLICY "materials_admin_insert" ON public.materials
               FOR INSERT
               WITH CHECK (
                 EXISTS (
                   SELECT 1 FROM public.profiles
                   WHERE id = auth.uid() AND role = ''admin''
                 )
               )';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'materials' AND policyname = 'materials_admin_update'
    ) THEN
      EXECUTE 'CREATE POLICY "materials_admin_update" ON public.materials
               FOR UPDATE
               USING (
                 EXISTS (
                   SELECT 1 FROM public.profiles
                   WHERE id = auth.uid() AND role = ''admin''
                 )
               )';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'materials' AND policyname = 'materials_admin_delete'
    ) THEN
      EXECUTE 'CREATE POLICY "materials_admin_delete" ON public.materials
               FOR DELETE
               USING (
                 EXISTS (
                   SELECT 1 FROM public.profiles
                   WHERE id = auth.uid() AND role = ''admin''
                 )
               )';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1b. Addresses table - replace broad FOR ALL with granular per-operation policies
--
-- The existing addresses_access_own policy uses FOR ALL which is correct but
-- coarse. Replace with per-operation policies for better auditability and
-- to match the security principle of least privilege.
--
-- Access rule: users can manage addresses linked to their profile_id OR
-- addresses linked to a company they own.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.addresses') IS NOT NULL THEN
    -- Drop the existing broad policy
    EXECUTE 'DROP POLICY IF EXISTS "addresses_access_own" ON public.addresses';

    -- SELECT: users can read their own addresses
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'addresses' AND policyname = 'addresses_select_own'
    ) THEN
      EXECUTE 'CREATE POLICY "addresses_select_own" ON public.addresses
               FOR SELECT
               TO authenticated
               USING (
                 profile_id = auth.uid()
                 OR company_id IN (
                   SELECT id FROM public.companies WHERE owner_id = auth.uid()
                 )
               )';
    END IF;

    -- INSERT: users can insert their own addresses
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'addresses' AND policyname = 'addresses_insert_own'
    ) THEN
      EXECUTE 'CREATE POLICY "addresses_insert_own" ON public.addresses
               FOR INSERT
               TO authenticated
               WITH CHECK (
                 profile_id = auth.uid()
                 OR company_id IN (
                   SELECT id FROM public.companies WHERE owner_id = auth.uid()
                 )
               )';
    END IF;

    -- UPDATE: users can update their own addresses
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'addresses' AND policyname = 'addresses_update_own'
    ) THEN
      EXECUTE 'CREATE POLICY "addresses_update_own" ON public.addresses
               FOR UPDATE
               TO authenticated
               USING (
                 profile_id = auth.uid()
                 OR company_id IN (
                   SELECT id FROM public.companies WHERE owner_id = auth.uid()
                 )
               )
               WITH CHECK (
                 profile_id = auth.uid()
                 OR company_id IN (
                   SELECT id FROM public.companies WHERE owner_id = auth.uid()
                 )
               )';
    END IF;

    -- DELETE: users can delete their own addresses
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'addresses' AND policyname = 'addresses_delete_own'
    ) THEN
      EXECUTE 'CREATE POLICY "addresses_delete_own" ON public.addresses
               FOR DELETE
               TO authenticated
               USING (
                 profile_id = auth.uid()
                 OR company_id IN (
                   SELECT id FROM public.companies WHERE owner_id = auth.uid()
                 )
               )';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- SECTION 2: MISSING INDEXES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2a. payment_methods.stripe_payment_method_id
-- Used by Stripe webhook handlers to look up local records by Stripe ID
-- Source: 003_payment_system.sql defines column stripe_payment_method_id
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id
  ON public.payment_methods(stripe_payment_method_id);

-- -----------------------------------------------------------------------------
-- 2b. contractor_profiles.stripe_account_id
-- Used during payment processing to find contractor by Stripe Connect account
-- Source: 20260208001000 defines column stripe_account_id
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_contractor_profiles_stripe_account
  ON public.contractor_profiles(stripe_account_id);

-- -----------------------------------------------------------------------------
-- 2c. login_attempts(email, created_at DESC)
-- Composite index for rate-limit queries: "count attempts for this email
-- in the last N minutes". Single-column indexes exist but the composite
-- avoids a sort step.
-- Source: 20260208001000 defines email + created_at columns
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created
  ON public.login_attempts(email, created_at DESC);

-- -----------------------------------------------------------------------------
-- 2d. audit_logs(table_name, record_id, created_at DESC)
-- Composite index for incident investigation: "show me all changes to
-- record X in table Y, newest first"
-- Source: 004_security_audit.sql defines table_name, record_id, created_at
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record_created
  ON public.audit_logs(table_name, record_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 2e. security_events(user_id, created_at DESC)
-- Composite index for the security dashboard: "show events for user X,
-- newest first". A single-column idx_security_events_user exists but
-- does not cover the created_at sort.
-- Source: 004_security_audit.sql defines user_id + created_at
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_security_events_user_created
  ON public.security_events(user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 2f. property_favorites(user_id, created_at DESC)
-- Composite index for paginated favorites listing: "show user X's favorites,
-- newest first". Single-column indexes exist but the composite avoids
-- a separate sort.
-- Source: 20260203000002 defines user_id + created_at
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_property_favorites_user_created
  ON public.property_favorites(user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 2g. service_areas.contractor_id
-- NOTE: idx_service_areas_contractor already exists (20260206001000).
-- The service_areas table uses contractor_id, not owner_id.
-- Skipping to avoid a duplicate index.
-- -----------------------------------------------------------------------------
-- Already exists: CREATE INDEX IF NOT EXISTS idx_service_areas_contractor
--   ON public.service_areas(contractor_id);

COMMIT;

-- =============================================================================
-- VERIFICATION (run manually to confirm)
-- =============================================================================

/*
-- Check materials policies (should show materials_select_authenticated + 3 admin policies)
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'materials'
ORDER BY policyname;

-- Check addresses policies (should show 4 granular policies)
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'addresses'
ORDER BY policyname;

-- Check new indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_payment_methods_stripe_id',
  'idx_contractor_profiles_stripe_account',
  'idx_login_attempts_email_created',
  'idx_audit_logs_table_record_created',
  'idx_security_events_user_created',
  'idx_property_favorites_user_created'
)
ORDER BY indexname;
*/

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
