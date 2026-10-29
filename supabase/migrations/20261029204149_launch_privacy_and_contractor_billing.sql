BEGIN;
-- Public popularity is served by the aggregate API, not raw visitor records.
REVOKE ALL ON public.help_article_views FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Anyone can view help article view counts" ON public.help_article_views;
CREATE POLICY help_views_server_only ON public.help_article_views AS RESTRICTIVE
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.contractor_subscriptions ADD COLUMN billing_cycle text NOT NULL DEFAULT 'monthly'
  CHECK (billing_cycle IN ('monthly','yearly'));
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.contractor_subscriptions FROM PUBLIC,anon,authenticated;
CREATE POLICY contractor_billing_server_insert ON public.contractor_subscriptions AS RESTRICTIVE
  FOR INSERT TO anon,authenticated WITH CHECK(false);
CREATE POLICY contractor_billing_server_update ON public.contractor_subscriptions AS RESTRICTIVE
  FOR UPDATE TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY contractor_billing_server_delete ON public.contractor_subscriptions AS RESTRICTIVE
  FOR DELETE TO anon,authenticated USING(false);

-- A profile row lock serializes first checkout, including retries after a timeout.
CREATE FUNCTION public.reserve_contractor_subscription(p_contractor_id uuid,p_customer_id text,p_plan text,p_cycle text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE existing public.contractor_subscriptions; amount_minor integer;
BEGIN
  IF p_plan NOT IN ('professional','enterprise') OR p_cycle NOT IN ('monthly','yearly')
    OR p_plan IS NULL OR p_cycle IS NULL THEN RAISE EXCEPTION 'Invalid subscription plan'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_contractor_id AND role='contractor'
    AND stripe_customer_id=p_customer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription customer mismatch'; END IF;
  SELECT * INTO existing FROM public.contractor_subscriptions WHERE contractor_id=p_contractor_id
    AND status NOT IN ('canceled','expired','free') AND plan_type NOT IN ('free','basic')
    ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    IF existing.plan_type<>p_plan OR existing.billing_cycle<>p_cycle THEN
      RAISE EXCEPTION 'Finish the existing subscription before starting another';
    END IF;
    RETURN to_jsonb(existing);
  END IF;
  amount_minor := CASE p_plan WHEN 'professional' THEN 2900 ELSE 9900 END
    * CASE p_cycle WHEN 'yearly' THEN 10 ELSE 1 END;
  UPDATE public.contractor_subscriptions SET status='canceled',canceled_at=now(),updated_at=now()
    WHERE contractor_id=p_contractor_id AND plan_type IN ('free','basic') AND status IN ('free','trial','active');
  INSERT INTO public.contractor_subscriptions
    (contractor_id,stripe_customer_id,plan_type,plan_name,status,amount,currency,billing_cycle)
    VALUES(p_contractor_id,p_customer_id,p_plan,CASE p_plan WHEN 'professional' THEN 'Professional' ELSE 'Business' END,
      'unpaid',amount_minor/100.0,'gbp',p_cycle) RETURNING * INTO existing;
  RETURN to_jsonb(existing);
END $$;
REVOKE ALL ON FUNCTION public.reserve_contractor_subscription(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_contractor_subscription(uuid,text,text,text) TO service_role;

-- Persist the actual provider state atomically; stale historical events cannot restore benefits.
CREATE FUNCTION public.sync_contractor_subscription(p_contractor_id uuid,p_subscription_id text,p_customer_id text,p_state jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE target public.contractor_subscriptions; latest uuid;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=p_contractor_id AND stripe_customer_id=p_customer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription customer mismatch'; END IF;
  SELECT * INTO target FROM public.contractor_subscriptions WHERE contractor_id=p_contractor_id
    AND stripe_subscription_id=p_subscription_id AND stripe_customer_id=p_customer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription is not linked yet'; END IF;
  SELECT id INTO latest FROM public.contractor_subscriptions WHERE contractor_id=p_contractor_id
    ORDER BY created_at DESC,id DESC LIMIT 1;
  IF target.id<>latest OR (target.status IN ('canceled','expired') AND p_state->>'status' NOT IN ('canceled','expired')) THEN
    RETURN jsonb_build_object('id',target.id,'current',false);
  END IF;
  IF p_state->>'plan_type' NOT IN ('professional','enterprise') OR p_state->>'currency'<>'gbp'
    OR p_state->>'billing_cycle' NOT IN ('monthly','yearly') THEN RAISE EXCEPTION 'Invalid provider price'; END IF;
  UPDATE public.contractor_subscriptions SET status=p_state->>'status',
    plan_type=p_state->>'plan_type',plan_name=p_state->>'plan_name',
    billing_cycle=p_state->>'billing_cycle',amount=(p_state->>'amount')::numeric,
    currency=p_state->>'currency',stripe_price_id=p_state->>'stripe_price_id',
    current_period_start=(p_state->>'current_period_start')::timestamptz,
    current_period_end=(p_state->>'current_period_end')::timestamptz,
    cancel_at_period_end=coalesce((p_state->>'cancel_at_period_end')::boolean,false),
    canceled_at=(p_state->>'canceled_at')::timestamptz,updated_at=now()
    WHERE id=target.id;
  UPDATE public.profiles SET subscription_status=CASE p_state->>'status'
    WHEN 'canceled' THEN 'none' WHEN 'expired' THEN 'none' WHEN 'trial' THEN 'trialing'
    ELSE p_state->>'status' END,updated_at=now() WHERE id=p_contractor_id;
  RETURN jsonb_build_object('id',target.id,'current',true);
END $$;
REVOKE ALL ON FUNCTION public.sync_contractor_subscription(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_contractor_subscription(uuid,text,text,jsonb) TO service_role;
COMMIT;
