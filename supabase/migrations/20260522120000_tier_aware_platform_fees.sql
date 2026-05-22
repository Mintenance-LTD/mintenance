-- 2026-05-22 — Sprint 2 of feat/tiered-pricing.
--
-- Make the platform fee rate tier-aware so FeeCalculationService can read it
-- per-contractor. Single source of truth lives in this table (web config
-- PLATFORM_FEE_RATE_BY_TIER mirrors these values for the TS side).
--
-- Also fixes stale max_active_jobs: free/basic were set to 1 (legacy demo
-- seed) but the approved policy is 3 concurrent active jobs for free/basic,
-- unlimited (NULL) for professional/enterprise.

BEGIN;

-- 1. Add platform_fee_rate column with sensible default + range constraint
ALTER TABLE public.subscription_features
  ADD COLUMN IF NOT EXISTS platform_fee_rate NUMERIC(5, 4)
    NOT NULL
    DEFAULT 0.1200;

ALTER TABLE public.subscription_features
  DROP CONSTRAINT IF EXISTS subscription_features_platform_fee_rate_range;

ALTER TABLE public.subscription_features
  ADD CONSTRAINT subscription_features_platform_fee_rate_range
    CHECK (platform_fee_rate >= 0 AND platform_fee_rate <= 1);

COMMENT ON COLUMN public.subscription_features.platform_fee_rate IS
  'Platform fee as a decimal rate (0.12 = 12%). Read by FeeCalculationService at payment time. Source of truth — TS PLATFORM_FEE_RATE_BY_TIER must mirror these values.';

-- 2. Seed approved rates per tier
-- free   = 0.12 (acquisition tier, drives upgrade)
-- basic  = 0.12 (same as free; consolidated)
-- pro    = 0.08 (Pro saves ~£725/mo of work justifies £29 sub)
-- biz    = 0.05 (Business; absolute floor, justifies £99 sub)
UPDATE public.subscription_features SET platform_fee_rate = 0.1200 WHERE plan_type = 'free';
UPDATE public.subscription_features SET platform_fee_rate = 0.1200 WHERE plan_type = 'basic';
UPDATE public.subscription_features SET platform_fee_rate = 0.0800 WHERE plan_type = 'professional';
UPDATE public.subscription_features SET platform_fee_rate = 0.0500 WHERE plan_type = 'enterprise';

-- 3. Fix stale max_active_jobs (legacy seed had 1 for free/basic).
-- Approved policy: 3 concurrent active jobs on free/basic, unlimited (NULL)
-- on professional/enterprise.
UPDATE public.subscription_features SET max_active_jobs = 3 WHERE plan_type = 'free';
UPDATE public.subscription_features SET max_active_jobs = 3 WHERE plan_type = 'basic';
UPDATE public.subscription_features SET max_active_jobs = NULL WHERE plan_type = 'professional';
UPDATE public.subscription_features SET max_active_jobs = NULL WHERE plan_type = 'enterprise';

-- 4. Audit log row (so we can verify in admin_activity_log who shipped this)
-- Skip — admin_activity_log requires admin_id, not appropriate for a system migration.

COMMIT;
