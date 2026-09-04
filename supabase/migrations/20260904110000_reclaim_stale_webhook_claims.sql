-- Recover Stripe webhook claims left pending by a crashed or terminated
-- function invocation. A normal webhook handler completes well within this
-- window; processed events remain terminal and failed events keep the existing
-- retry limit.
CREATE OR REPLACE FUNCTION public.check_webhook_idempotency(
  p_idempotency_key text,
  p_event_type text,
  p_event_id text,
  p_source text,
  p_payload jsonb
)
RETURNS TABLE(is_duplicate boolean, event_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  existing_event public.webhook_events%ROWTYPE;
  new_event_id uuid;
  max_retries CONSTANT integer := 10;
  stale_pending_after CONSTANT interval := interval '10 minutes';
BEGIN
  SELECT * INTO existing_event
  FROM public.webhook_events
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF existing_event.id IS NOT NULL THEN
    IF existing_event.status = 'processed' THEN
      RETURN QUERY SELECT true, existing_event.id;
      RETURN;
    END IF;

    IF existing_event.status = 'failed'
       AND existing_event.retry_count < max_retries THEN
      UPDATE public.webhook_events
      SET
        status = 'pending',
        retry_count = existing_event.retry_count + 1,
        error_message = NULL,
        updated_at = NOW()
      WHERE id = existing_event.id;

      RETURN QUERY SELECT false, existing_event.id;
      RETURN;
    END IF;

    -- A pending row can outlive the invocation that claimed it. Reclaim only
    -- after a bounded timeout so a crashed worker does not permanently turn a
    -- retry into a false duplicate. The retry cap still requires manual
    -- intervention after repeated crashes.
    IF existing_event.status = 'pending'
       AND existing_event.updated_at < NOW() - stale_pending_after
       AND existing_event.retry_count < max_retries THEN
      UPDATE public.webhook_events
      SET
        status = 'pending',
        retry_count = existing_event.retry_count + 1,
        error_message = 'Reclaimed stale pending webhook claim',
        updated_at = NOW()
      WHERE id = existing_event.id;

      RETURN QUERY SELECT false, existing_event.id;
      RETURN;
    END IF;

    RETURN QUERY SELECT true, existing_event.id;
    RETURN;
  END IF;

  INSERT INTO public.webhook_events (
    idempotency_key, event_type, event_id, source, payload, status
  ) VALUES (
    p_idempotency_key, p_event_type, p_event_id, p_source, p_payload, 'pending'
  ) RETURNING id INTO new_event_id;

  RETURN QUERY SELECT false, new_event_id;
END;
$$;

ALTER FUNCTION public.check_webhook_idempotency(text, text, text, text, jsonb)
  OWNER TO postgres;

COMMENT ON FUNCTION public.check_webhook_idempotency(text, text, text, text, jsonb)
  IS 'Webhook idempotency check with bounded recovery for stale pending claims.';
