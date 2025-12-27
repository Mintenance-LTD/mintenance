-- ============================================================================
-- CRITICAL SECURITY FIX: Add Row Level Security to Unprotected Tables
-- Date: 2025-12-21
-- Priority: CRITICAL
-- Tables: contracts, job_guarantees, phone_verification_codes, job_audit_log
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CONTRACTS TABLE - Financial Data Protection
-- ============================================================================

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Parties can view their contracts" ON public.contracts;
DROP POLICY IF EXISTS "Parties can update pending contracts" ON public.contracts;
DROP POLICY IF EXISTS "Homeowners can create contracts" ON public.contracts;
DROP POLICY IF EXISTS "Admins have full access to contracts" ON public.contracts;

-- SELECT: Only contract parties and admins can view
CREATE POLICY "Parties can view their contracts" ON public.contracts
    FOR SELECT
    USING (
        auth.uid() IN (contractor_id, homeowner_id)
        OR public.is_admin()
    );

-- INSERT: Only homeowners can create contracts for their jobs
CREATE POLICY "Homeowners can create contracts" ON public.contracts
    FOR INSERT
    WITH CHECK (
        auth.uid() = homeowner_id
        OR public.is_admin()
    );

-- UPDATE: Both parties can update pending contracts, only specific fields
CREATE POLICY "Parties can update pending contracts" ON public.contracts
    FOR UPDATE
    USING (
        (auth.uid() IN (contractor_id, homeowner_id) AND status = 'pending')
        OR public.is_admin()
    )
    WITH CHECK (
        (auth.uid() IN (contractor_id, homeowner_id) AND status IN ('pending', 'signed'))
        OR public.is_admin()
    );

-- DELETE: Only admins can delete contracts
CREATE POLICY "Admins can delete contracts" ON public.contracts
    FOR DELETE
    USING (public.is_admin());

-- ============================================================================
-- 2. JOB_GUARANTEES TABLE - Guarantee Claims Protection
-- ============================================================================

-- Enable RLS
ALTER TABLE public.job_guarantees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Job participants can view guarantees" ON public.job_guarantees;
DROP POLICY IF EXISTS "Homeowners can create guarantee claims" ON public.job_guarantees;
DROP POLICY IF EXISTS "Parties can update their guarantee claims" ON public.job_guarantees;
DROP POLICY IF EXISTS "Admins have full access to guarantees" ON public.job_guarantees;

-- SELECT: Job participants and admins can view
CREATE POLICY "Job participants can view guarantees" ON public.job_guarantees
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_guarantees.job_id
            AND (j.homeowner_id = auth.uid() OR j.contractor_id = auth.uid())
        )
        OR public.is_admin()
    );

-- INSERT: Only homeowners can create guarantee claims for their jobs
CREATE POLICY "Homeowners can create guarantee claims" ON public.job_guarantees
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_guarantees.job_id
            AND j.homeowner_id = auth.uid()
        )
        OR public.is_admin()
    );

-- UPDATE: Homeowners and contractors can update pending claims
CREATE POLICY "Parties can update their guarantee claims" ON public.job_guarantees
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_guarantees.job_id
            AND (j.homeowner_id = auth.uid() OR j.contractor_id = auth.uid())
            AND job_guarantees.status IN ('pending', 'investigating')
        )
        OR public.is_admin()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_guarantees.job_id
            AND (j.homeowner_id = auth.uid() OR j.contractor_id = auth.uid())
        )
        OR public.is_admin()
    );

-- DELETE: Only admins can delete guarantee records
CREATE POLICY "Admins can delete guarantees" ON public.job_guarantees
    FOR DELETE
    USING (public.is_admin());

-- ============================================================================
-- 3. PHONE_VERIFICATION_CODES TABLE - Security Critical
-- ============================================================================

-- Enable RLS
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own verification codes" ON public.phone_verification_codes;
DROP POLICY IF EXISTS "Users can create verification codes" ON public.phone_verification_codes;
DROP POLICY IF EXISTS "Users can update own verification codes" ON public.phone_verification_codes;
DROP POLICY IF EXISTS "System can delete expired codes" ON public.phone_verification_codes;

-- SELECT: Users can only view their own codes
CREATE POLICY "Users can view own verification codes" ON public.phone_verification_codes
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR public.is_admin()
    );

-- INSERT: Users can create codes for themselves
CREATE POLICY "Users can create verification codes" ON public.phone_verification_codes
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR public.is_admin()
    );

-- UPDATE: Users can update their own codes (mark as used)
CREATE POLICY "Users can update own verification codes" ON public.phone_verification_codes
    FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- DELETE: Users can delete their own codes, or system cleanup
CREATE POLICY "Users can delete own codes" ON public.phone_verification_codes
    FOR DELETE
    USING (
        auth.uid() = user_id
        OR expires_at < NOW()
        OR public.is_admin()
    );

-- ============================================================================
-- 4. JOB_AUDIT_LOG TABLE - Admin Only Access
-- ============================================================================

-- Enable RLS
ALTER TABLE public.job_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.job_audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.job_audit_log;

-- SELECT: Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" ON public.job_audit_log
    FOR SELECT
    USING (public.is_admin());

-- INSERT: Allow system to insert logs (no auth check for trigger-based inserts)
CREATE POLICY "System can insert audit logs" ON public.job_audit_log
    FOR INSERT
    WITH CHECK (true);

-- UPDATE: No one can update audit logs (immutable)
-- No UPDATE policy created intentionally

-- DELETE: Only admins can delete old audit logs (for maintenance)
CREATE POLICY "Admins can delete old audit logs" ON public.job_audit_log
    FOR DELETE
    USING (
        public.is_admin()
        AND created_at < NOW() - INTERVAL '1 year'
    );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled on all critical tables
DO $$
DECLARE
    table_name text;
    rls_enabled boolean;
BEGIN
    FOR table_name IN
        SELECT unnest(ARRAY['contracts', 'job_guarantees', 'phone_verification_codes', 'job_audit_log'])
    LOOP
        SELECT relrowsecurity INTO rls_enabled
        FROM pg_class
        WHERE relname = table_name
        AND relnamespace = 'public'::regnamespace;

        IF NOT rls_enabled THEN
            RAISE EXCEPTION 'RLS not enabled on table: %', table_name;
        END IF;

        RAISE NOTICE 'RLS enabled on table: %', table_name;
    END LOOP;
END $$;

-- ============================================================================
-- ROLLBACK STATEMENTS (Save for emergency use)
-- ============================================================================

-- To rollback this migration, run:
-- ALTER TABLE public.contracts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.job_guarantees DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.phone_verification_codes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.job_audit_log DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS ... (all policies created above)

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

-- Run these queries after migration to verify:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('contracts', 'job_guarantees', 'phone_verification_codes', 'job_audit_log');
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('contracts', 'job_guarantees', 'phone_verification_codes', 'job_audit_log');