-- PRODUCTION DATABASE EXTENSIONS
-- Add these tables to complete the production-ready schema
-- Run this AFTER the main supabase-setup.sql

-- Add missing columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_jobs_completed INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT;

-- Add missing columns to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS photos TEXT[];

-- Create contractor_profiles table for verification and business info
CREATE TABLE IF NOT EXISTS public.contractor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  license_number VARCHAR(100),
  license_verified BOOLEAN DEFAULT FALSE,
  insurance_verified BOOLEAN DEFAULT FALSE,
  background_check_status VARCHAR(50) DEFAULT 'pending',
  years_experience INTEGER DEFAULT 0,
  service_radius_km INTEGER DEFAULT 25,
  hourly_rate DECIMAL(8,2),
  availability_status VARCHAR(50) DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contractor_metrics table for real performance tracking
CREATE TABLE IF NOT EXISTS public.contractor_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  total_jobs INTEGER DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  active_jobs INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  monthly_earnings DECIMAL(10,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  response_time_hours INTEGER DEFAULT 24,
  success_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job_analytics table for performance tracking
CREATE TABLE IF NOT EXISTS public.job_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  view_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  completion_time_hours INTEGER,
  client_satisfaction_score INTEGER,
  estimated_duration TEXT,
  actual_duration TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_locations table for precise location tracking
CREATE TABLE IF NOT EXISTS public.user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address_line1 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  is_primary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contractor_skills table for skill matching
CREATE TABLE IF NOT EXISTS public.contractor_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL,
  proficiency_level VARCHAR(20) DEFAULT 'intermediate' CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience INTEGER DEFAULT 1,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews table for rating system
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  reviewed_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table for push notifications
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

-- Create messages table for real-time messaging
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  attachment_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contractor_profiles_user_id ON public.contractor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_contractor_metrics_contractor_id ON public.contractor_metrics(contractor_id);
CREATE INDEX IF NOT EXISTS idx_job_analytics_job_id ON public.job_analytics(job_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON public.user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_contractor_skills_contractor_id ON public.contractor_skills(contractor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON public.reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON public.reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_job_id ON public.messages(job_id);

-- Enable RLS on new tables
ALTER TABLE public.contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Contractors can manage their profiles" ON public.contractor_profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Anyone can view contractor profiles" ON public.contractor_profiles
  FOR SELECT USING (true);

CREATE POLICY "Contractors can view their metrics" ON public.contractor_metrics
  FOR SELECT USING (contractor_id = auth.uid());

CREATE POLICY "Users can view job analytics for their jobs" ON public.job_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_analytics.job_id AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid()))
  );

CREATE POLICY "Users can manage their locations" ON public.user_locations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Contractors can manage their skills" ON public.contractor_skills
  FOR ALL USING (contractor_id = auth.uid());

CREATE POLICY "Anyone can view contractor skills" ON public.contractor_skills
  FOR SELECT USING (true);

CREATE POLICY "Users can view reviews about them" ON public.reviews
  FOR SELECT USING (reviewed_id = auth.uid() OR reviewer_id = auth.uid());

CREATE POLICY "Users can create reviews for completed jobs" ON public.reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Job participants can view messages" ON public.messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Job participants can send messages" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Add triggers for updated_at columns
CREATE TRIGGER update_contractor_profiles_updated_at BEFORE UPDATE ON public.contractor_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_metrics_updated_at BEFORE UPDATE ON public.contractor_metrics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_analytics_updated_at BEFORE UPDATE ON public.job_analytics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_locations_updated_at BEFORE UPDATE ON public.user_locations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update contractor metrics when jobs are completed
CREATE OR REPLACE FUNCTION update_contractor_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.contractor_id IS NOT NULL THEN
    INSERT INTO public.contractor_metrics (contractor_id, total_jobs, completed_jobs, total_earnings)
    VALUES (NEW.contractor_id, 1, 1, NEW.budget)
    ON CONFLICT (contractor_id) DO UPDATE SET
      total_jobs = contractor_metrics.total_jobs + 1,
      completed_jobs = contractor_metrics.completed_jobs + 1,
      total_earnings = contractor_metrics.total_earnings + NEW.budget,
      updated_at = NOW();
      
    -- Update user's total jobs completed
    UPDATE public.users 
    SET total_jobs_completed = total_jobs_completed + 1
    WHERE id = NEW.contractor_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update contractor metrics on job completion
CREATE TRIGGER update_contractor_metrics_on_job_completion
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_contractor_metrics();

-- Function to calculate and update average rating
CREATE OR REPLACE FUNCTION update_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users 
  SET rating = (
    SELECT AVG(rating::decimal) 
    FROM public.reviews 
    WHERE reviewed_id = NEW.reviewed_id
  )
  WHERE id = NEW.reviewed_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update average rating when reviews are added
CREATE TRIGGER update_average_rating_on_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_average_rating();

-- All production database extensions complete!
-- Remember to:
-- 1. Enable Realtime for: jobs, bids, messages, notifications
-- 2. Set up proper environment variables
-- 3. Configure authentication providers
-- 4. Test all user flows with real data