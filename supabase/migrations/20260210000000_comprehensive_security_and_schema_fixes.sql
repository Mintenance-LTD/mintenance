-- =====================================================================
-- Comprehensive Security & Schema Fixes
-- =====================================================================
-- This migration addresses all remaining P0-P2 issues from production
-- readiness review:
--
--   1. Disputes table (required for Stripe charge.dispute.* webhooks)
--   2. RLS for remaining unprotected tables (service_areas, service_routes,
--      area_landmarks, area_performance, service_area_coverage, skill_test_*)
--   3. Admin domain enforcement trigger
--   4. Audit log immutability (prevent UPDATE/DELETE on audit_logs)
--   5. Missing database indexes for query performance
--   6. Payment FK constraints tightening
-- =====================================================================

BEGIN;

-- ============================================================
-- 1. DISPUTES TABLE — Required for Stripe webhook compliance
-- ============================================================

CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_dispute_id TEXT UNIQUE NOT NULL,
  charge_id TEXT,
  payment_intent_id TEXT,
  escrow_transaction_id UUID REFERENCES public.escrow_transactions(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'gbp',
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'needs_response',
  evidence_due_by TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Service role: full access (webhook handler)
DROP POLICY IF EXISTS disputes_service_role ON public.disputes;
CREATE POLICY disputes_service_role ON public.disputes
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admins: read all disputes
DROP POLICY IF EXISTS disputes_admin_read ON public.disputes;
CREATE POLICY disputes_admin_read ON public.disputes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE INDEX IF NOT EXISTS idx_disputes_stripe_id ON public.disputes(stripe_dispute_id);
CREATE INDEX IF NOT EXISTS idx_disputes_payment_intent ON public.disputes(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);

-- ============================================================
-- 2. RLS FOR REMAINING UNPROTECTED TABLES
-- ============================================================

-- 2a. service_areas — contractor-owned geographic data
DO $$ BEGIN
  IF to_regclass('public.service_areas') IS NOT NULL THEN
    ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS service_areas_select ON public.service_areas';
    EXECUTE 'CREATE POLICY service_areas_select ON public.service_areas
      FOR SELECT TO authenticated
      USING (is_active = true OR contractor_id = auth.uid())';

    EXECUTE 'DROP POLICY IF EXISTS service_areas_manage_own ON public.service_areas
      FOR ALL TO authenticated
      USING (contractor_id = auth.uid())
      WITH CHECK (contractor_id = auth.uid())';

    EXECUTE 'DROP POLICY IF EXISTS service_areas_service_role ON public.service_areas';
    EXECUTE 'CREATE POLICY service_areas_service_role ON public.service_areas
      FOR ALL TO service_role
      USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- 2b. service_area_coverage — extends service_areas
DO $$ BEGIN
  IF to_regclass('public.service_area_coverage') IS NOT NULL THEN
    ALTER TABLE public.service_area_coverage ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS sac_service_role ON public.service_area_coverage';
    EXECUTE 'CREATE POLICY sac_service_role ON public.service_area_coverage
      FOR ALL TO service_role
      USING (true) WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS sac_read ON public.service_area_coverage';
    EXECUTE 'CREATE POLICY sac_read ON public.service_area_coverage
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.service_areas sa
          WHERE sa.id = service_area_id AND (sa.is_active = true OR sa.contractor_id = auth.uid())
        )
      )';
  END IF;
END $$;

-- 2c. service_routes — extends service_areas
DO $$ BEGIN
  IF to_regclass('public.service_routes') IS NOT NULL THEN
    ALTER TABLE public.service_routes ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS service_routes_service_role ON public.service_routes';
    EXECUTE 'CREATE POLICY service_routes_service_role ON public.service_routes
      FOR ALL TO service_role
      USING (true) WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS service_routes_read ON public.service_routes';
    EXECUTE 'CREATE POLICY service_routes_read ON public.service_routes
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.service_areas sa
          WHERE sa.id = service_area_id AND (sa.is_active = true OR sa.contractor_id = auth.uid())
        )
      )';
  END IF;
END $$;

-- 2d. area_landmarks — extends service_areas
DO $$ BEGIN
  IF to_regclass('public.area_landmarks') IS NOT NULL THEN
    ALTER TABLE public.area_landmarks ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS area_landmarks_service_role ON public.area_landmarks';
    EXECUTE 'CREATE POLICY area_landmarks_service_role ON public.area_landmarks
      FOR ALL TO service_role
      USING (true) WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS area_landmarks_read ON public.area_landmarks';
    EXECUTE 'CREATE POLICY area_landmarks_read ON public.area_landmarks
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.service_areas sa
          WHERE sa.id = service_area_id AND (sa.is_active = true OR sa.contractor_id = auth.uid())
        )
      )';
  END IF;
