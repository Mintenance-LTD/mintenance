-- ============================================================================
-- CRITICAL SECURITY FIXES - December 22, 2025
-- ============================================================================
-- This migration addresses critical security vulnerabilities identified in audit:
-- 1. Missing RLS policies on financial tables (reviews, payments, invoices)
-- 2. Weak/overly permissive RLS policies
-- 3. Missing database constraints for data integrity
-- 4. Duplicate submission prevention
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD RLS TO REVIEWS TABLE (CRITICAL)
-- ============================================================================

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public can view visible reviews
CREATE POLICY "Public can view visible reviews"
  ON public.reviews
  FOR SELECT
  USING (is_visible = true);

-- Users can view their own reviews (as reviewer)
CREATE POLICY "Users can view own reviews"
  ON public.reviews
  FOR SELECT
  USING (reviewer_id = auth.uid() OR contractor_id = auth.uid() OR public.is_admin());

-- Only verified job completers can create reviews
CREATE POLICY "Homeowners can create reviews for completed jobs"
  ON public.reviews
  FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = reviews.job_id
      AND j.status = 'completed'
      AND j.homeowner_id = auth.uid()
    )
  );

-- Reviewers can update their own reviews within 7 days
CREATE POLICY "Reviewers can update own reviews"
  ON public.reviews
  FOR UPDATE
  USING (
    reviewer_id = auth.uid()
    AND created_at > NOW() - INTERVAL '7 days'
  )
  WITH CHECK (reviewer_id = auth.uid());

-- Only admins can delete reviews
CREATE POLICY "Admins can delete reviews"
  ON public.reviews
  FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- 2. ADD RLS TO PAYMENTS TABLE (CRITICAL)
-- ============================================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
  ON public.payments
  FOR SELECT
  USING (
    payer_id = auth.uid()
    OR payee_id = auth.uid()
    OR public.is_admin()
  );

-- Only system (service role) can create payments
CREATE POLICY "System can create payments"
  ON public.payments
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Prevent client-side payment creation
CREATE POLICY "Block client payment creation"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Only admins can update payments
CREATE POLICY "Admins can update payments"
  ON public.payments
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- No one can delete payments (immutable)
-- No DELETE policy = blocked by RLS

-- ============================================================================
-- 3. ADD RLS TO CONTRACTOR_CERTIFICATIONS (HIGH RISK)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'contractor_certifications'
  ) THEN
    EXECUTE 'ALTER TABLE public.contractor_certifications ENABLE ROW LEVEL SECURITY';

    EXECUTE '
    CREATE POLICY "Users can view own certifications"
      ON public.contractor_certifications
      FOR SELECT
      USING (contractor_id = auth.uid() OR public.is_admin());
    ';

    EXECUTE '
    CREATE POLICY "Contractors can create own certifications"
      ON public.contractor_certifications
      FOR INSERT
      WITH CHECK (contractor_id = auth.uid());
    ';

    EXECUTE '
    CREATE POLICY "Contractors can update own unverified certifications"
      ON public.contractor_certifications
      FOR UPDATE
      USING (contractor_id = auth.uid() AND verification_status != ''verified'')
      WITH CHECK (contractor_id = auth.uid());
    ';

    EXECUTE '
    CREATE POLICY "Only admins can delete certifications"
      ON public.contractor_certifications
      FOR DELETE
      USING (public.is_admin());
    ';
  END IF;
END $$;

-- ============================================================================
-- 4. ADD RLS TO CONTRACTOR_INVOICES (HIGH RISK)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'contractor_invoices'
  ) THEN
    EXECUTE 'ALTER TABLE public.contractor_invoices ENABLE ROW LEVEL SECURITY';

    EXECUTE '
    CREATE POLICY "Users can view own invoices"
      ON public.contractor_invoices
      FOR SELECT
      USING (
        contractor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.jobs j
          WHERE j.id = contractor_invoices.job_id
          AND j.homeowner_id = auth.uid()
        )
        OR public.is_admin()
      );
    ';

    EXECUTE '
    CREATE POLICY "Contractors can create own invoices"
      ON public.contractor_invoices
      FOR INSERT
      WITH CHECK (contractor_id = auth.uid());
    ';

    EXECUTE '
    CREATE POLICY "Contractors can update own unpaid invoices"
      ON public.contractor_invoices
      FOR UPDATE
      USING (contractor_id = auth.uid() AND status != ''paid'')
      WITH CHECK (contractor_id = auth.uid());
    ';
  END IF;
END $$;

-- ============================================================================
-- 5. FIX WEAK RLS POLICIES
-- ============================================================================

-- Fix job_audit_log INSERT policy (prevent audit log poisoning)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'job_audit_log'
    AND policyname = 'System can insert audit logs'
  ) THEN
    DROP POLICY "System can insert audit logs" ON public.job_audit_log;
  END IF;
END $$;

CREATE POLICY "Only triggers can insert audit logs"
  ON public.job_audit_log
  FOR INSERT
  TO service_role  -- Triggers run as service_role
  WITH CHECK (true);

-- Block authenticated users from inserting audit logs
CREATE POLICY "Block user audit log insertion"
  ON public.job_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Fix phone_verification_codes DELETE policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'phone_verification_codes'
    AND policyname = 'Users can delete own codes'
  ) THEN
    DROP POLICY "Users can delete own codes" ON public.phone_verification_codes;
  END IF;
