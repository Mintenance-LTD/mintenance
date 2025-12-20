-- ============================================================================
-- Fix calculate_mrr() function - Remove nested aggregate functions
-- PostgreSQL error: aggregate function calls cannot be nested
-- ============================================================================

BEGIN;

-- Replace the calculate_mrr function with fixed version
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

  -- Calculate MRR by plan type using subquery to avoid nested aggregates
  SELECT jsonb_object_agg(
    plan_type,
    jsonb_build_object(
      'mrr', plan_mrr,
      'count', plan_count
    )
  )
  INTO v_mrr_by_plan
  FROM (
    SELECT 
      plan_type,
      COALESCE(SUM(amount), 0)::DECIMAL(10, 2) as plan_mrr,
      COUNT(*)::INTEGER as plan_count
    FROM public.contractor_subscriptions
    WHERE status IN ('active', 'trial')
      AND (current_period_end IS NULL OR current_period_end > NOW())
    GROUP BY plan_type
  ) plan_stats;

  RETURN QUERY SELECT 
    v_total_mrr,
    v_active_count,
    COALESCE(v_mrr_by_plan, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.calculate_mrr IS 'Calculates Monthly Recurring Revenue from all active subscriptions';

COMMIT;