END $$;

-- 2e. area_performance — extends service_areas
DO $$ BEGIN
  IF to_regclass('public.area_performance') IS NOT NULL THEN
    ALTER TABLE public.area_performance ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS area_performance_service_role ON public.area_performance';
    EXECUTE 'CREATE POLICY area_performance_service_role ON public.area_performance
      FOR ALL TO service_role
      USING (true) WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS area_performance_read ON public.area_performance';
    EXECUTE 'CREATE POLICY area_performance_read ON public.area_performance
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.service_areas sa
          WHERE sa.id = service_area_id AND sa.contractor_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin''
        )
      )';
  END IF;
END $$;

-- 2f. skill_test_templates — admin-managed, read by authenticated
DO $$ BEGIN
  IF to_regclass('public.skill_test_templates') IS NOT NULL THEN
    ALTER TABLE public.skill_test_templates ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS stt_service_role ON public.skill_test_templates';
    EXECUTE 'CREATE POLICY stt_service_role ON public.skill_test_templates
      FOR ALL TO service_role
      USING (true) WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS stt_read ON public.skill_test_templates';
    EXECUTE 'CREATE POLICY stt_read ON public.skill_test_templates
      FOR SELECT TO authenticated
      USING (true)';
  END IF;
END $$;

-- 2g. skill_test_questions — admin-managed, read by authenticated
DO $$ BEGIN
  IF to_regclass('public.skill_test_questions') IS NOT NULL THEN
    ALTER TABLE public.skill_test_questions ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS stq_service_role ON public.skill_test_questions';
    EXECUTE 'CREATE POLICY stq_service_role ON public.skill_test_questions
      FOR ALL TO service_role
      USING (true) WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS stq_read ON public.skill_test_questions';
    EXECUTE 'CREATE POLICY stq_read ON public.skill_test_questions
      FOR SELECT TO authenticated
      USING (true)';
  END IF;
END $$;

-- 2h. skill_test_answers — own answers only
DO $$ BEGIN
  IF to_regclass('public.skill_test_answers') IS NOT NULL THEN
    ALTER TABLE public.skill_test_answers ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS sta_service_role ON public.skill_test_answers';
    EXECUTE 'CREATE POLICY sta_service_role ON public.skill_test_answers
      FOR ALL TO service_role
      USING (true) WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS sta_own ON public.skill_test_answers';
    EXECUTE 'CREATE POLICY sta_own ON public.skill_test_answers
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.skill_test_attempts att
          WHERE att.id = attempt_id AND att.contractor_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.skill_test_attempts att
          WHERE att.id = attempt_id AND att.contractor_id = auth.uid()
        )
      )';
  END IF;
END $$;

-- 2i. skill_test_attempts — own attempts only + admin read
DO $$ BEGIN
  IF to_regclass('public.skill_test_attempts') IS NOT NULL THEN
    ALTER TABLE public.skill_test_attempts ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS stat_service_role ON public.skill_test_attempts';
    EXECUTE 'CREATE POLICY stat_service_role ON public.skill_test_attempts
      FOR ALL TO service_role
      USING (true) WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS stat_own ON public.skill_test_attempts';
    EXECUTE 'CREATE POLICY stat_own ON public.skill_test_attempts
      FOR ALL TO authenticated
      USING (
        contractor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin''
        )
      )
      WITH CHECK (contractor_id = auth.uid())';
  END IF;
END $$;

-- 2j. skill_verification_audits — admin-only read, service_role write
DO $$ BEGIN
  IF to_regclass('public.skill_verification_audits') IS NOT NULL THEN
    ALTER TABLE public.skill_verification_audits ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS sva_service_role ON public.skill_verification_audits';
    EXECUTE 'CREATE POLICY sva_service_role ON public.skill_verification_audits
      FOR ALL TO service_role
      USING (true) WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS sva_admin_read ON public.skill_verification_audits';
    EXECUTE 'CREATE POLICY sva_admin_read ON public.skill_verification_audits
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin''
      ))';
  END IF;
END $$;

-- 2k. titans_effectiveness_reports — admin-only
DO $$ BEGIN
  IF to_regclass('public.titans_effectiveness_reports') IS NOT NULL THEN
    ALTER TABLE public.titans_effectiveness_reports ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS ter_service_role ON public.titans_effectiveness_reports';
    EXECUTE 'CREATE POLICY ter_service_role ON public.titans_effectiveness_reports
      FOR ALL TO service_role
      USING (true) WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS ter_admin_read ON public.titans_effectiveness_reports';
    EXECUTE 'CREATE POLICY ter_admin_read ON public.titans_effectiveness_reports
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin''
      ))';
  END IF;
END $$;

