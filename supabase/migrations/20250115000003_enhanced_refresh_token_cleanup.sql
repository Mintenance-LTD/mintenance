-- Enhanced refresh token cleanup with better TTL management
-- This migration improves the existing cleanup function

-- Enhanced cleanup function with better TTL management
CREATE OR REPLACE FUNCTION public.cleanup_expired_refresh_tokens()
RETURNS TABLE(deleted_count INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
  revoked_count INTEGER;
BEGIN
  -- Delete expired tokens (older than 7 days past expiry)
  DELETE FROM public.refresh_tokens 
  WHERE expires_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Delete revoked tokens (older than 30 days)
  DELETE FROM public.refresh_tokens 
  WHERE revoked_at IS NOT NULL 
    AND revoked_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  
  -- Return cleanup statistics
  RETURN QUERY SELECT 
    (expired_count + revoked_count) as deleted_count,
    format('Cleaned up %s expired tokens and %s revoked tokens', expired_count, revoked_count) as message;
END;
$$;

-- Add cleanup logging table for monitoring
CREATE TABLE IF NOT EXISTS public.token_cleanup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_count INTEGER NOT NULL,
  message TEXT NOT NULL,
  execution_time_ms INTEGER
);

-- Create index for cleanup logs
CREATE INDEX IF NOT EXISTS idx_token_cleanup_logs_date ON public.token_cleanup_logs(cleanup_date);

-- Enhanced cleanup function with logging
CREATE OR REPLACE FUNCTION public.cleanup_expired_refresh_tokens_with_logging()
RETURNS TABLE(deleted_count INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  result_record RECORD;
BEGIN
  start_time := clock_timestamp();
  
  -- Call the cleanup function
  SELECT * INTO result_record FROM public.cleanup_expired_refresh_tokens();
  
  end_time := clock_timestamp();
  
  -- Log the cleanup operation
  INSERT INTO public.token_cleanup_logs (deleted_count, message, execution_time_ms)
  VALUES (
    result_record.deleted_count,
    result_record.message,
    EXTRACT(milliseconds FROM (end_time - start_time))::INTEGER
  );
  
  -- Return the result
  RETURN QUERY SELECT result_record.deleted_count, result_record.message;
END;
$$;

-- Schedule cleanup job using pg_cron (if available)
-- This will run daily at 2 AM UTC
DO $$
BEGIN
  -- Only schedule if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-refresh-tokens',
      '0 2 * * *', -- Daily at 2 AM UTC
      'SELECT public.cleanup_expired_refresh_tokens_with_logging();'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron not available, log a warning
    RAISE WARNING 'pg_cron extension not available. Manual cleanup scheduling required.';
END;
$$;

-- Add comment explaining the cleanup strategy
COMMENT ON FUNCTION public.cleanup_expired_refresh_tokens() IS 
'Cleans up expired refresh tokens older than 7 days and revoked tokens older than 30 days';

COMMENT ON FUNCTION public.cleanup_expired_refresh_tokens_with_logging() IS 
'Enhanced cleanup function that logs cleanup operations for monitoring';

COMMENT ON TABLE public.token_cleanup_logs IS 
'Logs cleanup operations for monitoring token cleanup performance';
