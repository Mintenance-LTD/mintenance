-- ============================================================================
-- Subscription System Database Functions
-- Helper functions for trial checks, subscription validation, and MRR calculation
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Function: check_trial_status(contractor_id)
-- Returns trial days remaining and status
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_trial_status(p_contractor_id UUID)
RETURNS TABLE (
  days_remaining INTEGER,
  is_trial_active BOOLEAN,
  trial_started_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  requires_subscription BOOLEAN
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_trial_ends_at TIMESTAMP WITH TIME ZONE;
  v_trial_started_at TIMESTAMP WITH TIME ZONE;
  v_subscription_status TEXT;
  v_days_remaining INTEGER;
BEGIN
  -- Get contractor trial and subscription info
  SELECT 
    u.trial_ends_at,
    u.trial_started_at,
    u.subscription_status
  INTO 
    v_trial_ends_at,
    v_trial_started_at,
    v_subscription_status
  FROM public.users u
  WHERE u.id = p_contractor_id
    AND u.role = 'contractor';

  -- If no trial info, return nulls
  IF v_trial_ends_at IS NULL THEN
    RETURN QUERY SELECT 
      NULL::INTEGER,
      FALSE::BOOLEAN,
      NULL::TIMESTAMP WITH TIME ZONE,
      NULL::TIMESTAMP WITH TIME ZONE,
      TRUE::BOOLEAN;
    RETURN;
  END IF;

  -- Calculate days remaining
  IF v_trial_ends_at > NOW() THEN
    v_days_remaining := EXTRACT(EPOCH FROM (v_trial_ends_at - NOW())) / 86400;
    v_days_remaining := GREATEST(0, v_days_remaining::INTEGER);
  ELSE
    v_days_remaining := 0;
  END IF;

  -- Determine if trial is active
  RETURN QUERY SELECT 
    v_days_remaining,
    (v_trial_ends_at > NOW() AND v_subscription_status = 'trial')::BOOLEAN,
    v_trial_started_at,
    v_trial_ends_at,
    (v_trial_ends_at <= NOW() OR v_subscription_status != 'trial')::BOOLEAN;
END;
$$;

COMMENT ON FUNCTION public.check_trial_status IS 'Returns trial status information for a contractor including days remaining';

-- ============================================================================
-- 2. Function: require_subscription(contractor_id)
-- Checks if contractor requires an active subscription
-- ============================================================================
CREATE OR REPLACE FUNCTION public.require_subscription(p_contractor_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_trial_ends_at TIMESTAMP WITH TIME ZONE;
  v_subscription_status TEXT;
  v_has_active_subscription BOOLEAN;
BEGIN
  -- Get contractor info
  SELECT 
    u.trial_ends_at,
    u.subscription_status
  INTO 
    v_trial_ends_at,
    v_subscription_status
  FROM public.users u
  WHERE u.id = p_contractor_id
    AND u.role = 'contractor';

  -- If no contractor found, require subscription
  IF v_trial_ends_at IS NULL AND v_subscription_status IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if has active subscription
  SELECT EXISTS (
    SELECT 1 
    FROM public.contractor_subscriptions cs
    WHERE cs.contractor_id = p_contractor_id
      AND cs.status IN ('active', 'trial')
      AND (cs.current_period_end IS NULL OR cs.current_period_end > NOW())
  ) INTO v_has_active_subscription;

  -- If trial expired and no active subscription, require subscription
  IF (v_trial_ends_at IS NULL OR v_trial_ends_at <= NOW()) 
     AND NOT v_has_active_subscription 
     AND v_subscription_status != 'active' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.require_subscription IS 'Returns TRUE if contractor must have an active subscription to use the platform';

-- ============================================================================
-- 3. Function: get_subscription_features(contractor_id)
-- Returns available features for contractor based on their subscription
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_subscription_features(p_contractor_id UUID)
RETURNS TABLE (
  plan_type TEXT,
  max_jobs INTEGER,
  max_active_jobs INTEGER,
  priority_support BOOLEAN,
  advanced_analytics BOOLEAN,
  custom_branding BOOLEAN,
  api_access BOOLEAN,
  additional_features JSONB
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_subscription_status TEXT;
  v_plan_type TEXT;
BEGIN
  -- Get contractor subscription status
  SELECT 
    u.subscription_status,
    cs.plan_type
  INTO 
    v_subscription_status,
    v_plan_type
  FROM public.users u
  LEFT JOIN public.contractor_subscriptions cs 
    ON cs.contractor_id = u.id 
    AND cs.status IN ('active', 'trial')
  WHERE u.id = p_contractor_id
    AND u.role = 'contractor';

  -- If no active subscription or trial expired, return basic features (limited)
  IF v_subscription_status IS NULL 
     OR (v_subscription_status != 'trial' AND v_subscription_status != 'active')
     OR v_plan_type IS NULL THEN
    -- Return trial/basic features
    RETURN QUERY
    SELECT 
      sf.plan_type,
      sf.max_jobs,
      sf.max_active_jobs,
      sf.priority_support,
      sf.advanced_analytics,
      sf.custom_branding,
      sf.api_access,
      sf.additional_features
    FROM public.subscription_features sf
    WHERE sf.plan_type = 'basic'
    LIMIT 1;
    RETURN;
  END IF;

  -- Return features for the contractor's plan
  RETURN QUERY
  SELECT 
    sf.plan_type,
    sf.max_jobs,
    sf.max_active_jobs,
    sf.priority_support,
    sf.advanced_analytics,
    sf.custom_branding,
    sf.api_access,
    sf.additional_features
  FROM public.subscription_features sf
  WHERE sf.plan_type = v_plan_type
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_subscription_features IS 'Returns feature limits for a contractor based on their subscription plan';

-- ============================================================================
-- 4. Function: calculate_mrr()
-- Calculates Monthly Recurring Revenue from active subscriptions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_mrr()
RETURNS TABLE (
  total_mrr DECIMAL(10, 2),
  active_subscriptions INTEGER,
  mrr_by_plan JSONB
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_mrr DECIMAL(10, 2) := 0;
  v_active_count INTEGER := 0;
  v_mrr_by_plan JSONB := '{}'::jsonb;
BEGIN
  -- Calculate total MRR from active subscriptions
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO 
    v_total_mrr,
    v_active_count
  FROM public.contractor_subscriptions
  WHERE status IN ('active', 'trial')
    AND (current_period_end IS NULL OR current_period_end > NOW());

  -- Calculate MRR by plan type
  SELECT jsonb_object_agg(
    plan_type,
    jsonb_build_object(
      'mrr', COALESCE(SUM(amount), 0),
      'count', COUNT(*)
    )
  )
  INTO v_mrr_by_plan
  FROM public.contractor_subscriptions
  WHERE status IN ('active', 'trial')
    AND (current_period_end IS NULL OR current_period_end > NOW())
  GROUP BY plan_type;

  RETURN QUERY SELECT 
    v_total_mrr,
    v_active_count,
    COALESCE(v_mrr_by_plan, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.calculate_mrr IS 'Calculates Monthly Recurring Revenue from all active subscriptions';

-- ============================================================================
-- 5. Function: initialize_trial_period(contractor_id)
-- Initializes trial period for new contractor signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.initialize_trial_period(p_contractor_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_role TEXT;
  v_trial_started_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verify user is a contractor
  SELECT role, trial_started_at
  INTO v_user_role, v_trial_started_at
  FROM public.users
  WHERE id = p_contractor_id;

  IF v_user_role != 'contractor' THEN
    RAISE EXCEPTION 'User is not a contractor';
  END IF;

  -- If trial already started, don't reinitialize
  IF v_trial_started_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  -- Set trial period (1 month from now)
  UPDATE public.users
  SET 
    trial_started_at = NOW(),
    trial_ends_at = NOW() + INTERVAL '1 month',
    subscription_status = 'trial'
  WHERE id = p_contractor_id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.initialize_trial_period IS 'Initializes a 1-month trial period for a new contractor signup';

-- ============================================================================
-- 6. Function: get_revenue_metrics(start_date, end_date)
-- Returns revenue metrics for a date range
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_revenue_metrics(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  subscription_revenue DECIMAL(10, 2),
  transaction_fee_revenue DECIMAL(10, 2),
  total_revenue DECIMAL(10, 2),
  subscription_count INTEGER,
  transaction_count INTEGER
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Subscription revenue
    COALESCE(SUM(CASE WHEN pt.payment_type = 'subscription' THEN pt.net_revenue ELSE 0 END), 0)::DECIMAL(10, 2),
    
    -- Transaction fee revenue
    COALESCE(SUM(CASE WHEN pt.payment_type IN ('transaction_fee', 'platform_fee') THEN pt.net_revenue ELSE 0 END), 0)::DECIMAL(10, 2),
    
    -- Total revenue
    COALESCE(SUM(pt.net_revenue), 0)::DECIMAL(10, 2),
    
    -- Subscription payment count
    COUNT(*) FILTER (WHERE pt.payment_type = 'subscription')::INTEGER,
    
    -- Transaction fee count
    COUNT(*) FILTER (WHERE pt.payment_type IN ('transaction_fee', 'platform_fee'))::INTEGER
  FROM public.payment_tracking pt
  WHERE pt.status = 'completed'
    AND pt.created_at >= p_start_date
    AND pt.created_at <= p_end_date;
END;
$$;

COMMENT ON FUNCTION public.get_revenue_metrics IS 'Returns revenue metrics for a date range including subscription and transaction fee revenue';

COMMIT;

