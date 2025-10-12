-- Add refresh tokens table for JWT rotation
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT,
  device_info JSONB,
  ip_address INET
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON public.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON public.refresh_tokens(expires_at);

-- RLS policies for refresh tokens
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY refresh_tokens_select_policy
ON public.refresh_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY refresh_tokens_insert_policy
ON public.refresh_tokens
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY refresh_tokens_update_policy
ON public.refresh_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY refresh_tokens_delete_policy
ON public.refresh_tokens
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.refresh_tokens 
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$;

-- Schedule cleanup job (runs daily)
-- Note: This would typically be set up as a cron job or scheduled function
COMMENT ON FUNCTION public.cleanup_expired_tokens() IS 'Cleans up expired refresh tokens older than 1 day';

-- Add token rotation tracking to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_token_rotation TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_users_last_token_rotation ON public.users(last_token_rotation);
