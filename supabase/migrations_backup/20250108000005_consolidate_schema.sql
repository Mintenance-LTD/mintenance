-- ==========================================================
-- DATABASE SCHEMA CONSOLIDATION MIGRATION
-- Mintenance UK - Production Schema Fix
-- ==========================================================
-- This migration consolidates all schema changes and fixes
-- inconsistencies across multiple migration files
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. CORE TABLES WITH PROPER CONSTRAINTS
-- ==========================================================

-- Add missing columns to existing users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_jobs_completed INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'UK';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS postcode TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add constraints to existing columns (drop first if exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('homeowner', 'contractor', 'admin'));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_rating_check') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_rating_check CHECK (rating >= 0 AND rating <= 5);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_total_jobs_check') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_total_jobs_check CHECK (total_jobs_completed >= 0);
    END IF;
END $$;

-- Add missing columns to existing jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS photos TEXT[];
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add constraints to existing jobs table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_title_length_check') THEN
        ALTER TABLE public.jobs ADD CONSTRAINT jobs_title_length_check CHECK (LENGTH(title) >= 5 AND LENGTH(title) <= 200);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_description_length_check') THEN
        ALTER TABLE public.jobs ADD CONSTRAINT jobs_description_length_check CHECK (LENGTH(description) >= 10 AND LENGTH(description) <= 5000);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_status_check') THEN
        ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('posted', 'assigned', 'in_progress', 'completed', 'cancelled'));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_budget_positive_check') THEN
        ALTER TABLE public.jobs ADD CONSTRAINT jobs_budget_positive_check CHECK (budget > 0);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_payment_status_check') THEN
        ALTER TABLE public.jobs ADD CONSTRAINT jobs_payment_status_check CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed', 'canceled'));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_priority_check') THEN
        ALTER TABLE public.jobs ADD CONSTRAINT jobs_priority_check CHECK (priority IN ('low', 'medium', 'high'));
    END IF;
END $$;

-- Add constraints to existing bids table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bids_amount_positive_check') THEN
        ALTER TABLE public.bids ADD CONSTRAINT bids_amount_positive_check CHECK (amount > 0);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bids_description_length_check') THEN
        ALTER TABLE public.bids ADD CONSTRAINT bids_description_length_check CHECK (LENGTH(description) >= 10 AND LENGTH(description) <= 2000);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bids_status_check') THEN
        ALTER TABLE public.bids ADD CONSTRAINT bids_status_check CHECK (status IN ('pending', 'accepted', 'rejected'));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bids_unique_job_contractor') THEN
        ALTER TABLE public.bids ADD CONSTRAINT bids_unique_job_contractor UNIQUE(job_id, contractor_id);
    END IF;
END $$;

-- Create missing tables that don't exist yet
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  attachment_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewed_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints to messages table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_content_length_check') THEN
        ALTER TABLE public.messages ADD CONSTRAINT messages_content_length_check CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 2000);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_type_check') THEN
        ALTER TABLE public.messages ADD CONSTRAINT messages_type_check CHECK (message_type IN ('text', 'image', 'file'));
    END IF;
END $$;

-- Add constraints to existing notifications table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_title_length_check') THEN
        ALTER TABLE public.notifications ADD CONSTRAINT notifications_title_length_check CHECK (LENGTH(title) >= 1 AND LENGTH(title) <= 255);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_message_length_check') THEN
        ALTER TABLE public.notifications ADD CONSTRAINT notifications_message_length_check CHECK (LENGTH(message) >= 1 AND LENGTH(message) <= 1000);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check') THEN
        ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('info', 'warning', 'error', 'success'));
    END IF;
END $$;

-- Add constraints to existing reviews table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_rating_check') THEN
        ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_comment_length_check') THEN
        ALTER TABLE public.reviews ADD CONSTRAINT reviews_comment_length_check CHECK (LENGTH(comment) <= 1000);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_unique_job_reviewer') THEN
        ALTER TABLE public.reviews ADD CONSTRAINT reviews_unique_job_reviewer UNIQUE(job_id, reviewer_id);
    END IF;
END $$;

-- Add constraints to existing escrow_transactions table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'escrow_amount_positive_check') THEN
        ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_amount_positive_check CHECK (amount > 0);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'escrow_status_check') THEN
        ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_status_check CHECK (status IN ('pending', 'held', 'released', 'refunded'));
    END IF;
