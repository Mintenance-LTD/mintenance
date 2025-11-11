-- Migration: Add idempotency_keys table for preventing duplicate operations
-- Created: 2025-01-XX
-- Description: Creates table to store idempotency keys for critical operations

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  result JSONB NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint on idempotency_key + operation combination
  UNIQUE(idempotency_key, operation)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON public.idempotency_keys(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_operation ON public.idempotency_keys(operation);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_id ON public.idempotency_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at ON public.idempotency_keys(created_at);

-- RLS policies
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own idempotency keys
CREATE POLICY idempotency_keys_user_access
ON public.idempotency_keys
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert/select all (for server-side operations)
CREATE POLICY idempotency_keys_service_role
ON public.idempotency_keys
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to clean up old idempotency keys (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_idempotency_keys()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Comments
COMMENT ON TABLE public.idempotency_keys IS 'Stores idempotency keys for critical operations to prevent duplicate processing';
COMMENT ON COLUMN public.idempotency_keys.idempotency_key IS 'Unique key identifying the operation request';
COMMENT ON COLUMN public.idempotency_keys.operation IS 'Type of operation (e.g., submit_bid, accept_bid, refund_payment)';
COMMENT ON COLUMN public.idempotency_keys.result IS 'Cached result from the operation to return on duplicate requests';

