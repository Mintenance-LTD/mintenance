-- RLS Policy Improvements (P3 Optional Enhancements)
-- Date: 2025-01-14
-- Description: Tightens messages policy and adds admin override to payments

-- ============================================================================
-- 1. TIGHTEN MESSAGES POLICY
-- ============================================================================

-- Drop existing broad policy
DROP POLICY IF EXISTS messages_select_policy ON public.messages;

-- Create tightened policy: Only assigned contractors can view messages
CREATE POLICY messages_select_policy
ON public.messages
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR auth.uid() = sender_id
  OR auth.uid() = receiver_id
  OR (
    -- Only contractors ASSIGNED to the job can view messages
    job_id IN (
      SELECT id FROM public.jobs
      WHERE (homeowner_id = auth.uid() OR contractor_id = auth.uid())
        AND contractor_id IS NOT NULL  -- Job must be assigned
    )
  )
);

COMMENT ON POLICY messages_select_policy ON public.messages IS
  'Users can view messages they sent/received, or messages on jobs where they are the assigned contractor or homeowner. Unassigned bidders cannot view job messages.';

-- ============================================================================
-- 2. ADD ADMIN OVERRIDE TO PAYMENTS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their payments as payer or payee" ON public.payments;
DROP POLICY IF EXISTS "Users can create payments as payer" ON public.payments;

-- Recreate with admin override
CREATE POLICY payments_select_policy
ON public.payments
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR auth.uid() = payer_id
  OR auth.uid() = payee_id
);

CREATE POLICY payments_insert_policy
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR auth.uid() = payer_id
);

CREATE POLICY payments_update_policy
ON public.payments
FOR UPDATE
TO authenticated
USING (public.is_admin() OR auth.uid() = payer_id)
WITH CHECK (public.is_admin() OR auth.uid() = payer_id);

COMMENT ON POLICY payments_select_policy ON public.payments IS
  'Users can view payments where they are payer or payee. Admins can view all payments for support.';

COMMENT ON POLICY payments_insert_policy ON public.payments IS
  'Users can create payments as payer. Admins can create payments for manual reconciliation.';

COMMENT ON POLICY payments_update_policy ON public.payments IS
  'Users can update payments they created. Admins can update all payments for support cases.';

-- ============================================================================
-- 3. ADD SECURITY EVENT LOGGING FOR POLICY VIOLATIONS
-- ============================================================================

-- Function to log suspicious message access attempts
CREATE OR REPLACE FUNCTION log_message_access_violation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log if someone tries to access messages on a job they're not assigned to
  IF NOT (
    auth.uid() = NEW.sender_id
    OR auth.uid() = NEW.receiver_id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.jobs
      WHERE id = NEW.job_id
        AND (homeowner_id = auth.uid() OR contractor_id = auth.uid())
        AND contractor_id IS NOT NULL
    )
  ) THEN
    INSERT INTO public.security_events (
      event_type,
      severity,
      user_id,
      ip_address,
      endpoint,
      method,
      details,
      metadata
    ) VALUES (
      'suspicious_activity',
      'medium',
      auth.uid(),
      inet_client_addr(),
      '/messages',
      'SELECT',
      'Attempted to access messages on job without assignment',
      jsonb_build_object('job_id', NEW.job_id, 'message_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Note: Trigger would be created on message access, but RLS blocks before trigger fires
-- This function is for future manual auditing if needed

COMMENT ON FUNCTION log_message_access_violation() IS
  'Logs suspicious attempts to access messages outside of assigned jobs. Used for security monitoring.';

-- ============================================================================
-- 4. VERIFICATION QUERIES (Run manually to test)
-- ============================================================================

-- Test 1: Verify message isolation (as contractor who bid but not assigned)
-- Expected: 0 rows
-- SELECT * FROM messages WHERE job_id = '<job-id-where-not-assigned>';

-- Test 2: Verify payment admin override (as admin)
-- Expected: All payments visible
-- SELECT * FROM payments;

-- Test 3: Verify payment user isolation (as regular user)
-- Expected: Only payments where user is payer or payee
-- SELECT * FROM payments WHERE payer_id != auth.uid() AND payee_id != auth.uid();

-- ============================================================================
-- 5. ROLLBACK SCRIPT (if needed)
-- ============================================================================

/*
-- Rollback to previous policies:

DROP POLICY IF EXISTS messages_select_policy ON public.messages;
CREATE POLICY messages_select_policy
ON public.messages FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR auth.uid() = sender_id
  OR auth.uid() = receiver_id
  OR public.is_job_participant(job_id)  -- Reverts to broad policy
);

DROP POLICY IF EXISTS payments_select_policy ON public.payments;
DROP POLICY IF EXISTS payments_insert_policy ON public.payments;
DROP POLICY IF EXISTS payments_update_policy ON public.payments;

CREATE POLICY "Users can view their payments as payer or payee" ON payments
FOR SELECT USING (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE POLICY "Users can create payments as payer" ON payments
FOR INSERT WITH CHECK (payer_id = auth.uid());
*/
