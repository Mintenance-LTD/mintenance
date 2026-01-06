-- Migration: Enhanced Escrow System with Admin Hold and Photo Verification
-- Created: 2025-01-16
-- Description: Adds admin hold, homeowner approval, photo metadata, trust scores, and status logging

BEGIN;

-- ============================================================================
-- UPDATE ESCROW_TRANSACTIONS TABLE
-- ============================================================================

-- Add admin hold fields
ALTER TABLE public.escrow_transactions
ADD COLUMN IF NOT EXISTS admin_hold_status TEXT DEFAULT 'none' CHECK (
  admin_hold_status IN ('none', 'pending_review', 'admin_hold', 'admin_approved')
),
ADD COLUMN IF NOT EXISTS admin_hold_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_hold_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_hold_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMP WITH TIME ZONE;

-- Add homeowner approval fields
ALTER TABLE public.escrow_transactions
ADD COLUMN IF NOT EXISTS homeowner_approval BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS homeowner_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS homeowner_inspection_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS homeowner_inspection_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_approval_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cooling_off_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS dispute_window_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS release_blocked_reason TEXT;

-- Add trust and verification fields
ALTER TABLE public.escrow_transactions
ADD COLUMN IF NOT EXISTS trust_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS photo_quality_passed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS geolocation_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS timestamp_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS before_after_comparison_score DECIMAL(3,2);

-- Update status constraint to include new statuses
ALTER TABLE public.escrow_transactions
DROP CONSTRAINT IF EXISTS escrow_transactions_status_check;

ALTER TABLE public.escrow_transactions
ADD CONSTRAINT escrow_transactions_status_check
CHECK (status IN (
  'pending', 
  'held', 
  'released', 
  'completed', 
  'refunded',
  'admin_hold',
  'admin_review',
  'awaiting_homeowner_approval',
  'cooling_off',
  'dispute_window'
));

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_admin_hold_status 
  ON public.escrow_transactions(admin_hold_status) 
  WHERE admin_hold_status IN ('pending_review', 'admin_hold');

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_homeowner_approval 
  ON public.escrow_transactions(homeowner_approval, auto_approval_date) 
  WHERE homeowner_approval = FALSE;

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_cooling_off 
  ON public.escrow_transactions(cooling_off_ends_at) 
  WHERE cooling_off_ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_trust_score 
  ON public.escrow_transactions(trust_score);

-- ============================================================================
-- JOB_PHOTOS_METADATA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.job_photos_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after', 'progress', 'video')),
  geolocation JSONB, -- {lat: number, lng: number, accuracy: number}
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  quality_score DECIMAL(3,2), -- 0-1
  angle_type TEXT, -- 'wide', 'close-up', 'overhead', 'side', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.users(id)
);

-- Indexes for job_photos_metadata
CREATE INDEX IF NOT EXISTS idx_job_photos_metadata_job_id 
  ON public.job_photos_metadata(job_id);

CREATE INDEX IF NOT EXISTS idx_job_photos_metadata_photo_type 
  ON public.job_photos_metadata(job_id, photo_type);

CREATE INDEX IF NOT EXISTS idx_job_photos_metadata_verified 
  ON public.job_photos_metadata(job_id, verified) 
  WHERE verified = FALSE;

-- ============================================================================
-- HOMEOWNER_APPROVAL_HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.homeowner_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_transaction_id UUID NOT NULL REFERENCES public.escrow_transactions(id) ON DELETE CASCADE,
  homeowner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_changes')),
  comments TEXT,
  photos_reviewed JSONB DEFAULT '[]'::jsonb, -- Array of photo URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for homeowner_approval_history
CREATE INDEX IF NOT EXISTS idx_homeowner_approval_history_escrow 
  ON public.homeowner_approval_history(escrow_transaction_id);

CREATE INDEX IF NOT EXISTS idx_homeowner_approval_history_homeowner 
  ON public.homeowner_approval_history(homeowner_id);

CREATE INDEX IF NOT EXISTS idx_homeowner_approval_history_action 
  ON public.homeowner_approval_history(escrow_transaction_id, action);

