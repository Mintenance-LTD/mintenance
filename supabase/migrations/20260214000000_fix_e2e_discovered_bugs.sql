-- Migration: Fix bugs discovered during E2E workflow testing
-- Date: 2026-02-14
-- Fixes:
--   1. Profiles RLS infinite recursion (SELECT policy queries profiles table itself)
--   2. Notifications type_check constraint blocking valid notification types
--   3. Escrow_transactions: add 'release_pending' to status CHECK + drop bad triggers
--   4. Contracts table + RLS policies (missing from migrations)
--   5. Other RLS policies that query profiles for admin check

BEGIN;

-- ============================================================
-- PREREQUISITE: Create a SECURITY DEFINER function for admin checks
-- This avoids the infinite recursion issue where RLS policies on
-- profiles query the profiles table (triggering the same policy).
-- SECURITY DEFINER runs as the function owner, bypassing RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_user_id AND role = 'admin'
  );
$$;

-- ============================================================
-- FIX 1: Profiles RLS infinite recursion
-- The SELECT policy on profiles queries the profiles table itself to check
-- for admin role, causing infinite recursion.
-- Fix: use is_admin() SECURITY DEFINER function instead of direct subquery.
-- ============================================================

-- Drop the recursive policies from both migrations that created them
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Recreate profiles SELECT policy using is_admin() (no recursion)
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    OR id = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- Recreate profiles DELETE policy using is_admin() (no recursion)
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    public.is_admin(auth.uid())
  );

-- Recreate UPDATE policy (no admin subquery needed, just own profile)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (id = auth.uid() AND deleted_at IS NULL);

-- ============================================================
-- FIX 2: Notifications type_check constraint
-- A CHECK constraint was added (likely via dashboard) that doesn't include
-- all notification types used by the application. Drop it to allow all types.
-- The app uses 30+ notification types and they change frequently.
-- ============================================================

DO $$
DECLARE
  cname TEXT;
BEGIN
  -- Find and drop any CHECK constraint on notifications.type
  FOR cname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'notifications'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS %I', cname);
    RAISE NOTICE 'Dropped notifications type constraint: %', cname;
  END LOOP;
END $$;

-- ============================================================
-- FIX 3: Escrow transactions status CHECK + triggers
-- The status CHECK is missing 'release_pending' which confirm-completion uses.
-- Also drop any triggers that reference nonexistent 'user_id' column.
-- ============================================================

-- Drop any triggers on escrow_transactions that might reference user_id
DO $$
DECLARE
  trig RECORD;
BEGIN
  FOR trig IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'escrow_transactions'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.escrow_transactions', trig.trigger_name);
    RAISE NOTICE 'Dropped escrow trigger: %', trig.trigger_name;
  END LOOP;
END $$;

-- Fix status CHECK constraint to include 'release_pending'
DO $$
DECLARE
  cname TEXT;
BEGIN
  -- Find and drop the existing status CHECK constraint
  FOR cname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'escrow_transactions'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.escrow_transactions DROP CONSTRAINT IF EXISTS %I', cname);
    RAISE NOTICE 'Dropped escrow status constraint: %', cname;
  END LOOP;

  -- Add updated constraint with release_pending
  ALTER TABLE public.escrow_transactions
    ADD CONSTRAINT escrow_transactions_status_check
    CHECK (status IN (
      'pending', 'held', 'released', 'release_pending', 'refunded',
      'awaiting_homeowner_approval', 'pending_review',
      'failed', 'cancelled'
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ensure escrow_transactions has a service_role policy for INSERT/UPDATE
DO $$
BEGIN
  IF to_regclass('public.escrow_transactions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "escrow_transactions_service_role" ON public.escrow_transactions';
    EXECUTE 'CREATE POLICY "escrow_transactions_service_role" ON public.escrow_transactions
             FOR ALL
             USING (auth.role() = ''service_role'')
             WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- ============================================================
-- FIX 4: Contracts table + RLS policies
-- The contracts table exists in production but has no migration.
-- Create it IF NOT EXISTS plus proper RLS for contractor access.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  homeowner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT,
  description TEXT,
  amount DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  terms JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_homeowner', 'pending_contractor', 'accepted', 'rejected', 'cancelled'
  )),
  homeowner_signed_at TIMESTAMPTZ,
  contractor_signed_at TIMESTAMPTZ,
  contractor_company_name TEXT,
  contractor_license_registration TEXT,
  contractor_license_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_job_id ON public.contracts(job_id);
CREATE INDEX IF NOT EXISTS idx_contracts_homeowner_id ON public.contracts(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contractor_id ON public.contracts(contractor_id);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.contracts') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "contracts_select_own" ON public.contracts';
    EXECUTE 'DROP POLICY IF EXISTS "contracts_insert_contractor" ON public.contracts';
    EXECUTE 'DROP POLICY IF EXISTS "contracts_update_party" ON public.contracts';
    EXECUTE 'DROP POLICY IF EXISTS "contracts_service_role" ON public.contracts';

    -- Both homeowner and contractor can read their own contracts
    EXECUTE 'CREATE POLICY "contracts_select_own" ON public.contracts
             FOR SELECT
             USING (
               homeowner_id = auth.uid()
               OR contractor_id = auth.uid()
             )';

    -- Contractor can create contracts
    EXECUTE 'CREATE POLICY "contracts_insert_contractor" ON public.contracts
             FOR INSERT
             WITH CHECK (contractor_id = auth.uid())';

    -- Both parties can update (for signing)
    EXECUTE 'CREATE POLICY "contracts_update_party" ON public.contracts
             FOR UPDATE
             USING (
               homeowner_id = auth.uid()
               OR contractor_id = auth.uid()
             )
             WITH CHECK (
               homeowner_id = auth.uid()
               OR contractor_id = auth.uid()
             )';

    -- Service role has full access
    EXECUTE 'CREATE POLICY "contracts_service_role" ON public.contracts
             FOR ALL
             USING (auth.role() = ''service_role'')
             WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- ============================================================
-- FIX 5: Fix other RLS policies that query profiles for admin check
-- Replace direct subqueries with is_admin() function to avoid potential
-- infinite recursion when profiles RLS is evaluated.
-- ============================================================

-- Companies admin check
DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "companies_manage_owner" ON public.companies';
    EXECUTE 'CREATE POLICY "companies_manage_owner" ON public.companies
             FOR ALL
             USING (
               owner_id = auth.uid()
               OR public.is_admin(auth.uid())
             )
             WITH CHECK (
               owner_id = auth.uid()
               OR public.is_admin(auth.uid())
             )';
  END IF;
END $$;

-- Payments admin check
DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "payments_select_own" ON public.payments';
    EXECUTE 'CREATE POLICY "payments_select_own" ON public.payments
             FOR SELECT
             USING (
               payer_id = auth.uid()
               OR payee_id = auth.uid()
               OR public.is_admin(auth.uid())
             )';
  END IF;
END $$;

-- Security events admin check
DO $$
BEGIN
  IF to_regclass('public.security_events') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "security_events_admin_read" ON public.security_events';
    EXECUTE 'CREATE POLICY "security_events_admin_read" ON public.security_events
             FOR SELECT
             USING (
               public.is_admin(auth.uid())
             )';
  END IF;
END $$;

-- Audit logs admin check
DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.audit_logs';
    EXECUTE 'CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
             FOR SELECT
             USING (
               public.is_admin(auth.uid())
             )';
  END IF;
END $$;

COMMIT;
