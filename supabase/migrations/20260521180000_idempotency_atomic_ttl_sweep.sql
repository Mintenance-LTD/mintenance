-- Idempotency: atomic TTL sweep inside try_claim_idempotency_key (2026-05-21)
--
-- Codex P0 (re-audit): apps/web/lib/idempotency.ts:146 detects a completed
-- row older than IDEMPOTENCY_TTL_HOURS (24h), calls release_idempotency_claim
-- to clear it, then recursively calls checkIdempotency. But release_idempotency_claim
-- filters `WHERE status='pending'` — so the completed row is NEVER deleted
-- and the recursion loops forever.
--
-- Fix: have try_claim_idempotency_key do the TTL sweep itself, atomically,
-- before the claim attempt. The application no longer needs to recurse —
-- the RPC handles "expired and reclaim" in one shot.
--
-- The sweep is bounded to status='completed' AND created_at < cutoff so it
-- can't accidentally delete an in-flight pending row.

CREATE OR REPLACE FUNCTION public.try_claim_idempotency_key(
  p_idempotency_key      TEXT,
  p_operation            TEXT,
  p_user_id              UUID DEFAULT NULL,
  p_metadata             JSONB DEFAULT NULL,
  p_stale_after_seconds  INT  DEFAULT 60,
  p_ttl_seconds          INT  DEFAULT 86400
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
  v_new_id       UUID;
  v_existing     public.idempotency_keys%ROWTYPE;
  v_stale_cutoff TIMESTAMPTZ;
  v_ttl_cutoff   TIMESTAMPTZ;
BEGIN
  -- 1. Sweep an expired-completed row for this key, if any. Bounded
  --    to status='completed' AND age > TTL so we can't accidentally
  --    delete a pending in-flight claim.
  v_ttl_cutoff := NOW() - make_interval(secs => p_ttl_seconds);
  DELETE FROM public.idempotency_keys
   WHERE idempotency_key = p_idempotency_key
     AND operation       = p_operation
     AND status          = 'completed'
     AND created_at      < v_ttl_cutoff;

  -- 2. Atomic claim attempt: insert as 'pending' with placeholder result.
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

  -- 3. Conflict path: a row exists. Inspect it.
  SELECT * INTO v_existing
  FROM public.idempotency_keys
  WHERE idempotency_key = p_idempotency_key AND operation = p_operation;

  IF v_existing.status = 'completed' THEN
    -- Still-valid cached completion (sweep above already removed the
    -- expired case; this branch is purely "valid duplicate").
    RETURN QUERY SELECT FALSE, TRUE, FALSE, v_existing.result, v_existing.created_at;
    RETURN;
  END IF;

  -- status = 'pending'. Decide takeover vs wait.
  v_stale_cutoff := NOW() - make_interval(secs => p_stale_after_seconds);

  IF v_existing.claimed_at IS NULL OR v_existing.claimed_at < v_stale_cutoff THEN
    -- Stale pending claim. Take it over.
    UPDATE public.idempotency_keys
       SET claimed_at = NOW(),
           result     = '{}'::jsonb,
           metadata   = COALESCE(p_metadata, metadata),
           user_id    = COALESCE(p_user_id, user_id)
     WHERE id = v_existing.id
       AND (claimed_at IS NULL OR claimed_at < v_stale_cutoff);
    IF FOUND THEN
      RETURN QUERY SELECT TRUE, FALSE, FALSE, NULL::jsonb, NULL::timestamptz;
      RETURN;
    END IF;
  END IF;

  -- Active pending claim. Caller must back off / return 503.
  RETURN QUERY SELECT FALSE, FALSE, TRUE, NULL::jsonb, v_existing.created_at;
END;
$function$;
