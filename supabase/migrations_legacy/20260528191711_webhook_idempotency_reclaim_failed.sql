CREATE OR REPLACE FUNCTION public.check_webhook_idempotency(
  p_idempotency_key TEXT,
  p_event_type TEXT,
  p_event_id TEXT,
  p_source TEXT,
  p_payload JSONB
)
RETURNS TABLE(
  is_duplicate BOOLEAN,
  event_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  existing_event public.webhook_events%ROWTYPE;
  new_event_id UUID;
  MAX_RETRIES CONSTANT INTEGER := 10;
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
       AND existing_event.retry_count < MAX_RETRIES THEN
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

COMMENT ON FUNCTION public.check_webhook_idempotency IS
  'Webhook idempotency check. 2026-05-27 whole-app review Critical #2: status=failed rows are now re-claimable on retry (status reset to pending, retry_count bumped) up to MAX_RETRIES=10. status=processed stays terminal. status=pending stays duplicate (in-flight). Above retry cap: duplicate (manual intervention required).';;
