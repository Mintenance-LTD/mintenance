-- Feature Flags Table for API Route Migration
-- Created: January 2025
-- Purpose: Support gradual rollout of new API controllers

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  user_whitelist TEXT[], -- Array of user IDs to always enable
  user_blacklist TEXT[], -- Array of user IDs to always disable
  environments TEXT[], -- Array of environments where flag is active
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index for fast lookups
CREATE INDEX idx_feature_flags_name ON public.feature_flags(name);
CREATE INDEX idx_feature_flags_enabled ON public.feature_flags(enabled);

-- Create controller_usage_logs table for monitoring
CREATE TABLE IF NOT EXISTS public.controller_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(255) NOT NULL,
  is_new_controller BOOLEAN NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics
CREATE INDEX idx_controller_usage_module ON public.controller_usage_logs(module);
CREATE INDEX idx_controller_usage_new ON public.controller_usage_logs(is_new_controller);
CREATE INDEX idx_controller_usage_logged_at ON public.controller_usage_logs(logged_at);
CREATE INDEX idx_controller_usage_user ON public.controller_usage_logs(user_id);

-- Insert initial feature flags for controllers
INSERT INTO public.feature_flags (name, enabled, rollout_percentage, description) VALUES
  ('new-jobs-controller', true, 5, 'New JobController from @mintenance/api-services'),
  ('new-analytics-controller', true, 10, 'New AnalyticsController'),
  ('new-feature-flags-controller', true, 10, 'New FeatureFlagController'),
  ('new-notifications-controller', true, 5, 'New NotificationController'),
  ('new-messaging-controller', true, 5, 'New MessageController'),
  ('new-ai-search-controller', true, 10, 'New AISearchController'),
  ('new-ml-monitoring-controller', true, 10, 'New MLMonitoringController'),
  ('new-bids-controller', false, 0, 'New BidController - Critical'),
  ('new-payments-controller', false, 0, 'New PaymentController - Critical'),
  ('new-webhooks-controller', false, 0, 'New WebhookController - Critical'),
  ('new-contracts-controller', false, 0, 'New ContractController')
ON CONFLICT (name) DO NOTHING;

-- RLS Policies

-- Feature flags: Read access for all authenticated users
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_read_policy" ON public.feature_flags
  FOR SELECT
  USING (auth.role() IS NOT NULL);

-- Feature flags: Write access only for admins
CREATE POLICY "feature_flags_write_policy" ON public.feature_flags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Controller usage logs: Insert for all authenticated users
ALTER TABLE public.controller_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "controller_logs_insert_policy" ON public.controller_usage_logs
  FOR INSERT
  WITH CHECK (auth.role() IS NOT NULL);

-- Controller usage logs: Read only for admins
CREATE POLICY "controller_logs_read_policy" ON public.controller_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for feature_flags
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create view for feature flag statistics
CREATE OR REPLACE VIEW public.feature_flag_stats AS
SELECT
  f.name,
  f.enabled,
  f.rollout_percentage,
  COUNT(DISTINCT CASE WHEN l.is_new_controller THEN l.user_id END) as users_with_new,
  COUNT(DISTINCT CASE WHEN NOT l.is_new_controller THEN l.user_id END) as users_with_old,
  COUNT(CASE WHEN l.is_new_controller THEN 1 END) as new_controller_calls,
  COUNT(CASE WHEN NOT l.is_new_controller THEN 1 END) as old_controller_calls,
  MAX(l.logged_at) as last_used_at
FROM public.feature_flags f
LEFT JOIN public.controller_usage_logs l ON f.name = CONCAT('new-', l.module, '-controller')
WHERE l.logged_at > NOW() - INTERVAL '24 hours'
GROUP BY f.name, f.enabled, f.rollout_percentage;

-- Grant permissions for the view
GRANT SELECT ON public.feature_flag_stats TO authenticated;

COMMENT ON TABLE public.feature_flags IS 'Feature flags for gradual API controller migration';
COMMENT ON TABLE public.controller_usage_logs IS 'Logs for monitoring controller usage during migration';
COMMENT ON VIEW public.feature_flag_stats IS 'Statistics for feature flag usage in last 24 hours';