-- Migration: P0/P1 Security & Consistency Fixes
-- Date: 2026-02-09
-- Safe to run on existing remote schema (all statements use IF EXISTS/IF NOT EXISTS guards)

BEGIN;

-- ============================================================================
-- P0-5: Fix RLS policies referencing wrong columns
-- saved_jobs should use user_id, job_views should use viewer_id
-- Remote schema may still have contractor_id — rename first if needed
-- ============================================================================

-- Rename saved_jobs.contractor_id → user_id if the old column exists
DO $$
BEGIN
  IF to_regclass('public.saved_jobs') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'saved_jobs' AND column_name = 'contractor_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'saved_jobs' AND column_name = 'user_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.saved_jobs RENAME COLUMN contractor_id TO user_id';
    END IF;
  END IF;
END $$;

-- Rename job_views.contractor_id → viewer_id if the old column exists
DO $$
BEGIN
  IF to_regclass('public.job_views') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'job_views' AND column_name = 'contractor_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'job_views' AND column_name = 'viewer_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.job_views RENAME COLUMN contractor_id TO viewer_id';
    END IF;
  END IF;
END $$;

-- Fix saved_jobs policy (column is now user_id)
DO $$
BEGIN
  IF to_regclass('public.saved_jobs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "saved_jobs_manage_own" ON public.saved_jobs';
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage their saved jobs" ON public.saved_jobs';
    EXECUTE 'CREATE POLICY "saved_jobs_manage_own" ON public.saved_jobs
             FOR ALL
             USING (user_id = auth.uid())
             WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- Fix job_views policy (column is now viewer_id)
DO $$
BEGIN
  IF to_regclass('public.job_views') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "job_views_insert" ON public.job_views';
    EXECUTE 'DROP POLICY IF EXISTS "job_views_select_owner" ON public.job_views';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can record a job view" ON public.job_views';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view job view records" ON public.job_views';

    EXECUTE 'CREATE POLICY "job_views_insert" ON public.job_views
             FOR INSERT
             WITH CHECK (viewer_id IS NULL OR viewer_id = auth.uid())';

    EXECUTE 'CREATE POLICY "job_views_select_owner" ON public.job_views
             FOR SELECT
             USING (
               viewer_id = auth.uid()
               OR EXISTS (
                 SELECT 1 FROM public.jobs j
                 WHERE j.id = job_views.job_id AND j.homeowner_id = auth.uid()
               )
             )';
  END IF;
END $$;

-- Fix job_guarantees policy (table has job_id/bid_id, NOT contractor_id/homeowner_id)
DO $$
BEGIN
  IF to_regclass('public.job_guarantees') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "job_guarantees_access" ON public.job_guarantees';
    EXECUTE 'CREATE POLICY "job_guarantees_access" ON public.job_guarantees
             FOR ALL
             USING (
               EXISTS (
                 SELECT 1 FROM public.jobs j
                 WHERE j.id = job_guarantees.job_id
                   AND (j.homeowner_id = auth.uid()
                        OR EXISTS (SELECT 1 FROM public.bids b WHERE b.job_id = j.id AND b.contractor_id = auth.uid()))
               )
             )
             WITH CHECK (
               EXISTS (
                 SELECT 1 FROM public.jobs j
                 WHERE j.id = job_guarantees.job_id
                   AND (j.homeowner_id = auth.uid()
                        OR EXISTS (SELECT 1 FROM public.bids b WHERE b.job_id = j.id AND b.contractor_id = auth.uid()))
               )
             )';
  END IF;
END $$;

-- ============================================================================
-- P1-8: Prevent self-promotion to admin via profiles UPDATE
-- ============================================================================
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles';
    EXECUTE 'CREATE POLICY "profiles_update_own" ON public.profiles
             FOR UPDATE
             USING (id = auth.uid())
             WITH CHECK (
               id = auth.uid()
               AND (role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE id = auth.uid()))
             )';
  END IF;
END $$;

-- ============================================================================
-- P1-1: Fix UK defaults - currency GBP, country UK
-- ============================================================================

-- Fix payments table default currency
DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'GBP';
  END IF;
END $$;

-- Fix addresses table default country (may already be UK from earlier migration)
DO $$
BEGIN
  IF to_regclass('public.addresses') IS NOT NULL THEN
    ALTER TABLE public.addresses ALTER COLUMN country SET DEFAULT 'UK';
  END IF;
END $$;

-- ============================================================================
-- P0-10: Ensure missing tables exist and add missing columns
-- All guarded with column-existence checks for safety on existing remote schema
-- ============================================================================

