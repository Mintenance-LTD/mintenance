-- Idempotency claim-then-complete pattern (2026-05-21)

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

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_pending
  ON public.idempotency_keys (claimed_at)
  WHERE status = 'pending';

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
  INSERT INTO public.idempotency_keys (
    idempotency_key, operation, result, user_id, metadata, status, claimed_at
  )
  VALUES (
    p_idempotency_key, p_operation, '{}'::jsonb, p_user_id, p_metadata, 'pending', NOW()
  )
  ON CONFLICT (idempotency_key, operation) DO NOTHING
  RETURNING id INTO v_new_id;

  IF v_new_id IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, FALSE, FALSE, NULL::jsonb, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT * INTO v_existing
  FROM public.idempotency_keys
  WHERE idempotency_key = p_idempotency_key AND operation = p_operation;

  IF v_existing.status = 'completed' THEN
    RETURN QUERY SELECT FALSE, TRUE, FALSE, v_existing.result, v_existing.created_at;
    RETURN;
  END IF;

  v_stale_cutoff := NOW() - make_interval(secs => p_stale_after_seconds);

  IF v_existing.claimed_at IS NULL OR v_existing.claimed_at < v_stale_cutoff THEN
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

  RETURN QUERY SELECT FALSE, FALSE, TRUE, NULL::jsonb, v_existing.created_at;
END;
$function$;

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

DROP INDEX IF EXISTS public.idx_idempotency_keys_key;
DROP INDEX IF EXISTS public.idx_webhook_events_idempotency_key;
;
