-- ============================================================================
-- Subscription System Migration
-- Creates tables and columns for contractor subscriptions, trials, and payment tracking
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add subscription and trial columns to users table
-- ============================================================================
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' CHECK (
  subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'expired')
),
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for subscription queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_status 
  ON public.users(subscription_status) 
  WHERE subscription_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_trial_ends_at 
  ON public.users(trial_ends_at) 
  WHERE trial_ends_at IS NOT NULL;

COMMENT ON COLUMN public.users.trial_ends_at IS 'End date of contractor trial period (1 month from signup)';
COMMENT ON COLUMN public.users.subscription_status IS 'Current subscription status: trial, active, past_due, canceled, expired';
COMMENT ON COLUMN public.users.trial_started_at IS 'When the contractor trial period started';

-- ============================================================================
-- 2. CONTRACTOR_SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contractor_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Stripe subscription details
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  
  -- Plan information
  plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'professional', 'enterprise')),
  plan_name TEXT NOT NULL,
  
  -- Subscription status
  status TEXT NOT NULL DEFAULT 'trial' CHECK (
    status IN ('trial', 'active', 'past_due', 'canceled', 'expired', 'unpaid')
  ),
  
  -- Billing information
  amount DECIMAL(10, 2) NOT NULL, -- Monthly subscription amount
  currency TEXT NOT NULL DEFAULT 'gbp',
  
  -- Dates
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancellation_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_amount CHECK (amount >= 0),
  CONSTRAINT valid_dates CHECK (
    (trial_end IS NULL OR trial_end >= trial_start) AND
    (current_period_end IS NULL OR current_period_end >= current_period_start)
  )
);

-- Indexes for contractor_subscriptions
CREATE INDEX IF NOT EXISTS idx_contractor_subscriptions_contractor_id 
  ON public.contractor_subscriptions(contractor_id);

CREATE INDEX IF NOT EXISTS idx_contractor_subscriptions_status 
  ON public.contractor_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_contractor_subscriptions_stripe_subscription_id 
  ON public.contractor_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_contractor_subscriptions_trial_end 
  ON public.contractor_subscriptions(trial_end) 
  WHERE trial_end IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contractor_subscriptions_current_period_end 
  ON public.contractor_subscriptions(current_period_end) 
  WHERE current_period_end IS NOT NULL;

-- Ensure one active subscription per contractor
CREATE UNIQUE INDEX IF NOT EXISTS idx_contractor_subscriptions_active_contractor 
  ON public.contractor_subscriptions(contractor_id) 
  WHERE status IN ('trial', 'active');

-- ============================================================================
-- 3. SUBSCRIPTION_FEATURES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL UNIQUE CHECK (plan_type IN ('basic', 'professional', 'enterprise')),
  
  -- Feature limits
  max_jobs INTEGER, -- NULL means unlimited
  max_active_jobs INTEGER DEFAULT 10,
  priority_support BOOLEAN DEFAULT FALSE,
  advanced_analytics BOOLEAN DEFAULT FALSE,
  custom_branding BOOLEAN DEFAULT FALSE,
  api_access BOOLEAN DEFAULT FALSE,
  
  -- Additional features as JSONB
  additional_features JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Insert default feature sets for each plan
INSERT INTO public.subscription_features (plan_type, max_jobs, max_active_jobs, priority_support, advanced_analytics, custom_branding, api_access)
VALUES
  ('basic', 10, 5, FALSE, FALSE, FALSE, FALSE),
  ('professional', 50, 20, TRUE, TRUE, FALSE, FALSE),
  ('enterprise', NULL, NULL, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (plan_type) DO NOTHING;

-- ============================================================================
-- 4. PAYMENT_TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Payment type
  payment_type TEXT NOT NULL CHECK (payment_type IN ('subscription', 'transaction_fee', 'platform_fee')),
  
  -- Relationships
  contractor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.contractor_subscriptions(id) ON DELETE SET NULL,
  escrow_payment_id UUID, -- Reference to escrow_payments if it exists
  
  -- Payment details
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'gbp',
  
  -- Fee breakdown
  platform_fee DECIMAL(10, 2) DEFAULT 0,
  stripe_fee DECIMAL(10, 2) DEFAULT 0,
  net_revenue DECIMAL(10, 2) NOT NULL, -- Amount after Stripe fees
  
  -- Payment status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'completed', 'failed', 'refunded')
  ),
  
  -- Stripe references
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  stripe_charge_id TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_amount CHECK (amount >= 0),
  CONSTRAINT valid_fees CHECK (platform_fee >= 0 AND stripe_fee >= 0)
);

-- Indexes for payment_tracking
CREATE INDEX IF NOT EXISTS idx_payment_tracking_contractor_id 
  ON public.payment_tracking(contractor_id);

CREATE INDEX IF NOT EXISTS idx_payment_tracking_payment_type 
  ON public.payment_tracking(payment_type);

CREATE INDEX IF NOT EXISTS idx_payment_tracking_status 
  ON public.payment_tracking(status);

CREATE INDEX IF NOT EXISTS idx_payment_tracking_created_at 
  ON public.payment_tracking(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_tracking_subscription_id 
  ON public.payment_tracking(subscription_id);

-- Add foreign key constraint only if escrow_payments table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'escrow_payments') THEN
    ALTER TABLE public.payment_tracking
    ADD CONSTRAINT fk_payment_tracking_escrow_payment_id
    FOREIGN KEY (escrow_payment_id) REFERENCES public.escrow_payments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Composite index for revenue analytics
CREATE INDEX IF NOT EXISTS idx_payment_tracking_revenue_analytics 
  ON public.payment_tracking(payment_type, status, created_at DESC) 
  WHERE status = 'completed';

-- ============================================================================
-- 5. Triggers
-- ============================================================================

-- Update updated_at timestamp for contractor_subscriptions
CREATE OR REPLACE FUNCTION update_contractor_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contractor_subscriptions_updated_at
  BEFORE UPDATE ON public.contractor_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_contractor_subscriptions_updated_at();

-- Update updated_at timestamp for subscription_features
CREATE TRIGGER subscription_features_updated_at
  BEFORE UPDATE ON public.subscription_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. RLS Policies
-- ============================================================================

ALTER TABLE public.contractor_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_tracking ENABLE ROW LEVEL SECURITY;

-- Contractors can view their own subscriptions
CREATE POLICY "Contractors can view own subscriptions"
  ON public.contractor_subscriptions
  FOR SELECT
  USING (contractor_id = auth.uid());

-- Service role can manage all subscriptions
CREATE POLICY "Service role can manage subscriptions"
  ON public.contractor_subscriptions
  FOR ALL
  USING (true);

-- Everyone can view subscription features (public pricing)
CREATE POLICY "Everyone can view subscription features"
  ON public.subscription_features
  FOR SELECT
  USING (true);

-- Contractors can view their own payment tracking
CREATE POLICY "Contractors can view own payment tracking"
  ON public.payment_tracking
  FOR SELECT
  USING (contractor_id = auth.uid());

-- Service role can manage all payment tracking
CREATE POLICY "Service role can manage payment tracking"
  ON public.payment_tracking
  FOR ALL
  USING (true);

-- Admins can view all payment tracking
CREATE POLICY "Admins can view all payment tracking"
  ON public.payment_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 7. Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.contractor_subscriptions IS 'Stores contractor subscription information including Stripe subscription details';
COMMENT ON TABLE public.subscription_features IS 'Defines feature limits for each subscription plan tier';
COMMENT ON TABLE public.payment_tracking IS 'Tracks all revenue: subscription payments and transaction fees for analytics';

COMMIT;

