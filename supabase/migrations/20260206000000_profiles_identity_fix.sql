-- Migration: Align public user references to profiles
-- Date: 2026-02-06
-- Purpose: Replace public.users references with public.profiles and fix dependent policies/indexes

BEGIN;

-- Update foreign keys in contractor_meetings to reference profiles
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  IF to_regclass('public.contractor_meetings') IS NOT NULL THEN
    FOR constraint_name IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.contractor_meetings'::regclass
        AND confrelid = 'public.users'::regclass
    LOOP
      EXECUTE format('ALTER TABLE public.contractor_meetings DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'contractor_meetings_contractor_id_profiles_fkey'
    ) THEN
      ALTER TABLE public.contractor_meetings
        ADD CONSTRAINT contractor_meetings_contractor_id_profiles_fkey
        FOREIGN KEY (contractor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'contractor_meetings_homeowner_id_profiles_fkey'
    ) THEN
      ALTER TABLE public.contractor_meetings
        ADD CONSTRAINT contractor_meetings_homeowner_id_profiles_fkey
        FOREIGN KEY (homeowner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'contractor_meetings_cancelled_by_profiles_fkey'
    ) THEN
      ALTER TABLE public.contractor_meetings
        ADD CONSTRAINT contractor_meetings_cancelled_by_profiles_fkey
        FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id);
    END IF;
  END IF;
END $$;

-- Update foreign keys in meeting_updates to reference profiles
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  IF to_regclass('public.meeting_updates') IS NOT NULL THEN
    FOR constraint_name IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.meeting_updates'::regclass
        AND confrelid = 'public.users'::regclass
    LOOP
      EXECUTE format('ALTER TABLE public.meeting_updates DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'meeting_updates_updated_by_profiles_fkey'
    ) THEN
      ALTER TABLE public.meeting_updates
        ADD CONSTRAINT meeting_updates_updated_by_profiles_fkey
        FOREIGN KEY (updated_by) REFERENCES public.profiles(id);
    END IF;
  END IF;
END $$;

-- Update foreign keys in property_favorites to reference profiles
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  IF to_regclass('public.property_favorites') IS NOT NULL THEN
    FOR constraint_name IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.property_favorites'::regclass
        AND confrelid = 'public.users'::regclass
    LOOP
      EXECUTE format('ALTER TABLE public.property_favorites DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'property_favorites_user_id_profiles_fkey'
    ) THEN
      ALTER TABLE public.property_favorites
        ADD CONSTRAINT property_favorites_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Update feature flag policies to use profiles
DO $$
BEGIN
  IF to_regclass('public.feature_flags') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "feature_flags_write_policy" ON public.feature_flags';
    EXECUTE 'CREATE POLICY "feature_flags_write_policy" ON public.feature_flags
             FOR ALL
             USING (
               EXISTS (
                 SELECT 1 FROM public.profiles
                 WHERE profiles.id = auth.uid()
                 AND profiles.role = ''admin''
               )
             )';
  END IF;

  IF to_regclass('public.controller_usage_logs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "controller_logs_read_policy" ON public.controller_usage_logs';
    EXECUTE 'CREATE POLICY "controller_logs_read_policy" ON public.controller_usage_logs
             FOR SELECT
             USING (
               EXISTS (
                 SELECT 1 FROM public.profiles
                 WHERE profiles.id = auth.uid()
                 AND profiles.role = ''admin''
               )
             )';
  END IF;
END $$;

-- Update demo feedback admin policy to use profiles
DO $$
BEGIN
  IF to_regclass('public.demo_feedback') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all feedback" ON public.demo_feedback';
    EXECUTE 'CREATE POLICY "Admins can view all feedback" ON public.demo_feedback
             FOR SELECT
             USING (
               EXISTS (
                 SELECT 1 FROM public.profiles
                 WHERE profiles.id = auth.uid()
                 AND profiles.role = ''admin''
               )
             )';
  END IF;
END $$;

-- Remove redundant indexes on users and create equivalent profiles indexes
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE 'DROP INDEX IF EXISTS idx_users_id';
    EXECUTE 'DROP INDEX IF EXISTS idx_users_role';
    EXECUTE 'DROP INDEX IF EXISTS idx_users_contractor_id';
    EXECUTE 'DROP INDEX IF EXISTS idx_users_email';
    EXECUTE 'DROP INDEX IF EXISTS idx_users_created_at';
    EXECUTE 'DROP INDEX IF EXISTS idx_users_status';
    EXECUTE 'DROP INDEX IF EXISTS idx_users_is_available';
    EXECUTE 'DROP INDEX IF EXISTS idx_users_admin_verified';
    EXECUTE 'DROP INDEX IF EXISTS idx_users_id_role';
    EXECUTE 'DROP INDEX IF EXISTS idx_users_is_available_role';
    EXECUTE 'DROP INDEX IF EXISTS idx_users_contractors';
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at)';

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = ''public'' AND table_name = ''profiles'' AND column_name = ''verified''
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_verified ON public.profiles(verified)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_contractors
               ON public.profiles(role, verified, created_at DESC)
               WHERE role = ''contractor''';
    END IF;
  END IF;
END $$;

-- Replace contractor stats view to use profiles
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.v_contractor_stats AS
             SELECT
               p.id,
               p.first_name,
               p.last_name,
               COUNT(DISTINCT j.id) FILTER (WHERE j.status = ''completed'') AS completed_jobs,
               AVG(r.rating) AS avg_rating,
               COUNT(DISTINCT r.id) AS total_reviews
             FROM public.profiles p
             LEFT JOIN public.jobs j ON j.contractor_id = p.id
             LEFT JOIN public.reviews r ON r.job_id = j.id
             WHERE p.role = ''contractor''
             GROUP BY p.id, p.first_name, p.last_name';
  END IF;
END $$;

-- Remove redundant PK indexes created by performance script
DO $$
BEGIN
  EXECUTE 'DROP INDEX IF EXISTS idx_jobs_id';
  EXECUTE 'DROP INDEX IF EXISTS idx_bids_id';
  EXECUTE 'DROP INDEX IF EXISTS idx_escrow_transactions_id';
  EXECUTE 'DROP INDEX IF EXISTS idx_building_assessments_id';
  EXECUTE 'DROP INDEX IF EXISTS idx_properties_id';
  EXECUTE 'DROP INDEX IF EXISTS idx_messages_id';
  EXECUTE 'DROP INDEX IF EXISTS idx_contractor_quotes_id';
  EXECUTE 'DROP INDEX IF EXISTS idx_contractor_posts_id';
END $$;

-- Refresh stats
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'ANALYZE public.profiles';
  END IF;
  IF to_regclass('public.jobs') IS NOT NULL THEN
    EXECUTE 'ANALYZE public.jobs';
  END IF;
  IF to_regclass('public.reviews') IS NOT NULL THEN
    EXECUTE 'ANALYZE public.reviews';
  END IF;
  IF to_regclass('public.contractor_skills') IS NOT NULL THEN
    EXECUTE 'ANALYZE public.contractor_skills';
  END IF;
END $$;

COMMIT;
