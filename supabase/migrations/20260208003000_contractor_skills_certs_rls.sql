-- Migration: Add missing columns to contractor tables,
-- add missing columns to contractor_posts, and RLS policies
-- Date: 2026-02-08
-- Note: contractor_skills and contractor_certifications already existed on remote
-- with slightly different schemas. This migration adds missing columns.

BEGIN;

-- ============================================================
-- 1. CONTRACTOR_SKILLS - add missing columns (table already exists)
-- ============================================================

ALTER TABLE public.contractor_skills ADD COLUMN IF NOT EXISTS skill_category VARCHAR(100);
ALTER TABLE public.contractor_skills ADD COLUMN IF NOT EXISTS proficiency_level VARCHAR(50);
ALTER TABLE public.contractor_skills ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE public.contractor_skills ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_contractor_skills_contractor_id ON public.contractor_skills(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_skills_category ON public.contractor_skills(skill_category);

ALTER TABLE public.contractor_skills ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. CONTRACTOR_CERTIFICATIONS - ensure RLS enabled (table already exists)
-- ============================================================

ALTER TABLE public.contractor_certifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. ADD MISSING COLUMNS TO CONTRACTOR_POSTS
-- The profile-data route queries: post_type, content, media_urls,
-- likes_count, comments_count, shares_count, views_count, is_active
-- but these columns were not in the original CREATE TABLE
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.contractor_posts') IS NOT NULL THEN
    -- post_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contractor_posts' AND column_name='post_type') THEN
      ALTER TABLE public.contractor_posts ADD COLUMN post_type TEXT DEFAULT 'work_showcase';
    END IF;
    -- content column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contractor_posts' AND column_name='content') THEN
      ALTER TABLE public.contractor_posts ADD COLUMN content TEXT;
    END IF;
    -- media_urls column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contractor_posts' AND column_name='media_urls') THEN
      ALTER TABLE public.contractor_posts ADD COLUMN media_urls TEXT[];
    END IF;
    -- likes_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contractor_posts' AND column_name='likes_count') THEN
      ALTER TABLE public.contractor_posts ADD COLUMN likes_count INTEGER DEFAULT 0;
    END IF;
    -- comments_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contractor_posts' AND column_name='comments_count') THEN
      ALTER TABLE public.contractor_posts ADD COLUMN comments_count INTEGER DEFAULT 0;
    END IF;
    -- shares_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contractor_posts' AND column_name='shares_count') THEN
      ALTER TABLE public.contractor_posts ADD COLUMN shares_count INTEGER DEFAULT 0;
    END IF;
    -- views_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contractor_posts' AND column_name='views_count') THEN
      ALTER TABLE public.contractor_posts ADD COLUMN views_count INTEGER DEFAULT 0;
    END IF;
    -- is_active column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contractor_posts' AND column_name='is_active') THEN
      ALTER TABLE public.contractor_posts ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
  END IF;
END $$;

-- ============================================================
-- 4. RLS POLICIES FOR CONTRACTOR TABLES
-- ============================================================

-- contractor_profiles: own data + admin read
DO $$
BEGIN
  IF to_regclass('public.contractor_profiles') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "contractor_profiles_select_own" ON public.contractor_profiles';
    EXECUTE 'DROP POLICY IF EXISTS "contractor_profiles_insert_own" ON public.contractor_profiles';
    EXECUTE 'DROP POLICY IF EXISTS "contractor_profiles_update_own" ON public.contractor_profiles';
    EXECUTE 'DROP POLICY IF EXISTS "contractor_profiles_service_role" ON public.contractor_profiles';

    EXECUTE 'CREATE POLICY "contractor_profiles_select_own" ON public.contractor_profiles
             FOR SELECT
             USING (
               id = auth.uid()
               OR EXISTS (
                 SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = ''admin''
               )
             )';

    EXECUTE 'CREATE POLICY "contractor_profiles_insert_own" ON public.contractor_profiles
             FOR INSERT
             WITH CHECK (id = auth.uid())';

    EXECUTE 'CREATE POLICY "contractor_profiles_update_own" ON public.contractor_profiles
             FOR UPDATE
             USING (id = auth.uid())
             WITH CHECK (id = auth.uid())';

    EXECUTE 'CREATE POLICY "contractor_profiles_service_role" ON public.contractor_profiles
             FOR ALL
             USING (auth.role() = ''service_role'')
             WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- contractor_posts: own data + public read for active posts
DO $$
BEGIN
  IF to_regclass('public.contractor_posts') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "contractor_posts_select_public" ON public.contractor_posts';
    EXECUTE 'DROP POLICY IF EXISTS "contractor_posts_manage_own" ON public.contractor_posts';
    EXECUTE 'DROP POLICY IF EXISTS "contractor_posts_service_role" ON public.contractor_posts';

    EXECUTE 'CREATE POLICY "contractor_posts_select_public" ON public.contractor_posts
             FOR SELECT
             USING (
               is_active = true
               OR contractor_id = auth.uid()
             )';

    EXECUTE 'CREATE POLICY "contractor_posts_manage_own" ON public.contractor_posts
             FOR ALL
             USING (contractor_id = auth.uid())
             WITH CHECK (contractor_id = auth.uid())';

    EXECUTE 'CREATE POLICY "contractor_posts_service_role" ON public.contractor_posts
             FOR ALL
             USING (auth.role() = ''service_role'')
             WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- contractor_skills: own data + public read
DO $$
BEGIN
  IF to_regclass('public.contractor_skills') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "contractor_skills_select_public" ON public.contractor_skills';
    EXECUTE 'DROP POLICY IF EXISTS "contractor_skills_manage_own" ON public.contractor_skills';
    EXECUTE 'DROP POLICY IF EXISTS "contractor_skills_service_role" ON public.contractor_skills';

    EXECUTE 'CREATE POLICY "contractor_skills_select_public" ON public.contractor_skills
             FOR SELECT
             USING (auth.role() IS NOT NULL)';

    EXECUTE 'CREATE POLICY "contractor_skills_manage_own" ON public.contractor_skills
             FOR ALL
             USING (contractor_id = auth.uid())
             WITH CHECK (contractor_id = auth.uid())';

    EXECUTE 'CREATE POLICY "contractor_skills_service_role" ON public.contractor_skills
             FOR ALL
             USING (auth.role() = ''service_role'')
             WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- contractor_certifications: own data + admin read
DO $$
BEGIN
  IF to_regclass('public.contractor_certifications') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "contractor_certs_select_own" ON public.contractor_certifications';
    EXECUTE 'DROP POLICY IF EXISTS "contractor_certs_manage_own" ON public.contractor_certifications';
    EXECUTE 'DROP POLICY IF EXISTS "contractor_certs_service_role" ON public.contractor_certifications';

    EXECUTE 'CREATE POLICY "contractor_certs_select_own" ON public.contractor_certifications
             FOR SELECT
             USING (
               contractor_id = auth.uid()
               OR EXISTS (
                 SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = ''admin''
               )
             )';

    EXECUTE 'CREATE POLICY "contractor_certs_manage_own" ON public.contractor_certifications
             FOR ALL
             USING (contractor_id = auth.uid())
             WITH CHECK (contractor_id = auth.uid())';

    EXECUTE 'CREATE POLICY "contractor_certs_service_role" ON public.contractor_certifications
             FOR ALL
             USING (auth.role() = ''service_role'')
             WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

COMMIT;
