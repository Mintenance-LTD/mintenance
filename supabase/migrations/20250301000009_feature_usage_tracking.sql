-- =====================================================
-- Feature Usage Tracking System
-- =====================================================
--
-- This migration creates tables and functions for tracking
-- feature usage across the platform for metered features.
--
-- Created: 2025-03-01
-- =====================================================

-- 1. Create feature_usage table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  limit_count TEXT NOT NULL, -- Can be a number or 'unlimited'
  reset_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT feature_usage_used_count_positive CHECK (used_count >= 0),
  CONSTRAINT feature_usage_unique_user_feature_period UNIQUE (user_id, feature_id, reset_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id
  ON public.feature_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_feature_usage_feature_id
  ON public.feature_usage(feature_id);

CREATE INDEX IF NOT EXISTS idx_feature_usage_reset_date
  ON public.feature_usage(reset_date);

CREATE INDEX IF NOT EXISTS idx_feature_usage_user_feature
  ON public.feature_usage(user_id, feature_id);

-- Comments
COMMENT ON TABLE public.feature_usage IS 'Tracks usage of metered features for subscription enforcement';
COMMENT ON COLUMN public.feature_usage.user_id IS 'User who used the feature';
COMMENT ON COLUMN public.feature_usage.feature_id IS 'Feature identifier from feature-access-config';
COMMENT ON COLUMN public.feature_usage.used_count IS 'Number of times feature has been used in current period';
COMMENT ON COLUMN public.feature_usage.limit_count IS 'Maximum allowed usage (number or "unlimited")';
COMMENT ON COLUMN public.feature_usage.reset_date IS 'When the usage counter will reset (typically monthly)';

-- Enable RLS
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own feature usage"
  ON public.feature_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own feature usage"
  ON public.feature_usage
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can manage all usage records
CREATE POLICY "Service role can manage all feature usage"
  ON public.feature_usage
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 2. Create function to increment feature usage
-- =====================================================
CREATE OR REPLACE FUNCTION public.increment_feature_usage(
  p_user_id UUID,
  p_feature_id TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limit TEXT;
  v_used INTEGER;
  v_reset_date TIMESTAMP WITH TIME ZONE;
  v_subscription_tier TEXT;
BEGIN
  -- Get user's subscription tier
  SELECT
    COALESCE(cs.plan_type, 'trial')
  INTO v_subscription_tier
  FROM public.users u
  LEFT JOIN public.contractor_subscriptions cs
    ON cs.contractor_id = u.id
    AND cs.status IN ('trial', 'active')
  WHERE u.id = p_user_id
  LIMIT 1;

  -- Calculate reset date (first day of next month)
  v_reset_date := DATE_TRUNC('month', NOW() + INTERVAL '1 month');

  -- Get or create usage record
  INSERT INTO public.feature_usage (
    user_id,
    feature_id,
    used_count,
    limit_count,
    reset_date
  )
  VALUES (
    p_user_id,
    p_feature_id,
    0,
    '0', -- Will be updated by the application
    v_reset_date
  )
  ON CONFLICT (user_id, feature_id, reset_date)
  DO NOTHING;

  -- Get current usage
  SELECT used_count, limit_count
  INTO v_used, v_limit
  FROM public.feature_usage
  WHERE user_id = p_user_id
    AND feature_id = p_feature_id
    AND reset_date >= NOW();

  -- Check if limit allows increment
  IF v_limit = 'unlimited' THEN
    -- Unlimited - always allow
    UPDATE public.feature_usage
    SET
      used_count = used_count + p_increment,
      updated_at = NOW()
    WHERE user_id = p_user_id
      AND feature_id = p_feature_id
      AND reset_date >= NOW();

    RETURN TRUE;
  END IF;

  -- Check numeric limit
  IF v_used + p_increment <= v_limit::INTEGER THEN
    UPDATE public.feature_usage
    SET
      used_count = used_count + p_increment,
      updated_at = NOW()
    WHERE user_id = p_user_id
      AND feature_id = p_feature_id
      AND reset_date >= NOW();

    RETURN TRUE;
  END IF;

  -- Limit exceeded
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.increment_feature_usage IS 'Increments feature usage count and checks against limit';

-- 3. Create function to reset feature usage
-- =====================================================
CREATE OR REPLACE FUNCTION public.reset_feature_usage()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete expired usage records
  DELETE FROM public.feature_usage
  WHERE reset_date < NOW();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.reset_feature_usage IS 'Deletes expired feature usage records (run monthly)';

-- 4. Create function to get feature usage summary
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_feature_usage_summary(
  p_user_id UUID
)
RETURNS TABLE (
  feature_id TEXT,
  used_count INTEGER,
  limit_count TEXT,
  remaining TEXT,
  reset_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fu.feature_id,
    fu.used_count,
    fu.limit_count,
    CASE
      WHEN fu.limit_count = 'unlimited' THEN 'unlimited'
      ELSE (fu.limit_count::INTEGER - fu.used_count)::TEXT
    END AS remaining,
    fu.reset_date
  FROM public.feature_usage fu
  WHERE fu.user_id = p_user_id
    AND fu.reset_date >= NOW()
  ORDER BY fu.feature_id;
END;
$$;

COMMENT ON FUNCTION public.get_feature_usage_summary IS 'Returns summary of feature usage for a user';

-- 5. Create trigger to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_feature_usage_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_feature_usage_timestamp
  BEFORE UPDATE ON public.feature_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feature_usage_timestamp();

-- 6. Grant permissions
-- =====================================================
GRANT SELECT, INSERT, UPDATE ON public.feature_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_feature_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_usage_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_feature_usage TO service_role;

-- 7. Create scheduled job to reset usage (if pg_cron is available)
-- =====================================================
-- Note: This requires pg_cron extension which may not be available in all environments
-- If available, uncomment the following:

-- SELECT cron.schedule(
--   'reset-feature-usage',
--   '0 0 1 * *', -- Run at midnight on the first day of every month
--   $$ SELECT public.reset_feature_usage(); $$
-- );
