-- Mintenance App Database Schema
-- Run this in your Supabase SQL editor
-- 
-- Setup Instructions:
-- 1. Go to your Supabase dashboard (https://supabase.com/dashboard)
-- 2. Select your project or create a new one
-- 3. Navigate to the SQL Editor
-- 4. Copy and paste this entire script
-- 5. Click "Run" to execute all commands
-- 6. Verify tables were created in the Table Editor

-- Create users table extension
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
CREATE TABLE IF NOT EXISTS public.contractor_payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_id ON public.jobs(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_contractor_id ON public.jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_bids_job_id ON public.bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_contractor_id ON public.bids(contractor_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON public.bids(status);

CREATE INDEX IF NOT EXISTS idx_escrow_job_id ON public.escrow_transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_escrow_payer_id ON public.escrow_transactions(payer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_payee_id ON public.escrow_transactions(payee_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_payout_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for jobs table
CREATE POLICY "Anyone can view posted jobs" ON public.jobs
  FOR SELECT USING (status = 'posted' OR homeowner_id = auth.uid() OR contractor_id = auth.uid());

CREATE POLICY "Homeowners can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (homeowner_id = auth.uid());

CREATE POLICY "Homeowners can update their jobs" ON public.jobs
  FOR UPDATE USING (homeowner_id = auth.uid());

CREATE POLICY "Contractors can update assigned jobs" ON public.jobs
  FOR UPDATE USING (contractor_id = auth.uid());

-- RLS Policies for bids table
CREATE POLICY "Job owners and bid creators can view bids" ON public.bids
  FOR SELECT USING (
    contractor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = bids.job_id AND jobs.homeowner_id = auth.uid())
  );

CREATE POLICY "Contractors can create bids" ON public.bids
  FOR INSERT WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "Bid creators can update their bids" ON public.bids
  FOR UPDATE USING (contractor_id = auth.uid());

-- RLS Policies for escrow_transactions table
CREATE POLICY "Users can view their escrow transactions" ON public.escrow_transactions
  FOR SELECT USING (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE POLICY "Payers can create escrow transactions" ON public.escrow_transactions
  FOR INSERT WITH CHECK (payer_id = auth.uid());

-- RLS Policies for contractor_payout_accounts table
CREATE POLICY "Contractors can manage their payout accounts" ON public.contractor_payout_accounts
  FOR ALL USING (contractor_id = auth.uid());

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

-- Setup complete! 
-- Next steps:
-- 1. Enable Realtime for tables: jobs, bids, escrow_transactions
-- 2. Configure Authentication providers in Auth settings
-- 3. Add your app URL to allowed origins in Auth settings
-- 4. Copy your project URL and anon key to your app's .env file