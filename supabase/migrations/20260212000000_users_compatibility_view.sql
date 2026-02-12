-- ============================================================
-- CREATE public.users COMPATIBILITY VIEW
--
-- The public.users table was dropped by migration
-- 20260208002000_eliminate_users_table.sql, but some database
-- functions, triggers, or RLS policies still reference it.
--
-- This creates a simple view so any remaining references
-- to public.users resolve to public.profiles.
-- ============================================================

-- Drop view first in case it already exists (idempotent)
DROP VIEW IF EXISTS public.users;

-- Create compatibility view mapping users → profiles
CREATE VIEW public.users AS
SELECT
  id,
  email,
  first_name,
  last_name,
  role,
  phone,
  avatar_url,
  bio,
  verified,
  created_at,
  updated_at
FROM public.profiles;

-- Grant same permissions as profiles table
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
GRANT ALL ON public.users TO service_role;

-- Also fix known broken RLS policies that reference public.users
-- (feature_flags and controller_usage_logs from 20250107_feature_flags.sql)
DO $$
BEGIN
  -- Fix feature_flags_write_policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'feature_flags_write_policy'
    AND tablename = 'feature_flags'
  ) THEN
    DROP POLICY "feature_flags_write_policy" ON public.feature_flags;
    CREATE POLICY "feature_flags_write_policy" ON public.feature_flags
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  -- Fix controller_logs_read_policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'controller_logs_read_policy'
    AND tablename = 'controller_usage_logs'
  ) THEN
    DROP POLICY "controller_logs_read_policy" ON public.controller_usage_logs;
    CREATE POLICY "controller_logs_read_policy" ON public.controller_usage_logs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  -- Fix demo_feedback admin policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Admins can view all feedback'
    AND tablename = 'demo_feedback'
  ) THEN
    DROP POLICY "Admins can view all feedback" ON public.demo_feedback;
    CREATE POLICY "Admins can view all feedback" ON public.demo_feedback
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- Fix rotate_refresh_token function if it references users table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'rotate_refresh_token'
    AND n.nspname = 'public'
  ) THEN
    -- Check if the function body references 'users' table
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'rotate_refresh_token'
      AND n.nspname = 'public'
      AND pg_get_functiondef(p.oid) LIKE '%JOIN users%'
    ) THEN
      RAISE NOTICE 'rotate_refresh_token references users table - the compatibility view will handle this';
    END IF;
  END IF;
END $$;

-- Fix v_contractor_stats view if it references users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'v_contractor_stats'
  ) THEN
    -- Recreate it pointing to profiles
    DROP VIEW IF EXISTS public.v_contractor_stats;
    CREATE VIEW public.v_contractor_stats AS
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'completed') as completed_jobs,
      AVG(r.rating) as avg_rating,
      COUNT(DISTINCT r.id) as total_reviews
    FROM profiles u
    LEFT JOIN jobs j ON j.contractor_id = u.id
    LEFT JOIN reviews r ON r.job_id = j.id
    WHERE u.role = 'contractor'
    GROUP BY u.id, u.first_name, u.last_name;
  END IF;
END $$;