-- ============================================================
-- 3. ADMIN DOMAIN ENFORCEMENT TRIGGER
-- ============================================================
-- Prevents non-@mintenance.com emails from being assigned admin role.
-- Defence-in-depth: even if application code has a bug, DB enforces this.

CREATE OR REPLACE FUNCTION public.enforce_admin_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' AND NEW.email NOT LIKE '%@mintenance.com' THEN
    RAISE EXCEPTION 'Admin role requires @mintenance.com email domain. Got: %', NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS enforce_admin_domain_trigger ON public.profiles;
CREATE TRIGGER enforce_admin_domain_trigger
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_domain();

-- ============================================================
-- 4. AUDIT LOG IMMUTABILITY
-- ============================================================
-- Prevent UPDATE and DELETE on audit_logs table.
-- Audit logs must be append-only for legal defensibility.

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are prohibited.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DO $$ BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS audit_logs_no_update ON public.audit_logs;
    CREATE TRIGGER audit_logs_no_update
      BEFORE UPDATE ON public.audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_audit_log_mutation();

    DROP TRIGGER IF EXISTS audit_logs_no_delete ON public.audit_logs;
    CREATE TRIGGER audit_logs_no_delete
      BEFORE DELETE ON public.audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_audit_log_mutation();
  END IF;
END $$;

-- Also protect security_events table
DO $$ BEGIN
  IF to_regclass('public.security_events') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS security_events_no_update ON public.security_events;
    CREATE TRIGGER security_events_no_update
      BEFORE UPDATE ON public.security_events
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_audit_log_mutation();

    DROP TRIGGER IF EXISTS security_events_no_delete ON public.security_events;
    CREATE TRIGGER security_events_no_delete
      BEFORE DELETE ON public.security_events
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_audit_log_mutation();
  END IF;
END $$;

-- ============================================================
-- 5. MISSING DATABASE INDEXES
-- ============================================================

-- Escrow transactions: frequently queried by payment_intent_id
CREATE INDEX IF NOT EXISTS idx_escrow_payment_intent
  ON public.escrow_transactions(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_escrow_stripe_payment_intent
  ON public.escrow_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_escrow_job_id
  ON public.escrow_transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status
  ON public.escrow_transactions(status);

-- Reviews: frequently queried by reviewed_id for contractor ratings
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id
  ON public.reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id
  ON public.reviews(reviewer_id);

-- Bids: frequently queried by job_id and contractor_id
CREATE INDEX IF NOT EXISTS idx_bids_job_id
  ON public.bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_contractor_id
  ON public.bids(contractor_id);
CREATE INDEX IF NOT EXISTS idx_bids_status
  ON public.bids(status);

-- Jobs: compound index for common query patterns
CREATE INDEX IF NOT EXISTS idx_jobs_status_created
  ON public.jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_status
  ON public.jobs(homeowner_id, status);

-- Notifications: user-specific reads are frequent
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

-- Profiles: role-based queries (admin, contractor, homeowner)
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON public.profiles(stripe_customer_id);

-- Trusted devices: lookup by token
CREATE INDEX IF NOT EXISTS idx_trusted_devices_token
  ON public.trusted_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user
  ON public.trusted_devices(user_id);

-- Pre-MFA sessions: lookup by token
CREATE INDEX IF NOT EXISTS idx_pre_mfa_sessions_token
  ON public.pre_mfa_sessions(session_token);

-- Refresh tokens: lookup patterns
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family
  ON public.refresh_tokens(family_id);

-- ============================================================
-- 6. PAYMENT FK CONSTRAINTS
-- ============================================================
-- Add FK from escrow_transactions to jobs and profiles (if not present)

DO $$ BEGIN
  -- Ensure escrow_transactions.job_id references jobs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'escrow_transactions'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'jobs'
  ) THEN
    BEGIN
      ALTER TABLE public.escrow_transactions
        ADD CONSTRAINT fk_escrow_job
        FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add FK escrow_transactions.job_id -> jobs.id: %', SQLERRM;
    END;
  END IF;

  -- Ensure escrow_transactions.payer_id references profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'escrow_transactions'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'payer_id'
  ) THEN
    BEGIN
      ALTER TABLE public.escrow_transactions
        ADD CONSTRAINT fk_escrow_payer
        FOREIGN KEY (payer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add FK escrow_transactions.payer_id -> profiles.id: %', SQLERRM;
    END;
  END IF;

  -- Ensure escrow_transactions.payee_id references profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'escrow_transactions'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'payee_id'
  ) THEN
    BEGIN
      ALTER TABLE public.escrow_transactions
        ADD CONSTRAINT fk_escrow_payee
        FOREIGN KEY (payee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add FK escrow_transactions.payee_id -> profiles.id: %', SQLERRM;
    END;
  END IF;
END $$;

COMMIT;
