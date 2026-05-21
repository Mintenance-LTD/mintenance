-- Idempotency claim-then-complete pattern (2026-05-21)
--
-- Replaces the broken advisory-lock approach in apps/web/lib/idempotency.ts.
-- The previous design called pg_try_advisory_lock and pg_advisory_unlock as
-- two separate PostgREST requests; in Supabase's transaction-pool mode the
-- unlock can hit a different backend than the lock, so locks leak and the
-- window between check and store is unprotected.
--
-- New design: claim row atomically (INSERT ... ON CONFLICT DO NOTHING).
--   - If insert succeeded, caller owns the operation.
--   - If conflict and existing row is 'completed', caller gets cached result.
--   - If conflict and existing row is 'pending' (another request is in flight),
--     caller gets is_pending=true and should return 503 / Retry-Later.
--   - If pending row is older than p_stale_after_seconds, treat as abandoned
--     (crashed process) and take it over.

------------------------------------------------------------------------------
-- 1. Schema: add status + claimed_at to idempotency_keys
------------------------------------------------------------------------------
ALTER TABLE public.idempotency_keys
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';

ALTER TABLE public.idempotency_keys
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'idempotency_keys_status_check'
      AND conrelid = 'public.idempotency_keys'::regclass
  ) THEN
    ALTER TABLE public.idempotency_keys
      ADD CONSTRAINT idempotency_keys_status_check
      CHECK (status IN ('pending', 'completed'));
  END IF;
END $$;

-- Partial index for fast stale-claim sweeps
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_pending
  ON public.idempotency_keys (claimed_at)
  WHERE status = 'pending';

------------------------------------------------------------------------------
-- 2. Atomic claim RPC
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.try_claim_idempotency_key(
  p_idempotency_key      TEXT,
  p_operation            TEXT,
  p_user_id              UUID DEFAULT NULL,
  p_metadata             JSONB DEFAULT NULL,
  p_stale_after_seconds  INT  DEFAULT 60
)
RETURNS TABLE(
  claimed             BOOLEAN,
  is_duplicate        BOOLEAN,
  is_pending          BOOLEAN,
  cached_result       JSONB,
  cached_created_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_new_id   UUID;
  v_existing public.idempotency_keys%ROWTYPE;
  v_stale_cutoff TIMESTAMPTZ;
BEGIN
  -- Atomic claim attempt: insert as 'pending' with placeholder result.
  INSERT INTO public.idempotency_keys (
    idempotency_key, operation, result, user_id, metadata, status, claimed_at
  )
  VALUES (
    p_idempotency_key, p_operation, '{}'::jsonb, p_user_id, p_metadata, 'pending', NOW()
  )
  ON CONFLICT (idempotency_key, operation) DO NOTHING
  RETURNING id INTO v_new_id;

  IF v_new_id IS NOT NULL THEN
    -- We own this operation.
    RETURN QUERY SELECT TRUE, FALSE, FALSE, NULL::jsonb, NULL::timestamptz;
    RETURN;
  END IF;

  -- Conflict path: a row exists.
  SELECT * INTO v_existing
  FROM public.idempotency_keys
  WHERE idempotency_key = p_idempotency_key AND operation = p_operation;

  IF v_existing.status = 'completed' THEN
    RETURN QUERY SELECT FALSE, TRUE, FALSE, v_existing.result, v_existing.created_at;
    RETURN;
  END IF;

  -- status = 'pending'. Decide takeover vs wait.
  v_stale_cutoff := NOW() - make_interval(secs => p_stale_after_seconds);

  IF v_existing.claimed_at IS NULL OR v_existing.claimed_at < v_stale_cutoff THEN
    -- Stale claim. Take it over. Re-stamp claimed_at and clear result.
    UPDATE public.idempotency_keys
       SET claimed_at = NOW(),
           result     = '{}'::jsonb,
           metadata   = COALESCE(p_metadata, metadata),
           user_id    = COALESCE(p_user_id, user_id)
     WHERE id = v_existing.id
       AND (claimed_at IS NULL OR claimed_at < v_stale_cutoff);
    -- The WHERE guard prevents a race with another claim attempt for the
    -- same key. If we didn't update (another process beat us), report pending.
    IF FOUND THEN
      RETURN QUERY SELECT TRUE, FALSE, FALSE, NULL::jsonb, NULL::timestamptz;
      RETURN;
    END IF;
  END IF;

  -- Active pending claim. Caller must back off / return 503.
  RETURN QUERY SELECT FALSE, FALSE, TRUE, NULL::jsonb, v_existing.created_at;
END;
$function$;

------------------------------------------------------------------------------
-- 3. Completion RPC: mark a claim 'completed' and store the result
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_idempotency_claim(
  p_idempotency_key TEXT,
  p_operation       TEXT,
  p_result          JSONB,
  p_user_id         UUID  DEFAULT NULL,
  p_metadata        JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_updated INT;
BEGIN
  UPDATE public.idempotency_keys
     SET status     = 'completed',
         result     = p_result,
         user_id    = COALESCE(p_user_id, user_id),
         metadata   = COALESCE(p_metadata, metadata)
   WHERE idempotency_key = p_idempotency_key
     AND operation       = p_operation
     AND status          = 'pending';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$function$;

------------------------------------------------------------------------------
-- 4. Release RPC: drop a pending claim (e.g., operation failed)
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_idempotency_claim(
  p_idempotency_key TEXT,
  p_operation       TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.idempotency_keys
   WHERE idempotency_key = p_idempotency_key
     AND operation       = p_operation
     AND status          = 'pending';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$function$;

------------------------------------------------------------------------------
-- 5. Drop redundant indexes
--    idx_idempotency_keys_key (single col on idempotency_key) is fully covered
--    by the leading column of the UNIQUE composite (idempotency_key, operation).
--    idx_webhook_events_idempotency_key duplicates webhook_events_idempotency_key_key.
------------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_idempotency_keys_key;
DROP INDEX IF EXISTS public.idx_webhook_events_idempotency_key;
