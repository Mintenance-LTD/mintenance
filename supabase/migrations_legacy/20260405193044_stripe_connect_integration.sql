-- Stripe Connect + Elements integration schema.

-- Stripe Customer (homeowner) - attached to Stripe payment methods
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Stripe Connect Express Account (contractor) - receives payouts
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT UNIQUE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_transfers_active BOOLEAN DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_requirements_pending JSONB;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect
  ON public.profiles(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON public.profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Threshold-held payout balance per contractor
CREATE TABLE IF NOT EXISTS public.contractor_payout_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'GBP',
  pending_amount_minor BIGINT NOT NULL DEFAULT 0,
  lifetime_paid_out_minor BIGINT NOT NULL DEFAULT 0,
  last_payout_at TIMESTAMPTZ,
  last_payout_transfer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (contractor_id, currency)
);

CREATE INDEX IF NOT EXISTS idx_payout_balances_contractor
  ON public.contractor_payout_balances(contractor_id);

ALTER TABLE public.contractor_payout_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payout_balances_select_own" ON public.contractor_payout_balances;
CREATE POLICY "payout_balances_select_own" ON public.contractor_payout_balances
  FOR SELECT TO authenticated
  USING (contractor_id = auth.uid());

DROP POLICY IF EXISTS "payout_balances_service_role" ON public.contractor_payout_balances;
CREATE POLICY "payout_balances_service_role" ON public.contractor_payout_balances
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Transfer history (audit trail)
CREATE TABLE IF NOT EXISTS public.contractor_payout_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  stripe_transfer_id TEXT NOT NULL UNIQUE,
  stripe_destination_account TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'reversed')),
  related_job_ids UUID[] DEFAULT '{}',
  metadata JSONB,
  failure_code TEXT,
  failure_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payout_transfers_contractor
  ON public.contractor_payout_transfers(contractor_id, created_at DESC);

ALTER TABLE public.contractor_payout_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payout_transfers_select_own" ON public.contractor_payout_transfers;
CREATE POLICY "payout_transfers_select_own" ON public.contractor_payout_transfers
  FOR SELECT TO authenticated
  USING (contractor_id = auth.uid());

DROP POLICY IF EXISTS "payout_transfers_service_role" ON public.contractor_payout_transfers;
CREATE POLICY "payout_transfers_service_role" ON public.contractor_payout_transfers
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Setup Intents for Elements flow tracking
CREATE TABLE IF NOT EXISTS public.stripe_setup_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_setup_intent_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'succeeded', 'canceled')),
  payment_method_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_setup_intents_user ON public.stripe_setup_intents(user_id, created_at DESC);

ALTER TABLE public.stripe_setup_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "setup_intents_select_own" ON public.stripe_setup_intents;
CREATE POLICY "setup_intents_select_own" ON public.stripe_setup_intents
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "setup_intents_service_role" ON public.stripe_setup_intents;
CREATE POLICY "setup_intents_service_role" ON public.stripe_setup_intents
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');;
