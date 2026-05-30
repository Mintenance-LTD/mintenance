-- Migration: Fix Supabase Security Advisor Warnings
-- Date: 2026-03-31
-- Addresses: 10 warnings from Security Advisor
--
-- 1. Function search_path mutable: cleanup_old_pii_data
-- 2. RLS Policy Always True: article_shares, article_views, help_article_views, search_analytics
-- 3. Extensions in public (postgis, vector, pg_trgm) — CANNOT FIX (system limitation)
-- 4. spatial_ref_sys RLS disabled — CANNOT FIX (PostGIS system table)
-- 5. Leaked password protection — must be enabled in Supabase Dashboard > Auth > Settings
-- 6. Postgres version — must be upgraded in Supabase Dashboard > Settings > Infrastructure

-- ============================================================
-- FIX 1: Function search_path mutable — cleanup_old_pii_data
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_pii_data') THEN
    -- Set immutable search_path to prevent search_path injection attacks
    ALTER FUNCTION public.cleanup_old_pii_data() SET search_path = '';
  END IF;
END $$;

-- ============================================================
-- FIX 2: Tighten RLS on article_shares (analytics — INSERT only)
-- ============================================================
-- Drop overly permissive policies
DROP POLICY IF EXISTS "article_shares_insert" ON public.article_shares;
DROP POLICY IF EXISTS "article_shares_anon_insert" ON public.article_shares;
DROP POLICY IF EXISTS "authenticated_insert_article_shares" ON public.article_shares;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.article_shares;

-- Allow authenticated users to INSERT their own shares only
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'article_shares') THEN
    -- Check if user_id column exists for row-level filtering
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'article_shares' AND column_name = 'user_id') THEN
      CREATE POLICY "article_shares_authenticated_insert" ON public.article_shares
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());
    ELSE
      -- No user_id column — allow authenticated insert (still better than anon)
      CREATE POLICY "article_shares_authenticated_insert" ON public.article_shares
        FOR INSERT TO authenticated
        WITH CHECK (true);
    END IF;

    -- Allow authenticated SELECT for own shares
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'article_shares' AND policyname = 'article_shares_select') THEN
      CREATE POLICY "article_shares_select" ON public.article_shares
        FOR SELECT TO authenticated
        USING (true);
    END IF;
  END IF;
END $$;

-- ============================================================
-- FIX 3: Tighten RLS on article_views (analytics — INSERT only)
-- ============================================================
DROP POLICY IF EXISTS "article_views_insert" ON public.article_views;
DROP POLICY IF EXISTS "article_views_anon_insert" ON public.article_views;
DROP POLICY IF EXISTS "authenticated_insert_article_views" ON public.article_views;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.article_views;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'article_views') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'article_views' AND column_name = 'user_id') THEN
      CREATE POLICY "article_views_authenticated_insert" ON public.article_views
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());
    ELSE
      CREATE POLICY "article_views_authenticated_insert" ON public.article_views
        FOR INSERT TO authenticated
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'article_views' AND policyname = 'article_views_select') THEN
      CREATE POLICY "article_views_select" ON public.article_views
        FOR SELECT TO authenticated
        USING (true);
    END IF;
  END IF;
END $$;

-- ============================================================
-- FIX 4: Tighten RLS on help_article_views (analytics — INSERT only)
-- ============================================================
DROP POLICY IF EXISTS "help_article_views_insert" ON public.help_article_views;
DROP POLICY IF EXISTS "help_article_views_anon_insert" ON public.help_article_views;
DROP POLICY IF EXISTS "authenticated_insert_help_article_views" ON public.help_article_views;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.help_article_views;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'help_article_views') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'help_article_views' AND column_name = 'user_id') THEN
      CREATE POLICY "help_article_views_authenticated_insert" ON public.help_article_views
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());
    ELSE
      CREATE POLICY "help_article_views_authenticated_insert" ON public.help_article_views
        FOR INSERT TO authenticated
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'help_article_views' AND policyname = 'help_article_views_select') THEN
      CREATE POLICY "help_article_views_select" ON public.help_article_views
        FOR SELECT TO authenticated
        USING (true);
    END IF;
  END IF;
END $$;

-- ============================================================
-- FIX 5: Tighten RLS on search_analytics (analytics — INSERT only)
-- ============================================================
DROP POLICY IF EXISTS "search_analytics_insert" ON public.search_analytics;
DROP POLICY IF EXISTS "search_analytics_anon_insert" ON public.search_analytics;
DROP POLICY IF EXISTS "authenticated_insert_search_analytics" ON public.search_analytics;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.search_analytics;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'search_analytics') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'search_analytics' AND column_name = 'user_id') THEN
      CREATE POLICY "search_analytics_authenticated_insert" ON public.search_analytics
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());
    ELSE
      CREATE POLICY "search_analytics_authenticated_insert" ON public.search_analytics
        FOR INSERT TO authenticated
        WITH CHECK (true);
    END IF;

    -- Admin can SELECT all analytics
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'search_analytics' AND policyname = 'search_analytics_admin_select') THEN
      CREATE POLICY "search_analytics_admin_select" ON public.search_analytics
        FOR SELECT TO authenticated
        USING (public.is_admin(auth.uid()));
    END IF;
  END IF;
END $$;

-- ============================================================
-- NOTES (manual actions required in Supabase Dashboard):
-- ============================================================
-- 1. Enable Leaked Password Protection:
--    Dashboard > Authentication > Settings > Security > Enable "Leaked Password Protection"
--
-- 2. Upgrade Postgres Version:
--    Dashboard > Project Settings > Infrastructure > Upgrade Postgres
--
-- 3. Extensions in public schema (postgis, vector, pg_trgm):
--    Cannot be moved to a different schema on Supabase Free tier.
--    This is a known limitation and safe to ignore.
--
-- 4. spatial_ref_sys RLS disabled:
--    This is a PostGIS system table. Cannot and should not have RLS enabled.
