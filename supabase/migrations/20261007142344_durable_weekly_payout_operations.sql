-- Reserve before external work. Uncertain transfers never restore or re-spend funds.
CREATE TABLE public.contractor_payout_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contractor_id uuid NOT NULL, -- retained financial journal survives profile deletion
 currency text NOT NULL CHECK(currency='GBP'),
 amount_minor bigint NOT NULL CHECK(amount_minor>0),
 destination text NOT NULL,
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','submitted','completed','needs_review')),
 stripe_transfer_id text UNIQUE,
 first_attempt_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CHECK (state <> 'completed' OR stripe_transfer_id IS NOT NULL)
);
CREATE UNIQUE INDEX contractor_payout_operation_open ON public.contractor_payout_operations(contractor_id,currency) WHERE state <> 'completed';
ALTER TABLE public.contractor_payout_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contractor_payout_operations FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.contractor_payout_operations TO service_role;

CREATE FUNCTION public.reserve_weekly_payout(p_contractor_id uuid,p_currency text)
RETURNS public.contractor_payout_operations LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE b public.contractor_payout_balances; op public.contractor_payout_operations; p public.profiles;
BEGIN
 SELECT * INTO b FROM public.contractor_payout_balances WHERE contractor_id=p_contractor_id AND currency=p_currency FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO op FROM public.contractor_payout_operations WHERE contractor_id=p_contractor_id AND currency=p_currency AND state<>'completed';
 IF FOUND THEN RETURN op; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=p_contractor_id;
 IF b.pending_amount_minor<1 OR p_currency<>'GBP' OR p.deleted_at IS NOT NULL
 OR p.stripe_connect_account_id IS NULL OR p.stripe_payouts_enabled IS DISTINCT FROM true OR p.stripe_transfers_active IS DISTINCT FROM true THEN RETURN NULL; END IF;
 INSERT INTO public.contractor_payout_operations(contractor_id,currency,amount_minor,destination)
 VALUES(p_contractor_id,p_currency,b.pending_amount_minor,p.stripe_connect_account_id) RETURNING * INTO op;
 RETURN op;
END $$;

CREATE FUNCTION public.begin_weekly_payout(p_operation_id uuid)
RETURNS public.contractor_payout_operations LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE op public.contractor_payout_operations;
BEGIN
 SELECT * INTO op FROM public.contractor_payout_operations WHERE id=p_operation_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown payout operation'; END IF;
 IF op.state='reserved' THEN
 UPDATE public.contractor_payout_operations SET state='submitted',first_attempt_at=now() WHERE id=op.id RETURNING * INTO op;
 END IF;
 RETURN op;
END $$;

CREATE FUNCTION public.complete_weekly_payout(p_operation_id uuid,p_transfer_id text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE op public.contractor_payout_operations; b public.contractor_payout_balances;
BEGIN
 SELECT * INTO op FROM public.contractor_payout_operations WHERE id=p_operation_id;
 IF NOT FOUND OR p_transfer_id IS NULL OR p_transfer_id NOT LIKE 'tr_%' THEN RAISE EXCEPTION 'Invalid payout completion'; END IF;
 -- Same lock order as reservation. Concurrent credit increments are preserved.
 SELECT * INTO b FROM public.contractor_payout_balances WHERE contractor_id=op.contractor_id AND currency=op.currency FOR UPDATE;
 SELECT * INTO op FROM public.contractor_payout_operations WHERE id=p_operation_id FOR UPDATE;
 IF op.state='completed' THEN
 IF op.stripe_transfer_id IS DISTINCT FROM p_transfer_id THEN RAISE EXCEPTION 'Transfer mismatch'; END IF;
 RETURN;
 END IF;
 IF op.state NOT IN ('submitted','needs_review') THEN RAISE EXCEPTION 'Payout has not been submitted'; END IF;
 IF b.contractor_id IS NULL OR b.pending_amount_minor<op.amount_minor THEN RAISE EXCEPTION 'Payout balance mismatch'; END IF;
 INSERT INTO public.contractor_payout_transfers(contractor_id,stripe_transfer_id,stripe_destination_account,amount_minor,currency,status)
 VALUES(op.contractor_id,p_transfer_id,op.destination,op.amount_minor,op.currency,'pending');
 UPDATE public.contractor_payout_balances SET pending_amount_minor=pending_amount_minor-op.amount_minor,
 lifetime_paid_out_minor=lifetime_paid_out_minor+op.amount_minor,last_payout_at=now(),last_payout_transfer_id=p_transfer_id,updated_at=now()
 WHERE contractor_id=op.contractor_id AND currency=op.currency;
 UPDATE public.contractor_payout_operations SET state='completed',stripe_transfer_id=p_transfer_id,completed_at=now() WHERE id=op.id;
END $$;

-- Trigger runs on cascades as well as direct deletes and serializes with balance credits.
CREATE FUNCTION public.protect_unpaid_payout_balance() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.pending_amount_minor>0 OR EXISTS(SELECT 1 FROM public.contractor_payout_operations WHERE contractor_id=OLD.contractor_id AND state<>'completed') THEN
 RAISE EXCEPTION 'Unpaid earnings must be settled before account deletion' USING ERRCODE='23514';
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER protect_unpaid_payout_balance BEFORE DELETE ON public.contractor_payout_balances FOR EACH ROW EXECUTE FUNCTION public.protect_unpaid_payout_balance();
REVOKE ALL ON FUNCTION public.reserve_weekly_payout(uuid,text),public.begin_weekly_payout(uuid),public.complete_weekly_payout(uuid,text),public.protect_unpaid_payout_balance() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_weekly_payout(uuid,text),public.begin_weekly_payout(uuid),public.complete_weekly_payout(uuid,text),public.protect_unpaid_payout_balance() TO service_role;
NOTIFY pgrst,'reload schema';


CREATE OR REPLACE FUNCTION public.profile_retention_blocked(actor uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM public.contractor_payout_balances WHERE contractor_id=actor AND pending_amount_minor>0) OR EXISTS (SELECT 1 FROM public.contractor_payout_operations WHERE contractor_id=actor AND state<>'completed') OR EXISTS (
    SELECT 1 FROM public.jobs j WHERE actor IN (j.homeowner_id, j.contractor_id, j.payer_user_id)
      AND j.status NOT IN ('completed', 'cancelled')
  ) OR EXISTS (
    SELECT 1 FROM public.escrow_transactions e WHERE actor IN (e.payer_id, e.payee_id)
      AND (e.status NOT IN ('released', 'refunded', 'completed', 'cancelled')
        OR coalesce(e.admin_hold_status, 'none') NOT IN ('none', 'released'))
  ) OR EXISTS (
    SELECT 1 FROM public.payments p WHERE actor IN (p.payer_id, p.payee_id)
      AND p.status NOT IN ('completed', 'refunded', 'cancelled')
  ) OR EXISTS (
    SELECT 1 FROM public.disputes d WHERE actor IN (d.raised_by, d.against)
      AND d.status NOT IN ('resolved', 'closed')
  ) OR EXISTS (
    -- Current signed contracts may still render identity from profiles. Defer
    -- those accounts to evidence review instead of destroying that identity.
    SELECT 1 FROM public.contracts c WHERE actor IN (c.homeowner_id, c.contractor_id)
      AND (c.status = 'accepted' OR c.homeowner_signed_at IS NOT NULL OR c.contractor_signed_at IS NOT NULL)
  );
$$;


REVOKE ALL ON FUNCTION public.profile_retention_blocked(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.profile_retention_blocked(uuid) TO service_role;
