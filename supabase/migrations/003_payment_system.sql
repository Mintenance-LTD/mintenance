-- Consolidated Payment System Migration
-- Single source of truth for all payment-related tables

-- Payments table (MERGED VERSION - includes all columns from duplicates)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  bid_id UUID REFERENCES public.bids(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES public.profiles(id),
  payee_id UUID REFERENCES public.profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'GBP',
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'in_escrow', 'released',
    'completed', 'failed', 'refunded', 'disputed'
  )),
  payment_method TEXT CHECK (payment_method IN ('stripe', 'paypal', 'bank_transfer')),
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_transfer_id TEXT,
  stripe_refund_id TEXT,
  escrow_released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment methods (saved payment methods)
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('card', 'bank_account')),
  stripe_payment_method_id TEXT,
  last4 TEXT,
  brand TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escrow accounts
CREATE TABLE IF NOT EXISTS public.escrow_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'held' CHECK (status IN ('held', 'releasing', 'released', 'refunded')),
  release_conditions JSONB,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_job ON public.payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON public.payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payee ON public.payments(payee_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON public.payment_methods(user_id);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_accounts ENABLE ROW LEVEL SECURITY;