END $$;

-- Add constraints to existing contractor_payout_accounts table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payout_accounts_unique_contractor') THEN
        ALTER TABLE public.contractor_payout_accounts ADD CONSTRAINT payout_accounts_unique_contractor UNIQUE(contractor_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payout_accounts_unique_stripe') THEN
        ALTER TABLE public.contractor_payout_accounts ADD CONSTRAINT payout_accounts_unique_stripe UNIQUE(stripe_account_id);
    END IF;
END $$;

-- ==========================================================
-- 2. PERFORMANCE INDEXES
-- ==========================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_location ON public.users(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_active ON public.users(last_active_at DESC) WHERE is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_rating ON public.users(rating DESC) WHERE role = 'contractor';

-- Jobs table indexes
CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_id ON public.jobs(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_contractor_id ON public.jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON public.jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_budget ON public.jobs(budget);
CREATE INDEX IF NOT EXISTS idx_jobs_payment_status ON public.jobs(payment_status);

-- Bids table indexes
CREATE INDEX IF NOT EXISTS idx_bids_job_id ON public.bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_contractor_id ON public.bids(contractor_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON public.bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON public.bids(amount);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_job_id ON public.messages(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(receiver_id, read) WHERE read = FALSE;

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Reviews table indexes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON public.reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON public.reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

-- Escrow transactions indexes
CREATE INDEX IF NOT EXISTS idx_escrow_job_id ON public.escrow_transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_escrow_payer_id ON public.escrow_transactions(payer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_payee_id ON public.escrow_transactions(payee_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON public.escrow_transactions(status);

-- ==========================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ==========================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_payout_accounts ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  );
$$;

-- Helper function to check job participation
CREATE OR REPLACE FUNCTION public.is_job_participant(job_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
         OR EXISTS (
           SELECT 1
           FROM public.jobs j
           WHERE j.id = job_id
             AND auth.uid() IN (j.homeowner_id, j.contractor_id)
         );
$$;

-- Users table policies
DROP POLICY IF EXISTS users_select_policy ON public.users;
CREATE POLICY users_select_policy ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS users_update_policy ON public.users;
CREATE POLICY users_update_policy ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS users_insert_policy ON public.users;
CREATE POLICY users_insert_policy ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Jobs table policies
DROP POLICY IF EXISTS jobs_select_policy ON public.jobs;
CREATE POLICY jobs_select_policy ON public.jobs
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR auth.uid() = homeowner_id
    OR auth.uid() = contractor_id
    OR status = 'posted'
  );

DROP POLICY IF EXISTS jobs_insert_policy ON public.jobs;
CREATE POLICY jobs_insert_policy ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = homeowner_id);

DROP POLICY IF EXISTS jobs_update_policy ON public.jobs;
CREATE POLICY jobs_update_policy ON public.jobs
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR auth.uid() = homeowner_id OR auth.uid() = contractor_id)
  WITH CHECK (public.is_admin() OR auth.uid() = homeowner_id OR auth.uid() = contractor_id);

DROP POLICY IF EXISTS jobs_delete_policy ON public.jobs;
CREATE POLICY jobs_delete_policy ON public.jobs
  FOR DELETE TO authenticated
  USING (public.is_admin() OR auth.uid() = homeowner_id);

-- Bids table policies
DROP POLICY IF EXISTS bids_select_policy ON public.bids;
CREATE POLICY bids_select_policy ON public.bids
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR auth.uid() = contractor_id
    OR EXISTS (
      SELECT 1
      FROM public.jobs j
      WHERE j.id = job_id
        AND auth.uid() = j.homeowner_id
    )
  );

DROP POLICY IF EXISTS bids_insert_policy ON public.bids;
CREATE POLICY bids_insert_policy ON public.bids
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = contractor_id);

DROP POLICY IF EXISTS bids_update_policy ON public.bids;
CREATE POLICY bids_update_policy ON public.bids
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR auth.uid() = contractor_id)
  WITH CHECK (public.is_admin() OR auth.uid() = contractor_id);

DROP POLICY IF EXISTS bids_delete_policy ON public.bids;
CREATE POLICY bids_delete_policy ON public.bids
  FOR DELETE TO authenticated
  USING (public.is_admin() OR auth.uid() = contractor_id);

-- Messages table policies
DROP POLICY IF EXISTS messages_select_policy ON public.messages;
CREATE POLICY messages_select_policy ON public.messages
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR public.is_job_participant(job_id)
  );

