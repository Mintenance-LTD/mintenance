-- Subscription entitlement/provider IDs are server-owned, not editable profile data.
REVOKE INSERT,UPDATE,DELETE ON public.homeowner_subscriptions,public.contractor_subscriptions FROM PUBLIC,anon,authenticated;
DO $$ DECLARE rel text; cols text; BEGIN
 FOREACH rel IN ARRAY ARRAY['homeowner_subscriptions','contractor_subscriptions'] LOOP
  SELECT string_agg(quote_ident(attname),', ' ORDER BY attnum) INTO cols FROM pg_attribute
   WHERE attrelid=format('public.%I',rel)::regclass AND attnum>0 AND NOT attisdropped;
  EXECUTE format('REVOKE INSERT (%s), UPDATE (%s) ON public.%I FROM PUBLIC,anon,authenticated',cols,cols,rel);
 END LOOP;
END $$;

CREATE TABLE public.account_deletion_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE,
 data_deleted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.account_deletion_cleanup_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 operation_id uuid NOT NULL REFERENCES public.account_deletion_operations(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('auth_user','stripe_subscription')),
 resource_id text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','needs_review')),
 lease_token uuid, lease_expires_at timestamptz,
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 completed_at timestamptz, last_outcome text,
 UNIQUE(operation_id,kind,resource_id)
);
ALTER TABLE public.account_deletion_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_cleanup_steps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletion_operations,public.account_deletion_cleanup_steps FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.account_deletion_operations,public.account_deletion_cleanup_steps TO service_role;
CREATE INDEX account_deletion_cleanup_due_idx ON public.account_deletion_cleanup_steps(next_attempt_at,id) WHERE status='pending';

CREATE FUNCTION public.delete_account_with_recovery(p_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE op uuid; subscriptions text[];
BEGIN
 SELECT id INTO op FROM public.account_deletion_operations WHERE user_id=p_user_id;
 IF FOUND THEN RETURN op; END IF;
 PERFORM 1 FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN
  SELECT id INTO op FROM public.account_deletion_operations WHERE user_id=p_user_id;
  IF FOUND THEN RETURN op; END IF;
  RAISE EXCEPTION 'Profile not found' USING ERRCODE='P0002';
 END IF;
 PERFORM 1 FROM public.contractor_subscriptions WHERE contractor_id=p_user_id ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.homeowner_subscriptions WHERE homeowner_id=p_user_id ORDER BY id FOR UPDATE;
 SELECT coalesce(array_agg(DISTINCT sub ORDER BY sub),'{}') INTO subscriptions FROM (
  SELECT stripe_subscription_id AS sub FROM public.contractor_subscriptions WHERE contractor_id=p_user_id
  UNION SELECT stripe_subscription_id FROM public.homeowner_subscriptions WHERE homeowner_id=p_user_id
 ) s WHERE sub IS NOT NULL;
 IF EXISTS(SELECT 1 FROM unnest(subscriptions) sub WHERE sub !~ '^sub_[A-Za-z0-9_]+$') THEN
  RAISE EXCEPTION 'Invalid subscription reference requires review' USING ERRCODE='23514'; END IF;
 INSERT INTO public.account_deletion_operations(user_id) VALUES(p_user_id) RETURNING id INTO op;
 INSERT INTO public.account_deletion_cleanup_steps(operation_id,kind,resource_id) VALUES(op,'auth_user',p_user_id::text);
 INSERT INTO public.account_deletion_cleanup_steps(operation_id,kind,resource_id)
  SELECT op,'stripe_subscription',sub FROM unnest(subscriptions) sub;
 -- A data failure rolls back the journal as well; a lost success response leaves
 -- provider identifiers durably available after their profile-linked rows vanish.
 PERFORM public.delete_user_data(p_user_id);
 RETURN op;
END $$;
REVOKE ALL ON FUNCTION public.delete_account_with_recovery(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_with_recovery(uuid) TO service_role;

CREATE FUNCTION public.claim_account_cleanup_step(p_operation_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.account_deletion_cleanup_steps%ROWTYPE; actor uuid;
BEGIN
 SELECT * INTO s FROM public.account_deletion_cleanup_steps
 WHERE status='pending' AND next_attempt_at<=clock_timestamp()
  AND (lease_expires_at IS NULL OR lease_expires_at<=clock_timestamp())
  AND (p_operation_id IS NULL OR operation_id=p_operation_id)
 ORDER BY CASE WHEN kind='auth_user' THEN 0 ELSE 1 END,next_attempt_at,id
 FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 UPDATE public.account_deletion_cleanup_steps SET lease_token=gen_random_uuid(),
  lease_expires_at=clock_timestamp()+interval '2 minutes',attempts=attempts+1
  WHERE id=s.id RETURNING * INTO s;
 SELECT user_id INTO STRICT actor FROM public.account_deletion_operations WHERE id=s.operation_id;
 RETURN to_jsonb(s)||jsonb_build_object('user_id',actor);
END $$;
REVOKE ALL ON FUNCTION public.claim_account_cleanup_step(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_account_cleanup_step(uuid) TO service_role;

CREATE FUNCTION public.finish_account_cleanup_step(p_step_id uuid,p_lease_token uuid,p_outcome text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF p_outcome NOT IN ('completed','retry','needs_review') THEN RAISE EXCEPTION 'Invalid cleanup outcome' USING ERRCODE='23514'; END IF;
 UPDATE public.account_deletion_cleanup_steps SET
  status=CASE WHEN p_outcome='retry' THEN 'pending' ELSE p_outcome END,
  completed_at=CASE WHEN p_outcome='completed' THEN clock_timestamp() ELSE NULL END,
  last_outcome=p_outcome,lease_token=NULL,lease_expires_at=NULL,
  next_attempt_at=clock_timestamp()+make_interval(secs=>least(3600,30*power(2,least(attempts,7)))::integer)
 WHERE id=p_step_id AND status='pending' AND lease_token=p_lease_token AND lease_expires_at>clock_timestamp();
 IF NOT FOUND THEN RAISE EXCEPTION 'Cleanup lease expired or replaced' USING ERRCODE='40001'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.finish_account_cleanup_step(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_account_cleanup_step(uuid,uuid,text) TO service_role;
