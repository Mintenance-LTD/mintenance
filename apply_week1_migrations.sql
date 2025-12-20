-- =============================================================================
-- Week 1 Critical Fixes - Manual Migration Script
-- =============================================================================
-- Execute this script in Supabase SQL Editor
-- Dashboard URL: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/sql
--
-- This combines our 3 new migration files:
-- 1. 20251208000001_create_messages_table.sql
-- 2. 20251208000002_fix_escrow_table_naming.sql
-- 3. 20251208000003_add_contractor_job_discovery_policy.sql
-- =============================================================================

-- =============================================================================
-- MIGRATION 1: Create Messages Table
-- =============================================================================

-- Create messages table for real-time chat between homeowners and contractors
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachment_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_job_id ON public.messages(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(read) WHERE read = FALSE;

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages'
    AND policyname = 'Users can view messages they sent or received'
  ) THEN
    CREATE POLICY "Users can view messages they sent or received" ON public.messages
      FOR SELECT USING (
        auth.uid() = sender_id OR
        auth.uid() = receiver_id
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages'
    AND policyname = 'Users can send messages'
  ) THEN
    CREATE POLICY "Users can send messages" ON public.messages
      FOR INSERT WITH CHECK (
        auth.uid() = sender_id
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages'
    AND policyname = 'Users can update their own messages'
  ) THEN
    CREATE POLICY "Users can update their own messages" ON public.messages
      FOR UPDATE USING (
        auth.uid() = sender_id OR
        auth.uid() = receiver_id
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages'
    AND policyname = 'Users can delete their sent messages'
  ) THEN
    CREATE POLICY "Users can delete their sent messages" ON public.messages
      FOR DELETE USING (
        auth.uid() = sender_id
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages'
    AND policyname = 'Admin full access to messages'
  ) THEN
    CREATE POLICY "Admin full access to messages" ON public.messages
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Enable Realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add comment
COMMENT ON TABLE public.messages IS 'Real-time messaging between homeowners and contractors for job discussions';

-- =============================================================================
-- MIGRATION 2: Fix Escrow Table Naming
-- =============================================================================

-- Rename the table if it exists with old name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'escrow_payments'
  ) THEN
    ALTER TABLE public.escrow_payments RENAME TO escrow_transactions;

    -- Add comment explaining the change
    COMMENT ON TABLE public.escrow_transactions IS 'Escrow payment tracking for job transactions (renamed from escrow_payments for RLS policy consistency)';
  END IF;
END $$;

-- =============================================================================
-- MIGRATION 3: Add Contractor Job Discovery Policy
-- =============================================================================

-- Add policy for contractors to view posted jobs that are available for bidding
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs'
    AND policyname = 'Contractors can view posted jobs available for bidding'
  ) THEN
    CREATE POLICY "Contractors can view posted jobs available for bidding" ON public.jobs
      FOR SELECT USING (
        status = 'posted' AND contractor_id IS NULL
      );

    -- Add comment
    COMMENT ON POLICY "Contractors can view posted jobs available for bidding" ON public.jobs IS
      'Allows contractors to discover available jobs in the marketplace (status=posted, unassigned)';
  END IF;
END $$;

-- =============================================================================
-- VERIFICATION QUERIES (Optional - Run after applying migrations)
-- =============================================================================

-- Verify messages table
SELECT 'messages table' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')
       THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Verify escrow_transactions table
SELECT 'escrow_transactions table' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'escrow_transactions')
       THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Verify escrow_payments doesn't exist
SELECT 'escrow_payments table (should NOT exist)' as check_name,
       CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'escrow_payments')
       THEN '✅ CORRECTLY REMOVED' ELSE '❌ STILL EXISTS' END as status;

-- Verify job discovery policy
SELECT 'job discovery policy' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname LIKE '%discovery%')
       THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Count messages table indexes (should be 5)
SELECT 'messages indexes count' as check_name,
       (SELECT COUNT(*)::text || ' indexes (expected: 5)'
        FROM pg_indexes WHERE tablename = 'messages') as status;

-- =============================================================================
-- END OF MIGRATIONS
-- =============================================================================
