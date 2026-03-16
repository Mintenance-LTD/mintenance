-- =============================================================================
-- CRITICAL AUDIT FIXES MIGRATION
-- Addresses: CRIT-2 (bid race condition), CRIT-7 (push tokens), HIGH-11 (job status)
-- Date: 2026-03-07
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FIX CRIT-2: Prevent multiple accepted bids per job
-- The check-then-update pattern in bid acceptance is not atomic.
-- This partial unique index ensures only ONE bid can be 'accepted' per job.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_one_accepted_per_job
  ON public.bids (job_id)
  WHERE status = 'accepted';

-- ---------------------------------------------------------------------------
-- FIX HIGH-11: Standardize job status enum
-- The original CHECK allows (draft, open, in_progress, completed, cancelled)
-- but the codebase uses 'posted' and 'assigned'. Add them.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  cname TEXT;
BEGIN
  -- Drop existing status CHECK constraint(s)
  FOR cname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'jobs'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%payment_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.jobs DROP CONSTRAINT %I', cname);
    RAISE NOTICE 'Dropped jobs status constraint: %', cname;
  END LOOP;
END $$;

-- Add the unified status constraint with all valid values
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_status_check
CHECK (status IN ('draft', 'open', 'posted', 'assigned', 'in_progress', 'completed', 'cancelled'));

-- ---------------------------------------------------------------------------
-- FIX CRIT-7: Create user_push_tokens table
-- NotificationService.ts queries this table but it doesn't exist.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('ios', 'android', 'web')),
  device_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, push_token)
);

-- Ensure is_active column exists (table may pre-exist without it)
ALTER TABLE public.user_push_tokens
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Index for fast user token lookups
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id
  ON public.user_push_tokens (user_id)
  WHERE is_active = true;

-- RLS for user_push_tokens
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read their own tokens
CREATE POLICY "user_push_tokens_select_own"
  ON public.user_push_tokens FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own tokens
CREATE POLICY "user_push_tokens_insert_own"
  ON public.user_push_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own tokens (e.g., deactivate)
CREATE POLICY "user_push_tokens_update_own"
  ON public.user_push_tokens FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own tokens (logout)
CREATE POLICY "user_push_tokens_delete_own"
  ON public.user_push_tokens FOR DELETE
  USING (user_id = auth.uid());

-- Service role needs full access for sending notifications
CREATE POLICY "user_push_tokens_service_role"
  ON public.user_push_tokens FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
