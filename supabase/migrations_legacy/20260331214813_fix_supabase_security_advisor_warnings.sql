
-- Fix 1: Function search_path mutable — cleanup_old_pii_data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_pii_data') THEN
    ALTER FUNCTION public.cleanup_old_pii_data() SET search_path = '';
  END IF;
END $$;

-- Fix 2: Tighten RLS on article_shares
DROP POLICY IF EXISTS "article_shares_insert" ON public.article_shares;
DROP POLICY IF EXISTS "article_shares_anon_insert" ON public.article_shares;
DROP POLICY IF EXISTS "authenticated_insert_article_shares" ON public.article_shares;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.article_shares;
DROP POLICY IF EXISTS "authenticated_insert_own_article_shares" ON public.article_shares;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'article_shares') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'article_shares' AND column_name = 'user_id') THEN
      CREATE POLICY "article_shares_authenticated_insert" ON public.article_shares
        FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
    ELSE
      CREATE POLICY "article_shares_authenticated_insert" ON public.article_shares
        FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- Fix 3: Tighten RLS on article_views
DROP POLICY IF EXISTS "article_views_insert" ON public.article_views;
DROP POLICY IF EXISTS "article_views_anon_insert" ON public.article_views;
DROP POLICY IF EXISTS "authenticated_insert_article_views" ON public.article_views;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.article_views;
DROP POLICY IF EXISTS "authenticated_insert_own_article_views" ON public.article_views;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'article_views') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'article_views' AND column_name = 'user_id') THEN
      CREATE POLICY "article_views_authenticated_insert" ON public.article_views
        FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
    ELSE
      CREATE POLICY "article_views_authenticated_insert" ON public.article_views
        FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- Fix 4: Tighten RLS on help_article_views
DROP POLICY IF EXISTS "help_article_views_insert" ON public.help_article_views;
DROP POLICY IF EXISTS "help_article_views_anon_insert" ON public.help_article_views;
DROP POLICY IF EXISTS "authenticated_insert_help_article_views" ON public.help_article_views;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.help_article_views;
DROP POLICY IF EXISTS "authenticated_insert_own_help_article_views" ON public.help_article_views;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'help_article_views') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'help_article_views' AND column_name = 'user_id') THEN
      CREATE POLICY "help_article_views_authenticated_insert" ON public.help_article_views
        FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
    ELSE
      CREATE POLICY "help_article_views_authenticated_insert" ON public.help_article_views
        FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- Fix 5: Tighten RLS on search_analytics
DROP POLICY IF EXISTS "search_analytics_insert" ON public.search_analytics;
DROP POLICY IF EXISTS "search_analytics_anon_insert" ON public.search_analytics;
DROP POLICY IF EXISTS "authenticated_insert_search_analytics" ON public.search_analytics;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.search_analytics;
DROP POLICY IF EXISTS "authenticated_insert_own_search_analytics" ON public.search_analytics;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'search_analytics') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'search_analytics' AND column_name = 'user_id') THEN
      CREATE POLICY "search_analytics_authenticated_insert" ON public.search_analytics
        FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
    ELSE
      CREATE POLICY "search_analytics_authenticated_insert" ON public.search_analytics
        FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'search_analytics' AND policyname = 'search_analytics_admin_select') THEN
      CREATE POLICY "search_analytics_admin_select" ON public.search_analytics
        FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
    END IF;
  END IF;
END $$;
;
