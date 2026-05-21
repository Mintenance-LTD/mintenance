-- Idempotency + webhook hardening (2026-05-21)
--
-- Fixes verified in audit on 2026-05-21:
--   1. idempotency_keys lives in production but no active migration recreates it.
--      A fresh `supabase db reset` would break every idempotent route.
--   2. invoice_payments has no unique constraint on invoice_id, but Stripe
--      invoice webhook handlers upsert with onConflict: 'invoice_id'. PostgREST
--      rejects those upserts; failures are only logged.
--   3. check_webhook_idempotency() did SELECT-then-INSERT with no exception
--      handler. Concurrent Stripe redeliveries raced into a unique violation
--      and the route returned 500, prompting Stripe to retry forever.
--   4. escrow_transactions has no standalone index on payment_intent_id (only
--      a partial UNIQUE on (job_id, payment_intent_id)). Stripe webhook lookups
--      do `WHERE payment_intent_id = ?` and cannot use the composite.

------------------------------------------------------------------------------
-- 1. idempotency_keys: canonical recreation (no-op if already present)
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  operation       TEXT NOT NULL,
  result          JSONB NOT NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT idempotency_keys_idempotency_key_operation_key
    UNIQUE (idempotency_key, operation)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
  ON public.idempotency_keys (created_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_operation
  ON public.idempotency_keys (operation);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_id
  ON public.idempotency_keys (user_id);
-- NOTE: idx_idempotency_keys_key (single col on idempotency_key) intentionally
-- not created here — it's redundant with the leading column of the composite
-- UNIQUE. The live DB has it but new environments don't need it.

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'idempotency_keys'
      AND policyname = 'idempotency_keys_user_access'
  ) THEN
    CREATE POLICY idempotency_keys_user_access ON public.idempotency_keys
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'idempotency_keys'
      AND policyname = 'idempotency_keys_insert'
  ) THEN
    CREATE POLICY idempotency_keys_insert ON public.idempotency_keys
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'idempotency_keys'
      AND policyname = 'idempotency_keys_service_role'
  ) THEN
    CREATE POLICY idempotency_keys_service_role ON public.idempotency_keys
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

------------------------------------------------------------------------------
-- 2. invoice_payments: add UNIQUE(invoice_id) so onConflict: 'invoice_id' works
------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'invoice_payments'
      AND c.contype = 'u'
      AND c.conname = 'invoice_payments_invoice_id_key'
  ) THEN
    -- Safe: row count verified zero before this migration was authored.
    ALTER TABLE public.invoice_payments
      ADD CONSTRAINT invoice_payments_invoice_id_key UNIQUE (invoice_id);
  END IF;
END $$;

------------------------------------------------------------------------------
-- 3. check_webhook_idempotency: rewrite as atomic INSERT ... ON CONFLICT
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_webhook_idempotency(
  p_idempotency_key TEXT,
  p_event_type      TEXT,
  p_event_id        TEXT,
  p_source          TEXT,
  p_payload         JSONB
)
RETURNS TABLE(is_duplicate BOOLEAN, event_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_new_id      UUID;
  v_existing_id UUID;
BEGIN
  -- Atomic claim. If two concurrent calls arrive with the same key,
  -- exactly one INSERT succeeds; the other gets the conflict path.
  INSERT INTO public.webhook_events (
    idempotency_key, event_type, event_id, source, payload, status
  ) VALUES (
    p_idempotency_key, p_event_type, p_event_id, p_source, p_payload, 'pending'
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_new_id;

  IF v_new_id IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, v_new_id;
  ELSE
    SELECT we.id INTO v_existing_id
    FROM public.webhook_events we
    WHERE we.idempotency_key = p_idempotency_key;
    RETURN QUERY SELECT TRUE, v_existing_id;
  END IF;
END;
$function$;

------------------------------------------------------------------------------
-- 4. escrow_transactions: add standalone index on payment_intent_id
--    Stripe webhooks look up by payment_intent_id alone; the existing
--    partial UNIQUE on (job_id, payment_intent_id) cannot serve those queries.
------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_payment_intent_id
  ON public.escrow_transactions (payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;
