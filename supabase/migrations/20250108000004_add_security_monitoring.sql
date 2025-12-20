-- Add security monitoring table
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'auth_failure', 'rate_limit', 'xss_attempt', 'injection_attempt', 
    'suspicious_activity', 'webhook_failure', 'gdpr_access', 'admin_action'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  payload JSONB,
  details TEXT NOT NULL,
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON public.security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON public.security_events(resolved);

-- RLS policies for security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY security_events_select_policy
ON public.security_events
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY security_events_insert_policy
ON public.security_events
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY security_events_update_policy
ON public.security_events
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Function to clean up old security events (older than 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.security_events 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Function to get security dashboard metrics
CREATE OR REPLACE FUNCTION public.get_security_dashboard_metrics(
  p_timeframe TEXT DEFAULT '24h'
)
RETURNS TABLE(
  total_events BIGINT,
  critical_events BIGINT,
  high_severity_events BIGINT,
  unique_ips BIGINT,
  top_event_types JSONB,
  recent_critical_events JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  timeframe_interval INTERVAL;
BEGIN
  -- Convert timeframe to interval
  CASE p_timeframe
    WHEN '1h' THEN timeframe_interval := '1 hour';
    WHEN '24h' THEN timeframe_interval := '24 hours';
    WHEN '7d' THEN timeframe_interval := '7 days';
    WHEN '30d' THEN timeframe_interval := '30 days';
    ELSE timeframe_interval := '24 hours';
  END CASE;

  RETURN QUERY
  WITH event_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE severity = 'critical') as critical,
      COUNT(*) FILTER (WHERE severity = 'high') as high,
      COUNT(DISTINCT ip_address) as unique_ips
    FROM public.security_events
    WHERE created_at >= NOW() - timeframe_interval
  ),
  event_types AS (
    SELECT jsonb_object_agg(event_type, count) as types
    FROM (
      SELECT event_type, COUNT(*) as count
      FROM public.security_events
      WHERE created_at >= NOW() - timeframe_interval
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT 10
    ) t
  ),
  recent_critical AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'event_type', event_type,
        'details', details,
        'ip_address', ip_address,
        'created_at', created_at
      )
    ) as events
    FROM (
      SELECT id, event_type, details, ip_address, created_at
      FROM public.security_events
      WHERE severity = 'critical' 
        AND created_at >= NOW() - timeframe_interval
      ORDER BY created_at DESC
      LIMIT 5
    ) t
  )
  SELECT 
    es.total,
    es.critical,
    es.high,
    es.unique_ips,
    COALESCE(et.types, '{}'::jsonb),
    COALESCE(rc.events, '[]'::jsonb)
  FROM event_stats es
  CROSS JOIN event_types et
  CROSS JOIN recent_critical rc;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE public.security_events IS 'Security monitoring and incident logging';
COMMENT ON COLUMN public.security_events.event_type IS 'Type of security event';
COMMENT ON COLUMN public.security_events.severity IS 'Severity level: low, medium, high, critical';
COMMENT ON COLUMN public.security_events.resolved IS 'Whether the security incident has been resolved';
COMMENT ON FUNCTION public.cleanup_old_security_events IS 'Cleans up security events older than 90 days';
COMMENT ON FUNCTION public.get_security_dashboard_metrics IS 'Returns security dashboard metrics for specified timeframe';
