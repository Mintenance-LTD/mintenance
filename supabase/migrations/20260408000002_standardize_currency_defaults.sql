-- Migration: Standardize all currency column defaults to lowercase 'gbp'
-- Stripe convention uses lowercase ISO 4217 codes.
-- App display layer handles uppercasing via CURRENCIES map.

-- Fix defaults on tables that used uppercase 'GBP' or mixed case
DO $$
BEGIN
  -- payments table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'currency') THEN
    ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'gbp';
  END IF;

  -- connect_accounts table (from Stripe Connect migration)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'connect_accounts' AND column_name = 'default_currency') THEN
    ALTER TABLE public.connect_accounts ALTER COLUMN default_currency SET DEFAULT 'gbp';
  END IF;

  -- connect_transfers table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'connect_transfers' AND column_name = 'currency') THEN
    ALTER TABLE public.connect_transfers ALTER COLUMN currency SET DEFAULT 'gbp';
  END IF;

  -- contractor_subscriptions table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_subscriptions' AND column_name = 'currency') THEN
    ALTER TABLE public.contractor_subscriptions ALTER COLUMN currency SET DEFAULT 'gbp';
  END IF;

  -- homeowner_subscriptions table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'homeowner_subscriptions' AND column_name = 'currency') THEN
    ALTER TABLE public.homeowner_subscriptions ALTER COLUMN currency SET DEFAULT 'gbp';
  END IF;
END $$;

-- Normalize existing uppercase values to lowercase
UPDATE public.payments SET currency = LOWER(currency) WHERE currency IS NOT NULL AND currency != LOWER(currency);
UPDATE public.escrow_transactions SET currency = LOWER(currency) WHERE currency IS NOT NULL AND currency != LOWER(currency);