DROP POLICY IF EXISTS messages_insert_policy ON public.messages;
CREATE POLICY messages_insert_policy ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = sender_id);

DROP POLICY IF EXISTS messages_update_policy ON public.messages;
CREATE POLICY messages_update_policy ON public.messages
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR auth.uid() = sender_id)
  WITH CHECK (public.is_admin() OR auth.uid() = sender_id);

-- Notifications table policies
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
CREATE POLICY notifications_select_policy ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS notifications_update_policy ON public.notifications;
CREATE POLICY notifications_update_policy ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Reviews table policies
DROP POLICY IF EXISTS reviews_select_policy ON public.reviews;
CREATE POLICY reviews_select_policy ON public.reviews
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS reviews_insert_policy ON public.reviews;
CREATE POLICY reviews_insert_policy ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE id = job_id
        AND status = 'completed'
        AND (homeowner_id = auth.uid() OR contractor_id = auth.uid())
    )
  );

-- Escrow transactions policies
DROP POLICY IF EXISTS escrow_select_policy ON public.escrow_transactions;
CREATE POLICY escrow_select_policy ON public.escrow_transactions
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR auth.uid() = payer_id
    OR auth.uid() = payee_id
    OR public.is_job_participant(job_id)
  );

DROP POLICY IF EXISTS escrow_insert_policy ON public.escrow_transactions;
CREATE POLICY escrow_insert_policy ON public.escrow_transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = payer_id);

DROP POLICY IF EXISTS escrow_update_policy ON public.escrow_transactions;
CREATE POLICY escrow_update_policy ON public.escrow_transactions
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR auth.uid() = payer_id OR auth.uid() = payee_id)
  WITH CHECK (public.is_admin() OR auth.uid() = payer_id OR auth.uid() = payee_id);

-- Contractor payout accounts policies
DROP POLICY IF EXISTS payout_accounts_select_policy ON public.contractor_payout_accounts;
CREATE POLICY payout_accounts_select_policy ON public.contractor_payout_accounts
  FOR SELECT TO authenticated
  USING (public.is_admin() OR auth.uid() = contractor_id);

DROP POLICY IF EXISTS payout_accounts_insert_policy ON public.contractor_payout_accounts;
CREATE POLICY payout_accounts_insert_policy ON public.contractor_payout_accounts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = contractor_id);

DROP POLICY IF EXISTS payout_accounts_update_policy ON public.contractor_payout_accounts;
CREATE POLICY payout_accounts_update_policy ON public.contractor_payout_accounts
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR auth.uid() = contractor_id)
  WITH CHECK (public.is_admin() OR auth.uid() = contractor_id);

-- ==========================================================
-- 4. TRIGGERS AND FUNCTIONS
-- ==========================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bids_updated_at ON public.bids;
CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON public.bids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_escrow_updated_at ON public.escrow_transactions;
CREATE TRIGGER update_escrow_updated_at BEFORE UPDATE ON public.escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payout_accounts_updated_at ON public.contractor_payout_accounts;
CREATE TRIGGER update_payout_accounts_updated_at BEFORE UPDATE ON public.contractor_payout_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'homeowner'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    role = COALESCE(EXCLUDED.role, users.role),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==========================================================
-- 5. GRANT PERMISSIONS
-- ==========================================================

-- Grant necessary permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions for anon users (limited)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.users TO anon;

-- ==========================================================
-- 6. COMMENTS AND DOCUMENTATION
-- ==========================================================

COMMENT ON TABLE public.users IS 'User profiles for homeowners, contractors, and admins';
COMMENT ON TABLE public.jobs IS 'Job postings and assignments';
COMMENT ON TABLE public.bids IS 'Contractor bids on jobs';
COMMENT ON TABLE public.messages IS 'Real-time messaging between users';
COMMENT ON TABLE public.notifications IS 'System notifications for users';
COMMENT ON TABLE public.reviews IS 'User reviews and ratings';
COMMENT ON TABLE public.escrow_transactions IS 'Payment escrow transactions';
COMMENT ON TABLE public.contractor_payout_accounts IS 'Contractor payment account information';

COMMIT;
