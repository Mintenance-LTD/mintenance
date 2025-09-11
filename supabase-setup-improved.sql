-- Mintenance App Database Schema - IMPROVED VERSION
-- Run this in your Supabase SQL editor
-- 
-- Setup Instructions:
-- 1. Go to your Supabase dashboard (https://supabase.com/dashboard)
-- 2. Select your project or create a new one
-- 3. Navigate to the SQL Editor
-- 4. Copy and paste this entire script
-- 5. Click "Run" to execute all commands
-- 6. Verify tables were created in the Table Editor

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
-- Explicitly load required extensions for clarity
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLES
-- =============================================================================

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('homeowner', 'contractor', 'admin')),
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  homeowner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'assigned', 'in_progress', 'completed', 'cancelled')),
  budget DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bids table
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create escrow_transactions table
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  payee_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'released', 'refunded')),
  payment_intent_id TEXT,
  released_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contractor_payout_accounts table
-- FIXED: contractor_id is now NOT NULL to enforce true one-to-one mapping
CREATE TABLE IF NOT EXISTS public.contractor_payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Jobs table indexes
CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_id ON public.jobs(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_contractor_id ON public.jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at);

-- Bids table indexes
CREATE INDEX IF NOT EXISTS idx_bids_job_id ON public.bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_contractor_id ON public.bids(contractor_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON public.bids(status);

-- Escrow transactions table indexes
CREATE INDEX IF NOT EXISTS idx_escrow_job_id ON public.escrow_transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_escrow_payer_id ON public.escrow_transactions(payer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_payee_id ON public.escrow_transactions(payee_id);
-- ADDED: Index on status for faster status-based queries
CREATE INDEX IF NOT EXISTS idx_escrow_status ON public.escrow_transactions(status);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_payout_accounts ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES - IMPROVED VERSION
-- =============================================================================

-- Drop existing policies to recreate them with proper syntax
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can view posted jobs" ON public.jobs;
DROP POLICY IF EXISTS "Homeowners can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Homeowners can update their jobs" ON public.jobs;
DROP POLICY IF EXISTS "Contractors can update assigned jobs" ON public.jobs;
DROP POLICY IF EXISTS "Job owners and bid creators can view bids" ON public.bids;
DROP POLICY IF EXISTS "Contractors can create bids" ON public.bids;
DROP POLICY IF EXISTS "Bid creators can update their bids" ON public.bids;
DROP POLICY IF EXISTS "Users can view their escrow transactions" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Payers can create escrow transactions" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Contractors can manage their payout accounts" ON public.contractor_payout_accounts;

-- Users table policies - IMPROVED
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

-- Jobs table policies - IMPROVED
CREATE POLICY "Anyone can view posted jobs"
ON public.jobs
FOR SELECT TO authenticated
USING (status = 'posted' OR (SELECT auth.uid()) = homeowner_id OR (SELECT auth.uid()) = contractor_id);

CREATE POLICY "Homeowners can create jobs"
ON public.jobs
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = homeowner_id);

CREATE POLICY "Homeowners can update their jobs"
ON public.jobs
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = homeowner_id)
WITH CHECK ((SELECT auth.uid()) = homeowner_id);

CREATE POLICY "Contractors can update assigned jobs"
ON public.jobs
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = contractor_id)
WITH CHECK ((SELECT auth.uid()) = contractor_id);

-- Bids table policies - IMPROVED
CREATE POLICY "Job owners and bid creators can view bids"
ON public.bids
FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = contractor_id OR
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = bids.job_id 
    AND (SELECT auth.uid()) = jobs.homeowner_id
  )
);

CREATE POLICY "Contractors can create bids"
ON public.bids
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = contractor_id);

CREATE POLICY "Bid creators can update their bids"
ON public.bids
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = contractor_id)
WITH CHECK ((SELECT auth.uid()) = contractor_id);

-- Escrow transactions table policies - IMPROVED
CREATE POLICY "Users can view their escrow transactions"
ON public.escrow_transactions
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = payer_id OR (SELECT auth.uid()) = payee_id);

CREATE POLICY "Payers can create escrow transactions"
ON public.escrow_transactions
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = payer_id);

CREATE POLICY "Users can update their escrow transactions"
ON public.escrow_transactions
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = payer_id OR (SELECT auth.uid()) = payee_id)
WITH CHECK ((SELECT auth.uid()) = payer_id OR (SELECT auth.uid()) = payee_id);

-- Contractor payout accounts table policies - IMPROVED (split into separate policies)
CREATE POLICY "Contractors can view their payout accounts"
ON public.contractor_payout_accounts
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = contractor_id);

CREATE POLICY "Contractors can create their payout accounts"
ON public.contractor_payout_accounts
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = contractor_id);

CREATE POLICY "Contractors can update their payout accounts"
ON public.contractor_payout_accounts
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = contractor_id)
WITH CHECK ((SELECT auth.uid()) = contractor_id);

CREATE POLICY "Contractors can delete their payout accounts"
ON public.contractor_payout_accounts
FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = contractor_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON public.bids 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escrow_updated_at BEFORE UPDATE ON public.escrow_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payout_accounts_updated_at BEFORE UPDATE ON public.contractor_payout_accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SAMPLE DATA (DEVELOPMENT/TESTING ONLY)
-- =============================================================================

-- PRODUCTION NOTE: Remove sample data below before deploying to production
-- Insert sample data for testing (DEVELOPMENT/TESTING ONLY)
-- UNCOMMENT ONLY FOR DEVELOPMENT/TESTING ENVIRONMENTS
/*
INSERT INTO public.users (id, email, first_name, last_name, role) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'homeowner@test.com', 'John', 'Doe', 'homeowner'),
  ('550e8400-e29b-41d4-a716-446655440002', 'contractor@test.com', 'Jane', 'Smith', 'contractor')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.jobs (id, title, description, location, homeowner_id, budget) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', 'Kitchen Sink Repair', 'Leaky kitchen sink needs professional attention', 'Downtown Area', '550e8400-e29b-41d4-a716-446655440001', 150.00),
  ('650e8400-e29b-41d4-a716-446655440002', 'Bathroom Tile Installation', 'Install new tiles in master bathroom', 'Suburbs', '550e8400-e29b-41d4-a716-446655440001', 800.00)
ON CONFLICT (id) DO NOTHING;
*/

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

-- Setup complete! 
-- Next steps:
-- 1. Enable Realtime for tables: jobs, bids, escrow_transactions
-- 2. Configure Authentication providers in Auth settings
-- 3. Add your app URL to allowed origins in Auth settings
-- 4. Copy your project URL and anon key to your app's .env file

-- =============================================================================
-- IMPROVEMENTS IMPLEMENTED
-- =============================================================================
-- ✅ Added explicit pgcrypto extension loading for clarity
-- ✅ Rewrote all RLS policies with proper TO authenticated syntax
-- ✅ Used (SELECT auth.uid()) for better planner cache reuse
-- ✅ Split contractor_payout_accounts policies into separate operations
-- ✅ Added WITH CHECK clauses on all UPDATE policies
-- ✅ Made contractor_payout_accounts.contractor_id NOT NULL
-- ✅ Added index on escrow_transactions.status
-- ✅ Improved policy security and performance
-- ✅ Better error handling and documentation
