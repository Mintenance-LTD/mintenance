-- Immutable early-access grants + homeowner premium subscription records

BEGIN;

-- ---------------------------------------------------------------------------
-- Early-access grants (immutable cohorts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.early_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('homeowner', 'contractor')),
  grant_type TEXT NOT NULL DEFAULT 'max_subscription_features',
  granted_by TEXT NOT NULL DEFAULT 'system_cohort_seed',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  UNIQUE (user_id, grant_type)
);

CREATE INDEX IF NOT EXISTS idx_early_access_grants_user
  ON public.early_access_grants(user_id);

CREATE INDEX IF NOT EXISTS idx_early_access_grants_role
  ON public.early_access_grants(role, granted_at);

ALTER TABLE public.early_access_grants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'early_access_grants'
      AND policyname = 'early_access_grants_service_role_all'
  ) THEN
    CREATE POLICY early_access_grants_service_role_all
      ON public.early_access_grants
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Seed immutable cohort:
-- - First 50 contractors by profiles.created_at
-- - First 30 homeowners by profiles.created_at
INSERT INTO public.early_access_grants (user_id, role, grant_type, granted_by, notes)
SELECT p.id, 'contractor', 'max_subscription_features', 'migration_seed', 'Initial immutable cohort'
FROM public.profiles p
WHERE p.role = 'contractor'
ORDER BY p.created_at ASC
LIMIT 50
ON CONFLICT (user_id, grant_type) DO NOTHING;

INSERT INTO public.early_access_grants (user_id, role, grant_type, granted_by, notes)
SELECT p.id, 'homeowner', 'max_subscription_features', 'migration_seed', 'Initial immutable cohort'
FROM public.profiles p
WHERE p.role = 'homeowner'
ORDER BY p.created_at ASC
LIMIT 30
ON CONFLICT (user_id, grant_type) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Homeowner premium subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homeowner_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  plan_type TEXT NOT NULL DEFAULT 'premium' CHECK (plan_type IN ('premium')),
  plan_name TEXT NOT NULL DEFAULT 'Homeowner Premium',
  status TEXT NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('incomplete', 'active', 'past_due', 'unpaid', 'canceled', 'expired', 'trial')),
  amount NUMERIC(10,2) NOT NULL DEFAULT 9.99,
  currency TEXT NOT NULL DEFAULT 'gbp',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_homeowner_subscriptions_active_unique
  ON public.homeowner_subscriptions(homeowner_id)
  WHERE status IN ('incomplete', 'active', 'past_due', 'unpaid', 'trial');

CREATE INDEX IF NOT EXISTS idx_homeowner_subscriptions_homeowner
  ON public.homeowner_subscriptions(homeowner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_homeowner_subscriptions_stripe_sub
  ON public.homeowner_subscriptions(stripe_subscription_id);

ALTER TABLE public.homeowner_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'homeowner_subscriptions'
      AND policyname = 'homeowner_subscriptions_service_role_all'
  ) THEN
    CREATE POLICY homeowner_subscriptions_service_role_all
      ON public.homeowner_subscriptions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;

