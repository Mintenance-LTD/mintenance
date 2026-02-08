-- Add missing tables, stored functions, and triggers
-- These are referenced by active code but were never created in the database
-- Applied to remote Supabase on 2026-02-08

-- ============================================================
-- 1. AUTH TABLES (referenced by database.ts and auth.ts)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON public.password_history(user_id);

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON public.login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts(created_at);

-- RLS for auth tables
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS password_reset_tokens_service ON public.password_reset_tokens FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS password_history_service ON public.password_history FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS login_attempts_service ON public.login_attempts FOR ALL USING (true);

-- ============================================================
-- 2. STORED FUNCTIONS (called via supabase.rpc() in database.ts)
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_failed_login(
  attempt_user_id UUID,
  attempt_email TEXT,
  attempt_ip TEXT,
  attempt_user_agent TEXT,
  attempt_failure_reason TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.login_attempts (user_id, email, ip_address, user_agent, success, failure_reason)
  VALUES (attempt_user_id, attempt_email, attempt_ip, attempt_user_agent, false, attempt_failure_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.record_successful_login(
  login_user_id UUID,
  login_email TEXT,
  login_ip TEXT,
  login_user_agent TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.login_attempts (user_id, email, ip_address, user_agent, success)
  VALUES (login_user_id, login_email, login_ip, login_user_agent, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_account_locked(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  failed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO failed_count
  FROM public.login_attempts
  WHERE user_id = check_user_id
    AND success = false
    AND created_at > NOW() - INTERVAL '15 minutes';
  RETURN failed_count >= 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.add_password_to_history(
  history_user_id UUID,
  new_password_hash TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.password_history (user_id, password_hash)
  VALUES (history_user_id, new_password_hash);
  -- Keep only last 5 passwords
  DELETE FROM public.password_history
  WHERE user_id = history_user_id
    AND id NOT IN (
      SELECT id FROM public.password_history
      WHERE user_id = history_user_id
      ORDER BY created_at DESC
      LIMIT 5
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. HANDLE NEW USER TRIGGER (profiles only - users table eliminated)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'homeowner')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. STRIPE/PAYMENT TABLES (referenced by webhook handlers)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contractor_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id TEXT,
  stripe_charges_enabled BOOLEAN DEFAULT false,
  stripe_payouts_enabled BOOLEAN DEFAULT false,
  stripe_details_submitted BOOLEAN DEFAULT false,
  subscription_status TEXT DEFAULT 'free',
  subscription_tier TEXT DEFAULT 'free',
  hourly_rate DECIMAL(10,2),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.contractor_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id TEXT NOT NULL,
  contractor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id TEXT,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'gbp',
  status TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  invoice_url TEXT,
  attempt_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_contractor ON public.invoice_payments(contractor_id);
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  job_id UUID,
  contractor_id UUID,
  customer_email TEXT,
  amount_total DECIMAL(10,2),
  currency TEXT,
  payment_status TEXT,
  status TEXT,
  success_url TEXT,
  subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id TEXT NOT NULL,
  job_id UUID REFERENCES public.jobs(id),
  amount DECIMAL(10,2),
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. FEATURE FLAG TABLES (referenced by feature-flags API)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.feature_flag_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT NOT NULL,
  evaluations INTEGER DEFAULT 0,
  enabled_count INTEGER DEFAULT 0,
  disabled_count INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.feature_flag_metrics ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.feature_flag_rollbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  rolled_back_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.feature_flag_rollbacks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.feature_flag_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.feature_flag_config ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. CONTRACTOR POSTS TABLE (referenced by upload-photos API)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contractor_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  photos TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contractor_posts_contractor ON public.contractor_posts(contractor_id);
ALTER TABLE public.contractor_posts ENABLE ROW LEVEL SECURITY;
