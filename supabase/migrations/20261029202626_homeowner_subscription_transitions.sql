BEGIN;
-- Billing state is written only by verified server/provider operations.
REVOKE INSERT, UPDATE, DELETE ON public.homeowner_subscriptions FROM PUBLIC, anon, authenticated;
CREATE POLICY homeowner_billing_server_insert ON public.homeowner_subscriptions AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK(false);
CREATE POLICY homeowner_billing_server_update ON public.homeowner_subscriptions AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING(false) WITH CHECK(false);
CREATE POLICY homeowner_billing_server_delete ON public.homeowner_subscriptions AS RESTRICTIVE FOR DELETE TO anon, authenticated USING(false);

CREATE FUNCTION public.sync_homeowner_subscription(p_homeowner_id uuid, p_subscription_id text, p_customer_id text, p_state jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE target_id uuid; latest_id uuid; stored_status text;
BEGIN
  -- Serialize profile status changes. Historical subscriptions must never overwrite
  -- the current subscription's entitlement, including delayed deletion events.
  PERFORM 1 FROM public.profiles WHERE id=p_homeowner_id AND stripe_customer_id=p_customer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription customer mismatch'; END IF;
  SELECT id,status INTO target_id,stored_status FROM public.homeowner_subscriptions
    WHERE homeowner_id=p_homeowner_id AND stripe_subscription_id=p_subscription_id AND stripe_customer_id=p_customer_id FOR UPDATE;
  IF target_id IS NULL THEN RAISE EXCEPTION 'Subscription is not linked yet'; END IF;
  SELECT id INTO latest_id FROM public.homeowner_subscriptions
    WHERE homeowner_id=p_homeowner_id ORDER BY created_at DESC, id DESC LIMIT 1;
  -- A locally retired historical row cannot be revived by an old provider event.
  IF target_id<>latest_id THEN RETURN jsonb_build_object('id',target_id,'current',false); END IF;
  -- Stripe cancellation/expiration is terminal. A provider read captured before
  -- cancellation must not revive access if it reaches this transaction later.
  IF stored_status IN ('canceled','expired') AND p_state->>'status' NOT IN ('canceled','expired') THEN
    RETURN jsonb_build_object('id',target_id,'current',false);
  END IF;
  UPDATE public.homeowner_subscriptions SET
    status=p_state->>'status', stripe_price_id=p_state->>'stripe_price_id',
    plan_type=p_state->>'plan_type', plan_name=p_state->>'plan_name',
    amount=(p_state->>'amount')::numeric, currency=p_state->>'currency',
    current_period_start=(p_state->>'current_period_start')::timestamptz,
    current_period_end=(p_state->>'current_period_end')::timestamptz,
    cancel_at_period_end=COALESCE((p_state->>'cancel_at_period_end')::boolean,false),
    canceled_at=(p_state->>'canceled_at')::timestamptz,
    metadata=p_state->'metadata', updated_at=now()
    WHERE id=target_id;
  UPDATE public.profiles SET subscription_status=CASE p_state->>'status'
    WHEN 'canceled' THEN 'none' WHEN 'expired' THEN 'none' WHEN 'trial' THEN 'trialing'
    ELSE p_state->>'status' END, updated_at=now() WHERE id=p_homeowner_id;
  RETURN jsonb_build_object('id',target_id,'current',true);
END $$;
REVOKE ALL ON FUNCTION public.sync_homeowner_subscription(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_homeowner_subscription(uuid,text,text,jsonb) TO service_role;
COMMIT;
