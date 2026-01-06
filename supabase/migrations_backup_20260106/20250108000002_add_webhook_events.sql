-- Add webhook events table for idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_id TEXT,
  source TEXT NOT NULL, -- 'stripe', 'supabase', etc.
  payload JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'failed', 'duplicate'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency_key ON public.webhook_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON public.webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at);

-- RLS policies for webhook events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access webhook events
CREATE POLICY webhook_events_service_role_only
ON public.webhook_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to check and record webhook event
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
  -- Check if event already exists
  SELECT * INTO existing_event
  FROM public.webhook_events
  WHERE idempotency_key = p_idempotency_key;

  IF existing_event.id IS NOT NULL THEN
    -- Event already exists, return duplicate
    RETURN QUERY SELECT true, existing_event.id;
  ELSE
    -- Create new event record
    INSERT INTO public.webhook_events (
      idempotency_key,
      event_type,
      event_id,
      source,
      payload,
      status
    ) VALUES (
      p_idempotency_key,
      p_event_type,
      p_event_id,
      p_source,
      p_payload,
      'pending'
    ) RETURNING id INTO new_event_id;

    RETURN QUERY SELECT false, new_event_id;
  END IF;
END;
$$;

-- Function to mark webhook event as processed
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

-- Function to increment retry count
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

-- Function to clean up old webhook events (older than 30 days)
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

-- Add comments for documentation
COMMENT ON TABLE public.webhook_events IS 'Stores webhook events for idempotency and audit purposes';
COMMENT ON COLUMN public.webhook_events.idempotency_key IS 'Unique key to prevent duplicate processing';
COMMENT ON COLUMN public.webhook_events.status IS 'Event processing status: pending, processed, failed, duplicate';
COMMENT ON FUNCTION public.check_webhook_idempotency IS 'Checks if webhook event is duplicate and records new events';
COMMENT ON FUNCTION public.mark_webhook_processed IS 'Marks webhook event as processed with optional error message';
COMMENT ON FUNCTION public.increment_webhook_retry IS 'Increments retry count for failed webhook events';
COMMENT ON FUNCTION public.cleanup_old_webhook_events IS 'Cleans up webhook events older than 30 days';