-- ============================================================================
-- CONTRACTOR_TRUST_SCORES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contractor_trust_scores (
  contractor_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  trust_score DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (trust_score >= 0 AND trust_score <= 1),
  successful_jobs_count INTEGER DEFAULT 0,
  dispute_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  on_platform_days INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for contractor_trust_scores
CREATE INDEX IF NOT EXISTS idx_contractor_trust_scores_score 
  ON public.contractor_trust_scores(trust_score DESC);

CREATE INDEX IF NOT EXISTS idx_contractor_trust_scores_successful_jobs 
  ON public.contractor_trust_scores(successful_jobs_count DESC);

-- ============================================================================
-- ESCROW_RELEASE_STATUS_LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.escrow_release_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_transaction_id UUID NOT NULL REFERENCES public.escrow_transactions(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  blocking_reason TEXT,
  next_action TEXT,
  estimated_release_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.users(id)
);

-- Indexes for escrow_release_status_log
CREATE INDEX IF NOT EXISTS idx_escrow_release_status_log_escrow 
  ON public.escrow_release_status_log(escrow_transaction_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_escrow_release_status_log_status 
  ON public.escrow_release_status_log(status, created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update last_updated for contractor_trust_scores
CREATE OR REPLACE FUNCTION update_contractor_trust_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contractor_trust_scores_updated_at
  BEFORE UPDATE ON public.contractor_trust_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_contractor_trust_scores_updated_at();

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION log_escrow_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO public.escrow_release_status_log (
      escrow_transaction_id,
      status,
      blocking_reason,
      created_at
    ) VALUES (
      NEW.id,
      NEW.status,
      NEW.release_blocked_reason,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escrow_status_change_log
  AFTER UPDATE OF status ON public.escrow_transactions
  FOR EACH ROW
  EXECUTE FUNCTION log_escrow_status_change();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.job_photos_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeowner_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_release_status_log ENABLE ROW LEVEL SECURITY;

-- Job photos metadata policies
CREATE POLICY "Users can view photos for their jobs"
  ON public.job_photos_metadata
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_photos_metadata.job_id
      AND (
        j.contractor_id = auth.uid()
        OR j.homeowner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Contractors can upload photos for their jobs"
  ON public.job_photos_metadata
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_photos_metadata.job_id
      AND j.contractor_id = auth.uid()
    )
  );

-- Homeowner approval history policies
CREATE POLICY "Users can view approval history for their escrows"
  ON public.homeowner_approval_history
  FOR SELECT
  USING (
    homeowner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.escrow_transactions et
      WHERE et.id = homeowner_approval_history.escrow_transaction_id
      AND (
        et.payer_id = auth.uid()
        OR et.payee_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Homeowners can create approval history"
  ON public.homeowner_approval_history
  FOR INSERT
  WITH CHECK (homeowner_id = auth.uid());

-- Contractor trust scores policies
CREATE POLICY "Contractors can view their own trust scores"
  ON public.contractor_trust_scores
  FOR SELECT
  USING (contractor_id = auth.uid());

CREATE POLICY "Admins can view all trust scores"
  ON public.contractor_trust_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Escrow release status log policies
CREATE POLICY "Users can view status logs for their escrows"
  ON public.escrow_release_status_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.escrow_transactions et
      WHERE et.id = escrow_release_status_log.escrow_transaction_id
      AND (
        et.payer_id = auth.uid()
        OR et.payee_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
        )
      )
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.job_photos_metadata IS 'Stores metadata for job photos including geolocation, timestamp, quality, and angle information';
COMMENT ON TABLE public.homeowner_approval_history IS 'Tracks homeowner approval actions for escrow releases';
COMMENT ON TABLE public.contractor_trust_scores IS 'Maintains contractor trust scores based on job history, disputes, and ratings';
COMMENT ON TABLE public.escrow_release_status_log IS 'Logs all status changes and blocking reasons for escrow transactions';

COMMENT ON COLUMN public.escrow_transactions.admin_hold_status IS 'Admin hold status: none, pending_review, admin_hold, admin_approved';
COMMENT ON COLUMN public.escrow_transactions.homeowner_approval IS 'Whether homeowner has approved completion photos';
COMMENT ON COLUMN public.escrow_transactions.auto_approval_date IS 'Date when auto-approval will trigger if homeowner does not respond (7 days)';
COMMENT ON COLUMN public.escrow_transactions.cooling_off_ends_at IS 'End of 48-hour cooling-off period after homeowner approval';
COMMENT ON COLUMN public.escrow_transactions.trust_score IS 'Contractor trust score (0-1) used to determine hold periods';
COMMENT ON COLUMN public.escrow_transactions.before_after_comparison_score IS 'AI score comparing before and after photos (0-1)';

COMMIT;

