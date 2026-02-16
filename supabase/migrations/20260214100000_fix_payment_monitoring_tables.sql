-- Migration: Create missing payment monitoring tables + fix escrow_transactions schema
-- Date: 2026-02-14
--
-- Bug 1: POST /api/payments/create-intent returns "Job not found" because
--   PaymentMonitoringService.detectAnomalies() queries 3 tables that don't exist:
--   payment_attempts, user_devices, payment_security_events.
--   The failed PostgREST queries corrupt the schema cache, causing subsequent
--   queries to also fail.
--
-- Bug 2: escrow_transactions is missing stripe_charge_id and stripe_checkout_session_id
--   columns used by checkout-handlers.ts and FeeTransferService.ts.

BEGIN;

-- ============================================================================
-- 1. PAYMENT ATTEMPTS TABLE
-- Used by: PaymentMonitoringService (trackFailureRate, checkGeographicAnomaly)
--          create-intent/route.ts (records each payment attempt)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payment_intent_id TEXT,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'gbp',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  failure_reason TEXT,
  ip_address TEXT,
  geo_location JSONB,
  device_fingerprint TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_user_id
  ON public.payment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_created_at
  ON public.payment_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status
  ON public.payment_attempts(status);

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_attempts' AND policyname = 'payment_attempts_select_own'
  ) THEN
    CREATE POLICY "payment_attempts_select_own" ON public.payment_attempts
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_attempts' AND policyname = 'payment_attempts_service_role'
  ) THEN
    CREATE POLICY "payment_attempts_service_role" ON public.payment_attempts
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- 2. USER DEVICES TABLE
-- Used by: PaymentMonitoringService (checkDeviceAnomaly)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  is_trusted BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  CONSTRAINT unique_user_device UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id
  ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint
  ON public.user_devices(device_fingerprint);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_devices' AND policyname = 'user_devices_manage_own'
  ) THEN
    CREATE POLICY "user_devices_manage_own" ON public.user_devices
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_devices' AND policyname = 'user_devices_service_role'
  ) THEN
    CREATE POLICY "user_devices_service_role" ON public.user_devices
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- 3. PAYMENT SECURITY EVENTS TABLE
-- Used by: PaymentMonitoringService (alertOnHighRiskTransaction)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  transaction_type TEXT,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'gbp',
  reasons TEXT[] DEFAULT '{}',
  blocked_reasons TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_security_events_user_id
  ON public.payment_security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_security_events_created_at
  ON public.payment_security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_security_events_event_type
  ON public.payment_security_events(event_type);

ALTER TABLE public.payment_security_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_security_events' AND policyname = 'payment_security_events_admin_read'
  ) THEN
    CREATE POLICY "payment_security_events_admin_read" ON public.payment_security_events
      FOR SELECT
      USING (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_security_events' AND policyname = 'payment_security_events_service_role'
  ) THEN
    CREATE POLICY "payment_security_events_service_role" ON public.payment_security_events
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- 4. ADD MISSING COLUMNS TO ESCROW_TRANSACTIONS
-- stripe_charge_id: used by checkout-handlers.ts, FeeTransferService.ts
-- stripe_checkout_session_id: used by checkout-handlers.ts
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'escrow_transactions'
      AND column_name = 'stripe_charge_id'
  ) THEN
    ALTER TABLE public.escrow_transactions ADD COLUMN stripe_charge_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'escrow_transactions'
      AND column_name = 'stripe_checkout_session_id'
  ) THEN
    ALTER TABLE public.escrow_transactions ADD COLUMN stripe_checkout_session_id TEXT;
  END IF;
END $$;

COMMIT;
