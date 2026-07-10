-- Remove Social Features Tables
-- Removing LinkedIn-like social networking features that don't align with core platform purpose
--
-- 2026-07-10: made idempotent for a clean `supabase db reset`. The previous
-- version issued `DROP POLICY/TRIGGER IF EXISTS ... ON public.contractor_posts`
-- (and the other social tables) up front. `IF EXISTS` guards the POLICY, not the
-- TABLE, so on a fresh database — where these social tables were never created —
-- those statements failed with 42P01 ("relation does not exist") and aborted the
-- entire reset before any later migration could run. `DROP TABLE ... CASCADE`
-- already removes a table's policies, triggers and indexes, so the explicit
-- drops were redundant. We now drop the tables (CASCADE) first, then the
-- standalone functions and any leftover indexes, all with IF EXISTS so the whole
-- migration is a safe no-op when the tables never existed.

-- Drop tables (CASCADE also removes their policies, triggers, and indexes)
DROP TABLE IF EXISTS public.contractor_post_comments CASCADE;
DROP TABLE IF EXISTS public.contractor_post_likes CASCADE;
DROP TABLE IF EXISTS public.contractor_posts CASCADE;
DROP TABLE IF EXISTS public.contractor_follows CASCADE;
DROP TABLE IF EXISTS public.contractor_expertise_endorsements CASCADE;
DROP TABLE IF EXISTS public.connections CASCADE;

-- Drop the standalone trigger functions (safe now that the triggers that
-- depended on them were removed by the CASCADE table drops above).
DROP FUNCTION IF EXISTS increment_post_likes_count();
DROP FUNCTION IF EXISTS decrement_post_likes_count();
DROP FUNCTION IF EXISTS increment_post_comments_count();
DROP FUNCTION IF EXISTS decrement_post_comments_count();
DROP FUNCTION IF EXISTS notify_social_activity();

-- Drop any leftover indexes (no-ops if the table drops above already removed them)
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

-- Note: Keeping contractor_locations table as it's used by the MeetingService for location tracking
