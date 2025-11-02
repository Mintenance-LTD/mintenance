-- ==========================================================
-- Add contractor_post_likes table for social feed
-- ==========================================================
-- This migration adds the contractor_post_likes table to enable
-- contractors to like posts in the community feed.

BEGIN;

-- Create contractor_post_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.contractor_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.contractor_posts(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, contractor_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contractor_post_likes_post_id 
ON public.contractor_post_likes(post_id);

CREATE INDEX IF NOT EXISTS idx_contractor_post_likes_contractor_id 
ON public.contractor_post_likes(contractor_id);

-- Enable RLS
ALTER TABLE public.contractor_post_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Contractors can view all likes" ON public.contractor_post_likes
  FOR SELECT USING (TRUE);

CREATE POLICY "Contractors can manage their own likes" ON public.contractor_post_likes
  FOR ALL USING (contractor_id = auth.uid());

-- Trigger function to update likes_count in contractor_posts
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.contractor_posts 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.contractor_posts 
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_post_likes_count_trigger ON public.contractor_post_likes;
CREATE TRIGGER update_post_likes_count_trigger
  AFTER INSERT OR DELETE ON public.contractor_post_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

COMMIT;

