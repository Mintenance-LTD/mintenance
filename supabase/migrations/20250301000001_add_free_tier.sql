-- ============================================================================
-- Add Free Tier to Subscription System
-- Adds 'free' plan type to subscription system with limited features
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Update contractor_subscriptions CHECK constraint
-- ============================================================================
ALTER TABLE public.contractor_subscriptions
DROP CONSTRAINT IF EXISTS contractor_subscriptions_plan_type_check;

ALTER TABLE public.contractor_subscriptions
ADD CONSTRAINT contractor_subscriptions_plan_type_check 
CHECK (plan_type IN ('free', 'basic', 'professional', 'enterprise'));

-- Update status CHECK constraint to include 'free'
ALTER TABLE public.contractor_subscriptions
DROP CONSTRAINT IF EXISTS contractor_subscriptions_status_check;

ALTER TABLE public.contractor_subscriptions
ADD CONSTRAINT contractor_subscriptions_status_check 
CHECK (status IN ('free', 'trial', 'active', 'past_due', 'canceled', 'expired', 'unpaid'));

-- ============================================================================
-- 2. Update subscription_features CHECK constraint
-- ============================================================================
ALTER TABLE public.subscription_features
DROP CONSTRAINT IF EXISTS subscription_features_plan_type_check;

ALTER TABLE public.subscription_features
ADD CONSTRAINT subscription_features_plan_type_check 
CHECK (plan_type IN ('free', 'basic', 'professional', 'enterprise'));

-- ============================================================================
-- 3. Insert free tier features
-- ============================================================================
INSERT INTO public.subscription_features (
  plan_type, 
  max_jobs, 
  max_active_jobs, 
  priority_support, 
  advanced_analytics, 
  custom_branding, 
  api_access
)
VALUES
  ('free', 3, 1, FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (plan_type) DO UPDATE SET
  max_jobs = EXCLUDED.max_jobs,
  max_active_jobs = EXCLUDED.max_active_jobs,
  priority_support = EXCLUDED.priority_support,
  advanced_analytics = EXCLUDED.advanced_analytics,
  custom_branding = EXCLUDED.custom_branding,
  api_access = EXCLUDED.api_access,
  updated_at = NOW();

-- ============================================================================
-- 4. Update unique index to include 'free' status
-- ============================================================================
DROP INDEX IF EXISTS idx_contractor_subscriptions_active_contractor;

CREATE UNIQUE INDEX idx_contractor_subscriptions_active_contractor 
ON public.contractor_subscriptions(contractor_id) 
WHERE status IN ('free', 'trial', 'active');

-- ============================================================================
-- 5. Update users subscription_status CHECK constraint
-- ============================================================================
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_subscription_status_check;

ALTER TABLE public.users
ADD CONSTRAINT users_subscription_status_check 
CHECK (subscription_status IN ('free', 'trial', 'active', 'past_due', 'canceled', 'expired'));

COMMENT ON TABLE public.subscription_features IS 'Defines feature limits for each subscription plan tier. Free tier: 3 jobs, 1 active job.';

COMMIT;

