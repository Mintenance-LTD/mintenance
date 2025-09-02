-- Contractor Location and Profile Enhancement Migration
-- Run this in your Supabase SQL editor after the main setup

-- Add location and profile fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_jobs_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;

-- Create contractor_skills table for specializations
CREATE TABLE IF NOT EXISTS public.contractor_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contractor_matches table for swipe functionality
CREATE TABLE IF NOT EXISTS public.contractor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('like', 'pass')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(homeowner_id, contractor_id)
);

-- Create reviews table for contractor ratings
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  reviewed_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_users_location ON public.users(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_users_role_available ON public.users(role, is_available);
CREATE INDEX IF NOT EXISTS idx_contractor_skills_contractor_id ON public.contractor_skills(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_matches_homeowner ON public.contractor_matches(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_contractor_matches_contractor ON public.contractor_matches(contractor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON public.reviews(reviewed_id);

-- Enable RLS for new tables
ALTER TABLE public.contractor_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contractor_skills
CREATE POLICY "Anyone can view contractor skills" ON public.contractor_skills
  FOR SELECT USING (TRUE);

CREATE POLICY "Contractors can manage their skills" ON public.contractor_skills
  FOR ALL USING (contractor_id = auth.uid());

-- RLS Policies for contractor_matches
CREATE POLICY "Users can view their matches" ON public.contractor_matches
  FOR SELECT USING (homeowner_id = auth.uid() OR contractor_id = auth.uid());

CREATE POLICY "Homeowners can create matches" ON public.contractor_matches
  FOR INSERT WITH CHECK (homeowner_id = auth.uid());

CREATE POLICY "Users can update their matches" ON public.contractor_matches
  FOR UPDATE USING (homeowner_id = auth.uid() OR contractor_id = auth.uid());

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (TRUE);

CREATE POLICY "Job participants can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = job_id 
      AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid())
    )
  );

-- Function to update contractor rating after review
CREATE OR REPLACE FUNCTION update_contractor_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users 
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 2)
    FROM public.reviews 
    WHERE reviewed_id = NEW.reviewed_id
  )
  WHERE id = NEW.reviewed_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update rating when new review is added
CREATE TRIGGER update_contractor_rating_trigger
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_contractor_rating();

-- Add some sample contractor data with locations (for testing)
INSERT INTO public.users (id, email, first_name, last_name, role, latitude, longitude, address, bio, is_available) VALUES
  ('550e8400-e29b-41d4-a716-446655440003', 'plumber@test.com', 'Mike', 'Johnson', 'contractor', 40.7128, -74.0060, '123 Main St, New York, NY', 'Experienced plumber with 10+ years of expertise', TRUE),
  ('550e8400-e29b-41d4-a716-446655440004', 'electrician@test.com', 'Sarah', 'Williams', 'contractor', 40.7589, -73.9851, '456 Broadway, New York, NY', 'Licensed electrician specializing in residential work', TRUE),
  ('550e8400-e29b-41d4-a716-446655440005', 'handyman@test.com', 'Tom', 'Brown', 'contractor', 40.7505, -73.9934, '789 5th Ave, New York, NY', 'General contractor for all home maintenance needs', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Add skills for sample contractors
INSERT INTO public.contractor_skills (contractor_id, skill_name) VALUES
  ('550e8400-e29b-41d4-a716-446655440003', 'Plumbing'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Bathroom Renovation'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Electrical Work'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Lighting Installation'),
  ('550e8400-e29b-41d4-a716-446655440005', 'General Maintenance'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Carpentry')
ON CONFLICT DO NOTHING;