DO $$
BEGIN
  -- ---- Reviews ----
  IF to_regclass('public.reviews') IS NULL THEN
    EXECUTE '
      CREATE TABLE public.reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
        reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        reviewee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        response TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )';
  ELSE
    -- Add missing columns to existing reviews table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='reviewee_id') THEN
      EXECUTE 'ALTER TABLE public.reviews ADD COLUMN reviewee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='reviewer_id') THEN
      EXECUTE 'ALTER TABLE public.reviews ADD COLUMN reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='response') THEN
      EXECUTE 'ALTER TABLE public.reviews ADD COLUMN response TEXT';
    END IF;
  END IF;

  -- Indexes (only if column exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='job_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_reviews_job ON public.reviews(job_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='reviewee_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews(reviewee_id)';
  END IF;
  EXECUTE 'ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY';

  -- ---- Notifications ----
  IF to_regclass('public.notifications') IS NULL THEN
    EXECUTE '
      CREATE TABLE public.notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        data JSONB,
        read BOOLEAN DEFAULT false,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='user_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read)';
  END IF;
  EXECUTE 'ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY';

  -- ---- Message threads ----
  IF to_regclass('public.message_threads') IS NULL THEN
    EXECUTE '
      CREATE TABLE public.message_threads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
        participant_ids UUID[] NOT NULL,
        last_message_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )';
  END IF;
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_message_threads_job ON public.message_threads(job_id)';
  EXECUTE 'ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY';

  -- ---- Messages ----
  IF to_regclass('public.messages') IS NULL THEN
    EXECUTE '
      CREATE TABLE public.messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        message_type TEXT DEFAULT ''text'' CHECK (message_type IN (''text'', ''image'', ''file'', ''system'')),
        metadata JSONB,
        read_by UUID[] DEFAULT ''{}'',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='thread_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.messages(thread_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='sender_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id)';
  END IF;
  EXECUTE 'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY';

  -- ---- Disputes ----
  IF to_regclass('public.disputes') IS NULL THEN
    EXECUTE '
      CREATE TABLE public.disputes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
        raised_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        against UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT ''open'' CHECK (status IN (''open'', ''under_review'', ''resolved'', ''escalated'', ''closed'')),
        resolution TEXT,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='disputes' AND column_name='job_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_disputes_job ON public.disputes(job_id)';
  END IF;
  EXECUTE 'ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY';

  -- ---- Subscriptions ----
  IF to_regclass('public.subscriptions') IS NULL THEN
    EXECUTE '
      CREATE TABLE public.subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        plan_type TEXT NOT NULL CHECK (plan_type IN (''free'', ''basic'', ''professional'', ''enterprise'')),
        stripe_subscription_id TEXT,
        stripe_customer_id TEXT,
        status TEXT DEFAULT ''active'' CHECK (status IN (''active'', ''past_due'', ''cancelled'', ''trialing'', ''incomplete'')),
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        cancel_at_period_end BOOLEAN DEFAULT false,
        cancelled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id)';
  END IF;
  EXECUTE 'ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY';
END $$;

-- ============================================================================
-- RLS policies for tables (drop-and-recreate for idempotency)
-- ============================================================================

DO $$
BEGIN
  -- Reviews: public read, reviewer writes own
  IF to_regclass('public.reviews') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "reviews_select" ON public.reviews';
    EXECUTE 'CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true)';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='reviewer_id') THEN
      EXECUTE 'DROP POLICY IF EXISTS "reviews_insert" ON public.reviews';
      EXECUTE 'CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid())';
    END IF;
  END IF;

  -- Notifications: user manages own
  IF to_regclass('public.notifications') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='user_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "notifications_manage_own" ON public.notifications';
    EXECUTE 'CREATE POLICY "notifications_manage_own" ON public.notifications FOR ALL
             USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
  END IF;

  -- Message threads: participants only
  IF to_regclass('public.message_threads') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='message_threads' AND column_name='participant_ids') THEN
    EXECUTE 'DROP POLICY IF EXISTS "message_threads_access" ON public.message_threads';
    EXECUTE 'CREATE POLICY "message_threads_access" ON public.message_threads FOR ALL
             USING (auth.uid() = ANY(participant_ids))
             WITH CHECK (auth.uid() = ANY(participant_ids))';
  END IF;

  -- Messages: thread participants only (only if thread_id column exists)
  IF to_regclass('public.messages') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='thread_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "messages_access" ON public.messages';
    EXECUTE 'CREATE POLICY "messages_access" ON public.messages FOR SELECT
             USING (EXISTS (
               SELECT 1 FROM public.message_threads t
               WHERE t.id = messages.thread_id AND auth.uid() = ANY(t.participant_ids)
             ))';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='sender_id') THEN
      EXECUTE 'DROP POLICY IF EXISTS "messages_insert" ON public.messages';
      EXECUTE 'CREATE POLICY "messages_insert" ON public.messages FOR INSERT
               WITH CHECK (
                 sender_id = auth.uid()
                 AND EXISTS (
                   SELECT 1 FROM public.message_threads t
                   WHERE t.id = messages.thread_id AND auth.uid() = ANY(t.participant_ids)
                 )
               )';
    END IF;
  END IF;

  -- Disputes: participants see own
  IF to_regclass('public.disputes') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='disputes' AND column_name='raised_by') THEN
    EXECUTE 'DROP POLICY IF EXISTS "disputes_access" ON public.disputes';
    EXECUTE 'CREATE POLICY "disputes_access" ON public.disputes FOR ALL
             USING (raised_by = auth.uid() OR against = auth.uid())
             WITH CHECK (raised_by = auth.uid())';
  END IF;

  -- Subscriptions: user sees own, service_role manages
  IF to_regclass('public.subscriptions') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id') THEN
    EXECUTE 'DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions';
    EXECUTE 'CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT
             USING (user_id = auth.uid())';
    EXECUTE 'DROP POLICY IF EXISTS "subscriptions_service_role" ON public.subscriptions';
    EXECUTE 'CREATE POLICY "subscriptions_service_role" ON public.subscriptions FOR ALL
             USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

COMMIT;
