-- Migration: Add Verification History Table
-- Created: 2025-02-26
-- Description: Tracks all contractor verification actions (approve, reject, auto-flag) for audit trail

-- ============================================================================
-- Create verification_history table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'auto_flagged', 'auto_approved')),
  reason TEXT,
  verification_score INTEGER CHECK (verification_score >= 0 AND verification_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional metadata for context
  checks_passed JSONB, -- Store automated check results
  previous_status BOOLEAN, -- Previous admin_verified value
  new_status BOOLEAN -- New admin_verified value after action
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_verification_history_user_id ON public.verification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_admin_id ON public.verification_history(admin_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_created_at ON public.verification_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_history_action ON public.verification_history(action);

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================
ALTER TABLE public.verification_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all verification history
CREATE POLICY "Admins can view verification history"
  ON public.verification_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can insert verification history
CREATE POLICY "Admins can insert verification history"
  ON public.verification_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- System can insert verification history (for automated checks)
-- This allows server-side code to log automated verification actions
CREATE POLICY "Service role can insert verification history"
  ON public.verification_history
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE public.verification_history IS 'Audit trail of all contractor verification actions including automated checks and manual approvals/rejections';
COMMENT ON COLUMN public.verification_history.action IS 'Type of verification action: approved, rejected, auto_flagged, auto_approved';
COMMENT ON COLUMN public.verification_history.verification_score IS 'Verification score (0-100) calculated at time of action';
COMMENT ON COLUMN public.verification_history.checks_passed IS 'JSON object storing results of automated verification checks';
COMMENT ON COLUMN public.verification_history.previous_status IS 'Previous admin_verified status before this action';
COMMENT ON COLUMN public.verification_history.new_status IS 'New admin_verified status after this action';

