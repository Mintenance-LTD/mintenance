-- ==========================================================
-- Add Social Notification Triggers and Comment Count Updates
-- ==========================================================
-- This migration adds triggers for automatically creating notifications
-- and updating comment counts on posts.

BEGIN;

-- ==========================================================
-- 1. Function to update post comments_count
-- ==========================================================
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.contractor_posts 
    SET comments_count = COALESCE(comments_count, 0) + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.contractor_posts 
    SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comments_count
DROP TRIGGER IF EXISTS update_post_comments_count_trigger ON public.contractor_post_comments;
CREATE TRIGGER update_post_comments_count_trigger
  AFTER INSERT OR DELETE ON public.contractor_post_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- ==========================================================
-- 2. Function to create notification when post is liked
-- ==========================================================
CREATE OR REPLACE FUNCTION notify_post_liked()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  liker_name TEXT;
BEGIN
  -- Get post author
  SELECT contractor_id INTO post_author_id
  FROM public.contractor_posts
  WHERE id = NEW.post_id;

  -- Don't notify if user liked their own post
  IF post_author_id = NEW.contractor_id THEN
    RETURN NEW;
  END IF;

  -- Get liker's name
  SELECT CONCAT(first_name, ' ', last_name) INTO liker_name
  FROM public.users
  WHERE id = NEW.contractor_id;

  -- Create notification
  INSERT INTO public.notifications (user_id, title, message, type, action_url)
  VALUES (
    post_author_id,
    'New Like',
    COALESCE(liker_name, 'Someone') || ' liked your post',
    'post_liked',
    '/contractor/social/post/' || NEW.post_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for post likes
DROP TRIGGER IF EXISTS notify_post_liked_trigger ON public.contractor_post_likes;
CREATE TRIGGER notify_post_liked_trigger
  AFTER INSERT ON public.contractor_post_likes
  FOR EACH ROW EXECUTE FUNCTION notify_post_liked();

-- ==========================================================
-- 3. Function to create notification when comment is added
-- ==========================================================
CREATE OR REPLACE FUNCTION notify_comment_added()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  commenter_name TEXT;
  post_title TEXT;
BEGIN
  -- Get post author
  SELECT contractor_id, title INTO post_author_id, post_title
  FROM public.contractor_posts
  WHERE id = NEW.post_id;

  -- Get commenter's name
  SELECT CONCAT(first_name, ' ', last_name) INTO commenter_name
  FROM public.users
  WHERE id = NEW.contractor_id;

  -- Don't notify if user commented on their own post
  IF post_author_id != NEW.contractor_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    VALUES (
      post_author_id,
      'New Comment',
      COALESCE(commenter_name, 'Someone') || ' commented on your post: ' || COALESCE(post_title, ''),
      'comment_added',
      '/contractor/social/post/' || NEW.post_id
    );
  END IF;

  -- If this is a reply, notify parent comment author
  IF NEW.parent_comment_id IS NOT NULL THEN
    DECLARE
      parent_comment_author_id UUID;
    BEGIN
      SELECT contractor_id INTO parent_comment_author_id
      FROM public.contractor_post_comments
      WHERE id = NEW.parent_comment_id;

      -- Don't notify if replying to own comment
      IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.contractor_id THEN
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        VALUES (
          parent_comment_author_id,
          'Reply to Comment',
          COALESCE(commenter_name, 'Someone') || ' replied to your comment',
          'comment_replied',
          '/contractor/social/post/' || NEW.post_id
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comments
DROP TRIGGER IF EXISTS notify_comment_added_trigger ON public.contractor_post_comments;
CREATE TRIGGER notify_comment_added_trigger
  AFTER INSERT ON public.contractor_post_comments
  FOR EACH ROW EXECUTE FUNCTION notify_comment_added();

-- ==========================================================
-- 4. Function to create notification when user is followed
-- ==========================================================
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER AS $$
DECLARE
  follower_name TEXT;
BEGIN
  -- Don't notify if user followed themselves (shouldn't happen due to constraint, but safety check)
  IF NEW.follower_id = NEW.following_id THEN
    RETURN NEW;
  END IF;

  -- Get follower's name
  SELECT CONCAT(first_name, ' ', last_name) INTO follower_name
  FROM public.users
  WHERE id = NEW.follower_id;

  -- Create notification
  INSERT INTO public.notifications (user_id, title, message, type, action_url)
  VALUES (
    NEW.following_id,
    'New Follower',
    COALESCE(follower_name, 'Someone') || ' started following you',
    'new_follower',
    '/contractor/profile/' || NEW.follower_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follows
DROP TRIGGER IF EXISTS notify_new_follower_trigger ON public.contractor_follows;
CREATE TRIGGER notify_new_follower_trigger
  AFTER INSERT ON public.contractor_follows
  FOR EACH ROW EXECUTE FUNCTION notify_new_follower();

-- ==========================================================
-- 5. Add metadata column to notifications table if it doesn't exist
-- ==========================================================
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

COMMIT;

