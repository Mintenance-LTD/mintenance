-- Migration: Add missing trial/subscription columns to profiles
-- Date: 2026-02-08
-- Fixes: "column u.trial_ends_at does not exist" error in check_trial_status RPC
-- These columns are referenced by 3 SQL functions (check_trial_status,
-- initialize_trial_period, require_subscription) and by SubscriptionService.ts
-- and TrialNotifications.ts, but were never added to the profiles table.

BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at ON public.profiles(trial_ends_at);

COMMIT;
