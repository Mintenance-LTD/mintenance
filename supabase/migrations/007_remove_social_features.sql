-- Remove Social Features Tables
-- Removing LinkedIn-like social networking features that don't align with core platform purpose

-- Drop policies first
DROP POLICY IF EXISTS "Contractors can view posts" ON public.contractor_posts;
DROP POLICY IF EXISTS "Contractors can create posts" ON public.contractor_posts;
DROP POLICY IF EXISTS "Contractors can update their posts" ON public.contractor_posts;
DROP POLICY IF EXISTS "Contractors can delete their posts" ON public.contractor_posts;

DROP POLICY IF EXISTS "Users can view likes" ON public.contractor_post_likes;
DROP POLICY IF EXISTS "Contractors can like posts" ON public.contractor_post_likes;
DROP POLICY IF EXISTS "Contractors can unlike posts" ON public.contractor_post_likes;

DROP POLICY IF EXISTS "Users can view comments" ON public.contractor_post_comments;
DROP POLICY IF EXISTS "Contractors can create comments" ON public.contractor_post_comments;
DROP POLICY IF EXISTS "Contractors can update their comments" ON public.contractor_post_comments;
DROP POLICY IF EXISTS "Contractors can delete their comments" ON public.contractor_post_comments;

DROP POLICY IF EXISTS "Contractors can view follows" ON public.contractor_follows;
DROP POLICY IF EXISTS "Contractors can follow" ON public.contractor_follows;
DROP POLICY IF EXISTS "Contractors can unfollow" ON public.contractor_follows;

DROP POLICY IF EXISTS "Users can view endorsements" ON public.contractor_expertise_endorsements;
DROP POLICY IF EXISTS "Contractors can endorse" ON public.contractor_expertise_endorsements;
DROP POLICY IF EXISTS "Contractors can remove endorsements" ON public.contractor_expertise_endorsements;

DROP POLICY IF EXISTS "Users can view connections" ON public.connections;
DROP POLICY IF EXISTS "Users can create connections" ON public.connections;
DROP POLICY IF EXISTS "Users can update connections" ON public.connections;
DROP POLICY IF EXISTS "Users can delete connections" ON public.connections;

-- Drop triggers
DROP TRIGGER IF EXISTS update_contractor_posts_updated_at ON public.contractor_posts;
DROP TRIGGER IF EXISTS increment_post_likes ON public.contractor_post_likes;
DROP TRIGGER IF EXISTS decrement_post_likes ON public.contractor_post_likes;
DROP TRIGGER IF EXISTS increment_post_comments ON public.contractor_post_comments;
DROP TRIGGER IF EXISTS decrement_post_comments ON public.contractor_post_comments;
DROP TRIGGER IF EXISTS notify_contractor_post_like ON public.contractor_post_likes;
DROP TRIGGER IF EXISTS notify_contractor_post_comment ON public.contractor_post_comments;
DROP TRIGGER IF EXISTS notify_contractor_follow ON public.contractor_follows;
DROP TRIGGER IF EXISTS update_connections_updated_at ON public.connections;

-- Drop functions related to social features
DROP FUNCTION IF EXISTS increment_post_likes_count();
DROP FUNCTION IF EXISTS decrement_post_likes_count();
DROP FUNCTION IF EXISTS increment_post_comments_count();
DROP FUNCTION IF EXISTS decrement_post_comments_count();
DROP FUNCTION IF EXISTS notify_social_activity();

-- Drop indexes
DROP INDEX IF EXISTS idx_contractor_posts_contractor;
DROP INDEX IF EXISTS idx_contractor_posts_created;
DROP INDEX IF EXISTS idx_contractor_posts_type;
DROP INDEX IF EXISTS idx_contractor_post_likes_post;
DROP INDEX IF EXISTS idx_contractor_post_likes_contractor;
DROP INDEX IF EXISTS idx_contractor_post_comments_post;
DROP INDEX IF EXISTS idx_contractor_post_comments_contractor;
DROP INDEX IF EXISTS idx_contractor_follows_follower;
DROP INDEX IF EXISTS idx_contractor_follows_following;
DROP INDEX IF EXISTS idx_contractor_expertise_endorsements_contractor;
DROP INDEX IF EXISTS idx_contractor_expertise_endorsements_endorser;
DROP INDEX IF EXISTS idx_connections_user_a;
DROP INDEX IF EXISTS idx_connections_user_b;
DROP INDEX IF EXISTS idx_connections_status;

-- Drop tables
DROP TABLE IF EXISTS public.contractor_post_comments CASCADE;
DROP TABLE IF EXISTS public.contractor_post_likes CASCADE;
DROP TABLE IF EXISTS public.contractor_posts CASCADE;
DROP TABLE IF EXISTS public.contractor_follows CASCADE;
DROP TABLE IF EXISTS public.contractor_expertise_endorsements CASCADE;
DROP TABLE IF EXISTS public.connections CASCADE;

-- Note: Keeping contractor_locations table as it's used by the MeetingService for location tracking