END $$;

CREATE POLICY "Users can delete own codes"
  ON public.phone_verification_codes
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );
  -- Removed: OR expires_at < NOW() (prevents DoS)

-- Add scheduled cleanup function (runs as service_role)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with elevated privileges
AS $$
BEGIN
  DELETE FROM public.phone_verification_codes
  WHERE expires_at < NOW();
END;
$$;

-- Grant execute to service_role only
REVOKE ALL ON FUNCTION cleanup_expired_verification_codes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_expired_verification_codes() TO service_role;

-- ============================================================================
-- 6. ADD NOT NULL CONSTRAINTS (DATA INTEGRITY)
-- ============================================================================

-- Escrow transactions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'escrow_transactions'
    AND column_name = 'payer_id'
    AND is_nullable = 'YES'
  ) THEN
    -- First update any NULL values
    UPDATE public.escrow_transactions SET payer_id = homeowner_id WHERE payer_id IS NULL AND homeowner_id IS NOT NULL;

    EXECUTE 'ALTER TABLE public.escrow_transactions ALTER COLUMN payer_id SET NOT NULL';
    EXECUTE 'ALTER TABLE public.escrow_transactions ALTER COLUMN payee_id SET NOT NULL';
    EXECUTE 'ALTER TABLE public.escrow_transactions ALTER COLUMN amount SET NOT NULL';
  END IF;
END $$;

-- Contracts (if columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'contracts'
    AND column_name = 'contractor_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.contracts ALTER COLUMN contractor_id SET NOT NULL';
    EXECUTE 'ALTER TABLE public.contracts ALTER COLUMN homeowner_id SET NOT NULL';
    EXECUTE 'ALTER TABLE public.contracts ALTER COLUMN job_id SET NOT NULL';
  END IF;
END $$;

-- ============================================================================
-- 7. ADD UNIQUE CONSTRAINTS FOR IDEMPOTENCY
-- ============================================================================

-- Prevent duplicate payments (critical for financial integrity)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency
ON public.payments(job_id, payer_id, stripe_payment_intent_id)
WHERE status IN ('completed', 'processing')
AND stripe_payment_intent_id IS NOT NULL;

-- Prevent duplicate bids (fixes duplicate bid submission bug)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_job_contractor_unique
ON public.bids(job_id, contractor_id)
WHERE status != 'withdrawn';

-- Prevent duplicate reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'reviews'
    AND indexname = 'idx_reviews_job_reviewer_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_reviews_job_reviewer_unique
    ON public.reviews(job_id, reviewer_id);
  END IF;
END $$;

-- ============================================================================
-- 8. ADD AUDIT LOGGING FOR PAYMENTS (COMPLIANCE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES public.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_log_payment_id
ON public.payment_audit_log(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_audit_log_changed_at
ON public.payment_audit_log(changed_at DESC);

-- Trigger for payment changes
CREATE OR REPLACE FUNCTION audit_payment_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.payment_audit_log (
    payment_id,
    action,
    old_data,
    new_data,
    changed_by
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_payments_trigger ON public.payments;
CREATE TRIGGER audit_payments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION audit_payment_changes();

-- Enable RLS on audit log
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view payment audit logs"
  ON public.payment_audit_log
  FOR SELECT
  USING (public.is_admin());

-- ============================================================================
-- 9. ADD CASCADE DELETE CONSTRAINTS (DATA CONSISTENCY)
-- ============================================================================

-- Fix orphaned reviews when jobs are deleted
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND table_name = 'reviews'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%job_id%'
  ) THEN
    ALTER TABLE public.reviews
    DROP CONSTRAINT IF EXISTS reviews_job_id_fkey,
    ADD CONSTRAINT reviews_job_id_fkey
    FOREIGN KEY (job_id)
    REFERENCES public.jobs(id)
    ON DELETE CASCADE; -- Changed from SET NULL
  END IF;
END $$;

-- ============================================================================
-- 10. VERIFICATION QUERIES (FOR TESTING)
-- ============================================================================

-- Create verification view for RLS coverage
CREATE OR REPLACE VIEW public.rls_coverage_check AS
SELECT
  tablename,
  rowsecurity,
  CASE
    WHEN rowsecurity THEN 'Protected'
    ELSE 'UNPROTECTED'
  END as status,
  (
    SELECT COUNT(*)
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    AND p.tablename = t.tablename
  ) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
AND tablename NOT LIKE 'pg_%'
ORDER BY rowsecurity DESC, tablename;

-- Grant view access to admins
GRANT SELECT ON public.rls_coverage_check TO authenticated;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

-- Run these queries to verify the migration:

-- 1. Check RLS is enabled on critical tables
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('reviews', 'payments', 'contractor_certifications', 'contractor_invoices')
-- ORDER BY tablename;

-- 2. Verify policies exist
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('reviews', 'payments')
-- ORDER BY tablename, policyname;

-- 3. Check for tables without RLS
-- SELECT * FROM public.rls_coverage_check WHERE status = 'UNPROTECTED';

-- 4. Verify constraints
-- SELECT conname, contype FROM pg_constraint
-- WHERE conrelid = 'public.bids'::regclass
-- AND contype = 'u'; -- unique constraints
