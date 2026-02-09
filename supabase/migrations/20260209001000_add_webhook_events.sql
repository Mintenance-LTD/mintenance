-- Add webhook events table for idempotency and audit
-- Required by StripeWebhookService for duplicate detection

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_id TEXT,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency_key ON public.webhook_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON public.webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at);

-- RLS: Only service_role can access webhook events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_events_service_role_only ON public.webhook_events;
CREATE POLICY webhook_events_service_role_only
ON public.webhook_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function: Check and record webhook event (atomic idempotency check)
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
AS $$
DECLARE
  existing_event public.webhook_events%ROWTYPE;
  new_event_id UUID;
BEGIN
  SELECT * INTO existing_event
  FROM public.webhook_events
  WHERE idempotency_key = p_idempotency_key;

  IF existing_event.id IS NOT NULL THEN
    RETURN QUERY SELECT true, existing_event.id;
  ELSE
    INSERT INTO public.webhook_events (
      idempotency_key, event_type, event_id, source, payload, status
    ) VALUES (
      p_idempotency_key, p_event_type, p_event_id, p_source, p_payload, 'pending'
    ) RETURNING id INTO new_event_id;

    RETURN QUERY SELECT false, new_event_id;
  END IF;
END;
$$;

-- Function: Mark webhook event as processed
CREATE OR REPLACE FUNCTION public.mark_webhook_processed(
  p_event_id UUID,
  p_status TEXT DEFAULT 'processed',
  p_error_message TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.webhook_events
  SET
    status = p_status,
    processed_at = NOW(),
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_event_id;
END;
$$;

-- Function: Increment retry count for failed events
CREATE OR REPLACE FUNCTION public.increment_webhook_retry(
  p_event_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.webhook_events
  SET
    retry_count = retry_count + 1,
    updated_at = NOW()
  WHERE id = p_event_id;
END;
$$;

-- Function: Clean up old webhook events (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.webhook_events
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;
