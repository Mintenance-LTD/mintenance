-- Migration: Standardize all currency column defaults to lowercase 'gbp'
-- Stripe convention uses lowercase ISO 4217 codes.
-- App display layer handles uppercasing via CURRENCIES map.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'currency') THEN
    ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'gbp';
    UPDATE public.payments SET currency = LOWER(currency) WHERE currency IS NOT NULL AND currency != LOWER(currency);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'escrow_transactions' AND column_name = 'currency') THEN
    UPDATE public.escrow_transactions SET currency = LOWER(currency) WHERE currency IS NOT NULL AND currency != LOWER(currency);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'connect_accounts' AND column_name = 'default_currency') THEN
    ALTER TABLE public.connect_accounts ALTER COLUMN default_currency SET DEFAULT 'gbp';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'connect_transfers' AND column_name = 'currency') THEN
    ALTER TABLE public.connect_transfers ALTER COLUMN currency SET DEFAULT 'gbp';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contractor_subscriptions' AND column_name = 'currency') THEN
    ALTER TABLE public.contractor_subscriptions ALTER COLUMN currency SET DEFAULT 'gbp';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'homeowner_subscriptions' AND column_name = 'currency') THEN
    ALTER TABLE public.homeowner_subscriptions ALTER COLUMN currency SET DEFAULT 'gbp';
  END IF;
END $$;
