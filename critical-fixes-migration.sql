-- CRITICAL FIXES MIGRATION SCRIPT
-- Run this to apply all Phase 1 database fixes
-- Version: 1.0
-- Date: September 6, 2025

-- IMPORTANT: Run this AFTER main supabase-setup.sql and production-database-extensions.sql

BEGIN;

-- ============================================================================
-- PHASE 1: CRITICAL SCHEMA FIXES
-- ============================================================================

-- Ensure all required columns exist in users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_jobs_completed INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Ensure all required columns exist in jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' 
  CHECK (priority IN ('low', 'medium', 'high'));
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS photos TEXT[];

-- ============================================================================
-- PHASE 2: CREATE MISSING TABLES (if they don't exist)
-- ============================================================================

-- Messages table for real-time messaging
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  attachment_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  reviewed_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contractor skills table
CREATE TABLE IF NOT EXISTS public.contractor_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL,
  proficiency_level VARCHAR(20) DEFAULT 'intermediate' 
    CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience INTEGER DEFAULT 1,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contractor matches table for swipe functionality
CREATE TABLE IF NOT EXISTS public.contractor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action VARCHAR(10) NOT NULL CHECK (action IN ('like', 'pass')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(homeowner_id, contractor_id)
);

-- ============================================================================
-- PHASE 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_location ON public.users(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Jobs table indexes (additional)
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON public.jobs(priority);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs(location);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_job_id ON public.messages(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(receiver_id, read) WHERE read = FALSE;

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Reviews table indexes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON public.reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON public.reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

-- Contractor skills indexes
CREATE INDEX IF NOT EXISTS idx_contractor_skills_contractor_id ON public.contractor_skills(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_skills_skill_name ON public.contractor_skills(skill_name);

-- Contractor matches indexes
CREATE INDEX IF NOT EXISTS idx_contractor_matches_homeowner ON public.contractor_matches(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_contractor_matches_contractor ON public.contractor_matches(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_matches_action ON public.contractor_matches(action);

-- ============================================================================
-- PHASE 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_matches ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PHASE 5: CREATE RLS POLICIES
-- ============================================================================

-- Messages policies
CREATE POLICY IF NOT EXISTS "Users can view their own messages" ON public.messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update their received messages" ON public.messages
  FOR UPDATE USING (receiver_id = auth.uid());

-- Notifications policies
CREATE POLICY IF NOT EXISTS "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Reviews policies
CREATE POLICY IF NOT EXISTS "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can create reviews for completed jobs" ON public.reviews
  FOR INSERT WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE id = job_id 
      AND status = 'completed'
      AND (homeowner_id = auth.uid() OR contractor_id = auth.uid())
    )
  );

-- Contractor skills policies
CREATE POLICY IF NOT EXISTS "Anyone can view contractor skills" ON public.contractor_skills
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Contractors can manage their own skills" ON public.contractor_skills
  FOR ALL USING (contractor_id = auth.uid());

-- Contractor matches policies
CREATE POLICY IF NOT EXISTS "Users can view their own matches" ON public.contractor_matches
  FOR SELECT USING (homeowner_id = auth.uid() OR contractor_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Homeowners can create matches" ON public.contractor_matches
  FOR INSERT WITH CHECK (homeowner_id = auth.uid());

-- ============================================================================
-- PHASE 6: CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Messages updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_messages_updated_at 
  BEFORE UPDATE ON public.messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notifications updated_at trigger  
CREATE TRIGGER IF NOT EXISTS update_notifications_updated_at 
  BEFORE UPDATE ON public.notifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PHASE 7: CREATE USER PROFILE TRIGGER (if not exists)
-- ============================================================================

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

-- Create trigger for new user creation (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- ============================================================================
-- PHASE 8: ENABLE REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for tables that need it
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;

-- ============================================================================
-- PHASE 9: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.messages
    WHERE receiver_id = user_id AND read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's average rating
CREATE OR REPLACE FUNCTION get_user_average_rating(user_id UUID)
RETURNS DECIMAL(3,2) AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(rating), 0)
    FROM public.reviews
    WHERE reviewed_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PHASE 10: GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions for anon users (limited)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.users TO anon;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================

-- Verify tables exist
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'jobs', 'bids', 'messages', 'notifications', 'reviews', 'contractor_skills', 'contractor_matches', 'escrow_transactions')
ORDER BY tablename;

-- Verify indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('users', 'jobs', 'bids', 'messages', 'notifications', 'reviews')
ORDER BY tablename, indexname;

-- Verify RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ CRITICAL FIXES MIGRATION COMPLETED SUCCESSFULLY';
  RAISE NOTICE '📊 Verification: Run the SELECT queries above to verify all tables, indexes, and policies were created correctly';
  RAISE NOTICE '🚀 Next Steps: Test the application functionality and run user journey tests';
END $$;