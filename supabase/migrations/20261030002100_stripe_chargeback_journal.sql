-- Provider chargebacks are not platform dispute statuses. Keep their identity and
-- outcome separate, with one atomic link to the existing customer dispute inbox.
CREATE TABLE public.stripe_payment_disputes (
 id text PRIMARY KEY CHECK(id LIKE 'dp_%'),
 payment_intent_id text,
 charge_id text,
 amount_minor integer NOT NULL CHECK(amount_minor > 0),
 currency text NOT NULL,
 provider_status text NOT NULL,
 reason text NOT NULL,
 evidence_due_by timestamptz,
 escrow_id uuid REFERENCES public.escrow_transactions(id),
 dispute_id uuid UNIQUE REFERENCES public.disputes(id),
 previous_escrow_status text,
 previous_hold_status text,
 previous_blocked_reason text,
 previous_auto_release boolean,
 requires_review boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stripe_payment_disputes_escrow ON public.stripe_payment_disputes(escrow_id);
ALTER TABLE public.stripe_payment_disputes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_payment_disputes FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.stripe_payment_disputes TO service_role;

CREATE FUNCTION public.sync_stripe_payment_dispute(p_dispute jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE d public.stripe_payment_disputes; e public.escrow_transactions;
 job_key uuid; escrow_key uuid; canonical uuid; provider_state text:=p_dispute->>'status';
 terminal_win boolean:=provider_state IN('won','warning_closed'); restore_allowed boolean:=false;
BEGIN
 IF p_dispute->>'id' IS NULL OR p_dispute->>'id' NOT LIKE 'dp_%' OR
    provider_state IS NULL OR provider_state NOT IN('needs_response','under_review','won','lost','warning_needs_response','warning_under_review','warning_closed','prevented') OR
    (p_dispute->>'amount')::integer<=0 OR p_dispute->>'currency' IS NULL THEN
  RAISE EXCEPTION 'Invalid provider dispute' USING ERRCODE='23514'; END IF;
 -- Match the same job-before-escrow locking order as release/refund reservation.
 SELECT id,job_id INTO escrow_key,job_key FROM public.escrow_transactions
 WHERE payment_intent_id=p_dispute->>'payment_intent';
 IF escrow_key IS NOT NULL THEN
  PERFORM 1 FROM public.jobs WHERE id=job_key FOR UPDATE;
  SELECT * INTO e FROM public.escrow_transactions WHERE id=escrow_key FOR UPDATE;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('stripe_dispute:'||(p_dispute->>'id'),0));
 SELECT * INTO d FROM public.stripe_payment_disputes WHERE id=p_dispute->>'id' FOR UPDATE;
 IF FOUND AND (d.payment_intent_id IS DISTINCT FROM p_dispute->>'payment_intent' OR
   d.charge_id IS DISTINCT FROM p_dispute->>'charge' OR d.amount_minor<>(p_dispute->>'amount')::integer OR
   d.currency IS DISTINCT FROM p_dispute->>'currency') THEN
  RAISE EXCEPTION 'Provider dispute identity changed' USING ERRCODE='23514'; END IF;
 -- Terminal outcomes cannot be reopened by delayed deliveries or stale readers.
 IF d.provider_status IN('won','lost','warning_closed','prevented') AND provider_state<>d.provider_status THEN
  RETURN jsonb_build_object('escrowId',d.escrow_id,'disputeId',d.dispute_id,'status',d.provider_status,'requiresReview',d.requires_review);
 END IF;
 IF d.id IS NULL THEN
  IF e.id IS NOT NULL THEN
   INSERT INTO public.disputes(job_id,raised_by,against,reason,description,status)
   VALUES(e.job_id,e.payer_id,e.payee_id,'Card payment chargeback',
    'Stripe dispute '||(p_dispute->>'id')||': '||(p_dispute->>'reason')||'. Resolve the card dispute with Stripe before any platform settlement.','open')
   RETURNING id INTO canonical;
   INSERT INTO public.dispute_escrow_links(dispute_id,escrow_id) VALUES(canonical,e.id);
  END IF;
  INSERT INTO public.stripe_payment_disputes(id,payment_intent_id,charge_id,amount_minor,currency,provider_status,reason,
    escrow_id,dispute_id,previous_escrow_status,previous_hold_status,previous_blocked_reason,previous_auto_release,requires_review)
  VALUES(p_dispute->>'id',p_dispute->>'payment_intent',p_dispute->>'charge',(p_dispute->>'amount')::integer,p_dispute->>'currency',provider_state,p_dispute->>'reason',
    e.id,canonical,e.status,e.admin_hold_status,e.release_blocked_reason,e.auto_release_enabled,
    e.id IS NULL OR e.status NOT IN('held','awaiting_homeowner_approval') OR
    EXISTS(SELECT FROM public.escrow_transfer_attempts WHERE escrow_id=e.id) OR
    EXISTS(SELECT FROM public.escrow_admin_release_operations WHERE escrow_id=e.id) OR
    EXISTS(SELECT FROM public.escrow_refund_operations WHERE escrow_id=e.id AND state IN('reserved','pending','requires_action','reconciliation_required')))
  RETURNING * INTO d;
 END IF;
 UPDATE public.stripe_payment_disputes SET provider_status=provider_state,
  evidence_due_by=CASE WHEN p_dispute->>'evidence_due_by' IS NOT NULL THEN to_timestamp((p_dispute->>'evidence_due_by')::bigint) END,
  requires_review=requires_review OR provider_state IN('lost','prevented'),updated_at=now()
 WHERE id=d.id RETURNING * INTO d;
 IF e.id IS NOT NULL THEN
  restore_allowed:=terminal_win AND NOT d.requires_review AND
   e.status='disputed' AND e.release_blocked_reason='stripe_dispute:'||d.id AND
   e.admin_hold_status='pending_review' AND
   NOT EXISTS(SELECT FROM public.stripe_payment_disputes s WHERE s.escrow_id=e.id AND s.id<>d.id AND
     (s.provider_status NOT IN('won','warning_closed') OR s.requires_review)) AND
   NOT EXISTS(SELECT FROM public.disputes x JOIN public.dispute_escrow_links l ON l.dispute_id=x.id
     WHERE l.escrow_id=e.id AND x.id<>d.dispute_id AND x.status IN('open','under_review','pending','escalated'));
  IF restore_allowed THEN
   UPDATE public.escrow_transactions SET status=d.previous_escrow_status,
    admin_hold_status=d.previous_hold_status,auto_release_enabled=d.previous_auto_release,
    release_blocked_reason=d.previous_blocked_reason,updated_at=now() WHERE id=e.id;
  ELSIF NOT terminal_win THEN
   -- Never turn a previously paid/refunded balance back into spendable escrow.
   UPDATE public.escrow_transactions SET
    status=CASE WHEN status IN('held','awaiting_homeowner_approval') THEN 'disputed' ELSE status END,
    admin_hold_status=CASE WHEN admin_hold_status='admin_hold' THEN admin_hold_status ELSE 'pending_review' END,
    release_blocked_reason=CASE WHEN admin_hold_status='admin_hold' THEN release_blocked_reason ELSE 'stripe_dispute:'||d.id END,
    auto_release_enabled=false,updated_at=now() WHERE id=e.id;
  END IF;
  UPDATE public.disputes SET status=CASE WHEN terminal_win AND NOT d.requires_review THEN 'resolved' ELSE 'under_review' END,
   resolution='Stripe outcome: '||provider_state||CASE WHEN d.requires_review THEN '; payment reconciliation required' ELSE '' END,
   resolved_at=CASE WHEN terminal_win AND NOT d.requires_review THEN now() END,updated_at=now()
  WHERE id=d.dispute_id;
 END IF;
 RETURN jsonb_build_object('escrowId',d.escrow_id,'disputeId',d.dispute_id,'status',d.provider_status,'requiresReview',d.requires_review);
END $$;
REVOKE ALL ON FUNCTION public.sync_stripe_payment_dispute(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_stripe_payment_dispute(jsonb) TO service_role;

-- Even an admin must not settle a platform dispute while the card network has
-- removed its funding. Existing provider operations retain their recovery IDs.
CREATE FUNCTION public.guard_stripe_dispute_settlement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF EXISTS(SELECT FROM public.stripe_payment_disputes WHERE escrow_id=NEW.escrow_id AND
   (provider_status NOT IN('won','warning_closed') OR requires_review)) THEN
  RAISE EXCEPTION 'Card dispute requires provider resolution and reconciliation' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_stripe_dispute_settlement() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER guard_stripe_dispute_transfer BEFORE INSERT ON public.escrow_transfer_attempts
 FOR EACH ROW EXECUTE FUNCTION public.guard_stripe_dispute_settlement();
CREATE TRIGGER guard_stripe_dispute_refund BEFORE INSERT ON public.escrow_refund_operations
 FOR EACH ROW EXECUTE FUNCTION public.guard_stripe_dispute_settlement();
CREATE TRIGGER guard_stripe_dispute_admin_release BEFORE INSERT ON public.escrow_admin_release_operations
 FOR EACH ROW EXECUTE FUNCTION public.guard_stripe_dispute_settlement();
CREATE TRIGGER guard_stripe_dispute_resolution BEFORE INSERT ON public.escrow_dispute_resolutions
 FOR EACH ROW EXECUTE FUNCTION public.guard_stripe_dispute_settlement();
