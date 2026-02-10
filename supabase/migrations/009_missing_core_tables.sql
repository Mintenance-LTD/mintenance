-- Migration: Add missing core tables referenced in code but never created
-- Date: 2026-02-09
-- Fixes: P0-10 database migration gap — fresh db reset would fail without these

BEGIN;

-- ============================================================================
-- contractor_skills — referenced by queries, RLS policies, and certification routes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contractor_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_icon TEXT,
  years_experience INTEGER,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contractor_id, skill_name)
);

CREATE INDEX IF NOT EXISTS idx_contractor_skills_contractor ON public.contractor_skills(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_skills_name ON public.contractor_skills(skill_name);
ALTER TABLE public.contractor_skills ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- contractor_certifications — referenced by certification management routes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contractor_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuing_body TEXT,
  certificate_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  document_url TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contractor_certs_contractor ON public.contractor_certifications(contractor_id);
ALTER TABLE public.contractor_certifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- reviews — referenced by contractor profile data, review endpoints
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_job ON public.reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews(reviewee_id);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- notifications — referenced by 43+ code files
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- message_threads — referenced by messaging routes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  participant_ids UUID[] NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_threads_job ON public.message_threads(job_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_last ON public.message_threads(last_message_at DESC);
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- messages — referenced by 18+ code files
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  metadata JSONB,
  read_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- properties — referenced by property management routes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'UK',
  property_type TEXT CHECK (property_type IN ('residential', 'commercial', 'rental', 'house', 'apartment', 'flat', 'detached', 'semi-detached', 'terraced', 'bungalow', 'cottage', 'other')),
  bedrooms INTEGER,
  bathrooms INTEGER,
  square_footage INTEGER CHECK (square_footage > 0),
  year_built INTEGER,
  photos TEXT[],
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_owner ON public.properties(owner_id);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- disputes — referenced by contracts route
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  against UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'escalated', 'closed')),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_job ON public.disputes(job_id);
CREATE INDEX IF NOT EXISTS idx_disputes_raised ON public.disputes(raised_by);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- subscriptions — referenced by subscription management
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'basic', 'professional', 'enterprise')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'incomplete')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS policies for new tables
-- ============================================================================

-- NOTE: contractor_skills and contractor_certifications RLS policies are created
-- by migration 20260208003000_contractor_skills_certs_rls.sql — not duplicated here.

-- reviews: public read, reviewer writes own
CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "reviews_update" ON public.reviews FOR UPDATE
  USING (reviewer_id = auth.uid()) WITH CHECK (reviewer_id = auth.uid());

-- notifications: user manages own
CREATE POLICY "notifications_manage_own" ON public.notifications FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- message_threads: participants only
CREATE POLICY "message_threads_access" ON public.message_threads FOR ALL
  USING (auth.uid() = ANY(participant_ids))
  WITH CHECK (auth.uid() = ANY(participant_ids));

-- messages: thread participants only
CREATE POLICY "messages_access" ON public.messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.message_threads t
    WHERE t.id = messages.thread_id AND auth.uid() = ANY(t.participant_ids)
  ));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.message_threads t
      WHERE t.id = messages.thread_id AND auth.uid() = ANY(t.participant_ids)
    )
  );

-- properties: owner manages own
CREATE POLICY "properties_manage_own" ON public.properties FOR ALL
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- disputes: participants see own
CREATE POLICY "disputes_access" ON public.disputes FOR ALL
  USING (raised_by = auth.uid() OR against = auth.uid())
  WITH CHECK (raised_by = auth.uid());

-- subscriptions: user sees own, service_role manages
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "subscriptions_service_role" ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

COMMIT;
