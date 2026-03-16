-- Week 3-4 Audit Fixes Migration
-- 1. Escrow audit log table (HIGH-4)
-- 2. Bid expiry support (Week 4)
-- 3. Job status transition validation trigger (Week 4)
-- 4. Email unsubscribe preferences (GDPR - Week 4)

-- ============================================================================
-- 1. ESCROW AUDIT LOG TABLE (HIGH-4: Admin audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.escrow_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_transaction_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('released', 'held', 'refunded', 'disputed', 'admin_override')),
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  actor_role TEXT NOT NULL,
  job_id UUID NOT NULL,
  amount NUMERIC,
  platform_fee NUMERIC,
  contractor_payout NUMERIC,
  transfer_id TEXT,
  release_reason TEXT,
  is_admin_action BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_escrow_audit_log_escrow_id ON public.escrow_audit_log(escrow_transaction_id);
CREATE INDEX IF NOT EXISTS idx_escrow_audit_log_actor ON public.escrow_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_escrow_audit_log_admin ON public.escrow_audit_log(is_admin_action) WHERE is_admin_action = true;

-- RLS: Only admins can read audit logs, system can insert
ALTER TABLE public.escrow_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY escrow_audit_log_insert_policy ON public.escrow_audit_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY escrow_audit_log_select_admin ON public.escrow_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 2. BID EXPIRY SUPPORT (Week 4)
-- ============================================================================

-- Add expires_at column to bids table (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bids' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.bids ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Index for expired bid queries
CREATE INDEX IF NOT EXISTS idx_bids_expires_at ON public.bids(expires_at) WHERE status = 'pending';

-- ============================================================================
-- 3. JOB STATUS TRANSITION VALIDATION TRIGGER (Week 4)
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_job_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  CASE OLD.status
    WHEN 'draft' THEN
      IF NEW.status NOT IN ('posted', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'open' THEN
      IF NEW.status NOT IN ('posted', 'assigned', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'posted' THEN
      IF NEW.status NOT IN ('assigned', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'assigned' THEN
      IF NEW.status NOT IN ('in_progress', 'cancelled', 'posted') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'in_progress' THEN
      IF NEW.status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'completed' THEN
      -- Completed is a terminal state (except admin override)
      RAISE EXCEPTION 'Cannot transition from completed status';
    WHEN 'cancelled' THEN
      -- Cancelled is a terminal state
      RAISE EXCEPTION 'Cannot transition from cancelled status';
    ELSE
      -- Unknown status — allow (for backward compatibility)
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if present, then create
DROP TRIGGER IF EXISTS trg_validate_job_status ON public.jobs;
CREATE TRIGGER trg_validate_job_status
  BEFORE UPDATE OF status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION validate_job_status_transition();

-- ============================================================================
-- 4. EMAIL UNSUBSCRIBE PREFERENCES (GDPR - Week 4)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  -- Individual email categories
  marketing BOOLEAN DEFAULT true,
  bid_notifications BOOLEAN DEFAULT true,
  job_updates BOOLEAN DEFAULT true,
  payment_notifications BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT true,
  system_notifications BOOLEAN DEFAULT true,
  -- Global unsubscribe
  unsubscribed_all BOOLEAN DEFAULT false,
  -- GDPR
  unsubscribe_token UUID DEFAULT gen_random_uuid(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Index for token-based unsubscribe lookups
CREATE INDEX IF NOT EXISTS idx_email_preferences_token ON public.email_preferences(unsubscribe_token);

-- RLS
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_preferences_own ON public.email_preferences
  FOR ALL USING (user_id = auth.uid());

-- Allow unauthenticated unsubscribe via token (read-only for token lookup)
CREATE POLICY email_preferences_unsubscribe ON public.email_preferences
  FOR SELECT USING (true);
