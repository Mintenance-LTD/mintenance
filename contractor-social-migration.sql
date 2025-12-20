-- Contractor Social Feed Migration
-- Run this after the main contractor-location-migration.sql

-- Create contractor_posts table for social sharing
CREATE TABLE IF NOT EXISTS public.contractor_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL CHECK (post_type IN ('work_showcase', 'help_request', 'tip_share', 'equipment_share', 'referral_request')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  
  -- For work showcase posts
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  skills_used TEXT[],
  materials_used TEXT[],
  project_duration INTEGER, -- in hours
  project_cost DECIMAL(10,2),
  
  -- For help requests
  help_category TEXT, -- 'technical', 'material', 'equipment', 'referral'
  location_needed TEXT,
  urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high')),
  budget_range DECIMAL(10,2),
  
  -- For equipment/material sharing
  item_name TEXT,
  item_condition TEXT,
  rental_price DECIMAL(10,2),
  available_from TIMESTAMP WITH TIME ZONE,
  available_until TIMESTAMP WITH TIME ZONE,
  
  -- Engagement metrics
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  
  -- Moderation
  is_active BOOLEAN DEFAULT TRUE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  moderated_at TIMESTAMP WITH TIME ZONE,
  moderated_by UUID REFERENCES public.users(id),
  
  -- Location for local contractor networking
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_radius INTEGER DEFAULT 50, -- km radius for visibility
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contractor_post_likes table
CREATE TABLE IF NOT EXISTS public.contractor_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.contractor_posts(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, contractor_id)
);

-- Create contractor_post_comments table
CREATE TABLE IF NOT EXISTS public.contractor_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.contractor_posts(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.contractor_post_comments(id) ON DELETE CASCADE,
  is_solution BOOLEAN DEFAULT FALSE, -- Mark helpful answers
  solution_verified_by UUID REFERENCES public.users(id),
  likes_count INTEGER DEFAULT 0,
  is_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contractor_follows table for networking
CREATE TABLE IF NOT EXISTS public.contractor_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create contractor_expertise_endorsements table
CREATE TABLE IF NOT EXISTS public.contractor_expertise_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  endorser_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  endorsement_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contractor_id, endorser_id, skill_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contractor_posts_contractor_id ON public.contractor_posts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_posts_type ON public.contractor_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_contractor_posts_location ON public.contractor_posts(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_contractor_posts_created_at ON public.contractor_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_contractor_posts_active ON public.contractor_posts(is_active, is_flagged);

CREATE INDEX IF NOT EXISTS idx_contractor_post_likes_post ON public.contractor_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_contractor_post_comments_post ON public.contractor_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_contractor_follows_follower ON public.contractor_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_contractor_follows_following ON public.contractor_follows(following_id);

-- Enable RLS
ALTER TABLE public.contractor_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_expertise_endorsements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contractor_posts
CREATE POLICY "Contractors can view active posts in their area" ON public.contractor_posts
  FOR SELECT USING (
    is_active = true AND 
    is_flagged = false AND
    (
      contractor_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'contractor'
      )
    )
  );

CREATE POLICY "Contractors can create posts" ON public.contractor_posts
  FOR INSERT WITH CHECK (
    contractor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'contractor'
    )
  );

CREATE POLICY "Contractors can update their own posts" ON public.contractor_posts
  FOR UPDATE USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can delete their own posts" ON public.contractor_posts
  FOR DELETE USING (contractor_id = auth.uid());

-- RLS Policies for likes
CREATE POLICY "Contractors can manage their own likes" ON public.contractor_post_likes
  FOR ALL USING (contractor_id = auth.uid());

CREATE POLICY "Anyone can view likes" ON public.contractor_post_likes
  FOR SELECT USING (TRUE);

-- RLS Policies for comments
CREATE POLICY "Contractors can view comments on visible posts" ON public.contractor_post_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contractor_posts 
      WHERE contractor_posts.id = post_id 
      AND contractor_posts.is_active = true
      AND contractor_posts.is_flagged = false
    )
  );

CREATE POLICY "Contractors can create comments" ON public.contractor_post_comments
  FOR INSERT WITH CHECK (
    contractor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'contractor'
    )
  );

CREATE POLICY "Contractors can update their own comments" ON public.contractor_post_comments
  FOR UPDATE USING (contractor_id = auth.uid());

-- RLS Policies for follows
CREATE POLICY "Contractors can manage their own follows" ON public.contractor_follows
  FOR ALL USING (follower_id = auth.uid());

CREATE POLICY "Contractors can view their followers" ON public.contractor_follows
  FOR SELECT USING (following_id = auth.uid());

-- RLS Policies for endorsements
CREATE POLICY "Anyone can view endorsements" ON public.contractor_expertise_endorsements
  FOR SELECT USING (TRUE);

CREATE POLICY "Contractors can endorse other contractors" ON public.contractor_expertise_endorsements
  FOR INSERT WITH CHECK (
    endorser_id = auth.uid() AND
    contractor_id != auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'contractor'
    )
  );

-- Trigger functions for updating counters
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.contractor_posts 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.contractor_posts 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.contractor_posts 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.contractor_posts 
    SET comments_count = comments_count - 1 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_post_likes_count_trigger
  AFTER INSERT OR DELETE ON public.contractor_post_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

CREATE TRIGGER update_post_comments_count_trigger
  AFTER INSERT OR DELETE ON public.contractor_post_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Create updated_at triggers
CREATE TRIGGER update_contractor_posts_updated_at 
  BEFORE UPDATE ON public.contractor_posts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_post_comments_updated_at 
  BEFORE UPDATE ON public.contractor_post_comments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample contractor social data
INSERT INTO public.contractor_posts (contractor_id, post_type, title, content, skills_used, images) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440003', 
    'work_showcase',
    'Just finished a complex kitchen renovation!',
    'Completely rebuilt this kitchen from scratch. New plumbing, electrical, and custom tile work. Client is thrilled with the results!',
    ARRAY['Plumbing', 'Tiling', 'Kitchen Design'],
    '["kitchen_before.jpg", "kitchen_after.jpg"]'::jsonb
  ),
  (
    '550e8400-e29b-41d4-a716-446655440004',
    'help_request',
    'Need advice on commercial electrical code',
    'Working on a restaurant renovation and running into some code questions about commercial kitchen electrical requirements. Anyone have experience with this?',
    NULL
  ),
  (
    '550e8400-e29b-41d4-a716-446655440005',
    'equipment_share',
    'Tile saw available for rent',
    'Have a professional wet tile saw available for rent this weekend. Great for ceramic and porcelain tiles. $50/day.',
    NULL
  )
ON CONFLICT DO NOTHING;

-- Insert sample comments
INSERT INTO public.contractor_post_comments (post_id, contractor_id, comment_text) VALUES
  (
    (SELECT id FROM public.contractor_posts WHERE title = 'Need advice on commercial electrical code' LIMIT 1),
    '550e8400-e29b-41d4-a716-446655440003',
    'I just did a restaurant last month. The key thing is making sure your circuits are properly separated for kitchen equipment vs lighting. Happy to share the code references I used.'
  ),
  (
    (SELECT id FROM public.contractor_posts WHERE title = 'Just finished a complex kitchen renovation!' LIMIT 1),
    '550e8400-e29b-41d4-a716-446655440004',
    'Beautiful work! That tile pattern is really sharp. What brand did you use?'
  )
ON CONFLICT DO NOTHING;