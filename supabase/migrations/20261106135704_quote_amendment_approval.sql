-- Schema only: no backfill, invocation, payment operation or customer delivery.
SET LOCAL lock_timeout = '5s';
CREATE TABLE public.quote_amendments (
 id uuid PRIMARY KEY REFERENCES public.quote_revisions(id),
 sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 quote_id uuid NOT NULL REFERENCES public.contractor_quotes(id),
 job_id uuid NOT NULL REFERENCES public.jobs(id),
 bid_id uuid NOT NULL REFERENCES public.bids(id),
 contractor_id uuid NOT NULL,
 customer_id uuid NOT NULL,
 status text NOT NULL CHECK(status IN ('published','approved','rejected','withdrawn','applying','applied')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 base_bid_amount numeric(10,2) NOT NULL,
 applied_quote_id uuid REFERENCES public.contractor_quotes(id),
 published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 decided_at timestamptz,
 applied_at timestamptz,
 CHECK(customer_id<>contractor_id)
);
CREATE UNIQUE INDEX quote_amendments_one_open ON public.quote_amendments(quote_id)
 WHERE status IN ('published','approved','applying');
CREATE INDEX quote_amendments_job_sequence ON public.quote_amendments(job_id,sequence DESC);
CREATE TABLE public.quote_amendment_events (
 amendment_id uuid NOT NULL REFERENCES public.quote_amendments(id),
 version integer NOT NULL,
 action text NOT NULL CHECK(action IN ('publish','approve','reject','withdraw','apply')),
 actor_id uuid NOT NULL,
 note text NOT NULL DEFAULT '' CHECK(length(note)<=2000),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(amendment_id,version)
);
ALTER TABLE public.quote_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_amendment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quote_amendments,public.quote_amendment_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.quote_amendments,public.quote_amendment_events TO service_role;
REVOKE ALL ON SEQUENCE public.quote_amendments_sequence_seq FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER quote_amendment_events_immutable BEFORE UPDATE OR DELETE ON public.quote_amendment_events
 FOR EACH ROW EXECUTE FUNCTION public.quote_revisions_immutable();

-- Preserve the existing financial gate. The only new exception requires an
-- approved, locked, in-progress application row inaccessible to direct writers.
CREATE OR REPLACE FUNCTION public.protect_bid_financial_terms()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.status='accepted' THEN
  IF NEW.job_id IS DISTINCT FROM OLD.job_id OR NEW.contractor_id IS DISTINCT FROM OLD.contractor_id THEN
   RAISE EXCEPTION 'Accepted bid financial terms are immutable' USING ERRCODE='23514';
  END IF;
  IF NEW.amount IS DISTINCT FROM OLD.amount THEN
   IF current_user NOT IN ('postgres','service_role') THEN
    RAISE EXCEPTION 'Accepted bid financial terms are immutable' USING ERRCODE='23514';
   END IF;
   IF NOT EXISTS(SELECT 1 FROM public.quote_amendments a JOIN public.quote_revisions r ON r.id=a.id
     WHERE a.bid_id=OLD.id AND a.quote_id=OLD.quote_id AND a.job_id=OLD.job_id
      AND a.contractor_id=OLD.contractor_id AND a.status='applying' AND a.decided_at IS NOT NULL
      AND a.base_bid_amount=OLD.amount AND a.applied_quote_id=NEW.quote_id
      AND (r.after_snapshot->>'total_amount')::numeric=NEW.amount AND NEW.status='accepted') THEN
    RAISE EXCEPTION 'Accepted bid financial terms require an approved amendment' USING ERRCODE='23514';
   END IF;
  END IF;
 END IF;
 IF current_user IN ('anon','authenticated') THEN
  IF TG_OP='INSERT' THEN
   IF NEW.status IS DISTINCT FROM 'pending' OR NEW.contractor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Clients may only submit their own pending bids' USING ERRCODE='42501';
   END IF;
  ELSE
   IF OLD.status IS DISTINCT FROM 'pending' OR OLD.contractor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the contractor may change a pending bid' USING ERRCODE='42501';
   END IF;
   IF TG_OP='UPDATE' AND (NEW.job_id IS DISTINCT FROM OLD.job_id OR NEW.contractor_id IS DISTINCT FROM OLD.contractor_id OR NEW.status NOT IN ('pending','withdrawn')) THEN
    RAISE EXCEPTION 'Bid identity and acceptance require a trusted operation' USING ERRCODE='42501';
   END IF;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_bid_financial_terms() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.transition_quote_amendment(p_job uuid,p_revision uuid,p_actor uuid,p_action text,p_expected_version integer,p_note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.quote_revisions; q public.contractor_quotes; j public.jobs; b public.bids;
 a public.quote_amendments; c public.contracts; replacement public.contractor_quotes;
 customer uuid; target text; contract_count integer; event_note text:=btrim(coalesce(p_note,''));
BEGIN
 IF p_actor IS NULL OR p_expected_version IS NULL OR p_expected_version<0 OR length(event_note)>2000
  OR p_action IS NULL OR p_action NOT IN ('publish','approve','reject','withdraw','apply') THEN
  RAISE EXCEPTION 'Invalid amendment action' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM public.quote_revisions WHERE id=p_revision AND kind='amendment_proposed';
 IF NOT FOUND THEN RAISE EXCEPTION 'Amendment not found' USING ERRCODE='P0002'; END IF;
 -- Follow the funding/acceptance order: job, quote, amendment, bid, contract.
 SELECT * INTO j FROM public.jobs WHERE id=(SELECT job_id FROM public.contractor_quotes WHERE id=r.quote_id) FOR UPDATE;
 customer:=coalesce(j.payer_user_id,j.homeowner_id);
 IF j.id IS NULL OR j.id IS DISTINCT FROM p_job OR customer IS NULL OR customer=r.contractor_id OR
   (p_action IN ('publish','withdraw','apply') AND p_actor IS DISTINCT FROM r.contractor_id) OR
   (p_action IN ('approve','reject') AND p_actor IS DISTINCT FROM customer) THEN
  RAISE EXCEPTION 'Amendment access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO q FROM public.contractor_quotes WHERE id=r.quote_id FOR UPDATE;
 SELECT * INTO a FROM public.quote_amendments WHERE id=r.id FOR UPDATE;
 IF a.id IS NOT NULL AND a.customer_id IS DISTINCT FROM customer AND p_action<>'withdraw' THEN
  RAISE EXCEPTION 'The responsible customer changed; withdraw and publish a new proposal' USING ERRCODE='40001'; END IF;
 target:=CASE p_action WHEN 'publish' THEN 'published' WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' WHEN 'withdraw' THEN 'withdrawn' ELSE 'applied' END;
 IF a.id IS NOT NULL AND a.status=target AND a.version=p_expected_version+1 AND EXISTS(
   SELECT 1 FROM public.quote_amendment_events e WHERE e.amendment_id=a.id AND e.version=a.version
    AND e.actor_id=p_actor AND e.action=p_action AND e.note=event_note) THEN RETURN to_jsonb(a); END IF;
 IF (a.id IS NULL AND (p_action<>'publish' OR p_expected_version<>0)) OR
    (a.id IS NOT NULL AND (p_action='publish' OR a.version<>p_expected_version)) THEN
  RAISE EXCEPTION 'Amendment changed; refresh before continuing' USING ERRCODE='40001'; END IF;
 IF p_action<>'withdraw' AND (j.status<>'assigned' OR j.contractor_id IS DISTINCT FROM q.contractor_id OR
   q.status<>'accepted' OR q.contractor_id IS DISTINCT FROM r.contractor_id OR
   (public.quote_history_snapshot(q)-'updated_at') IS DISTINCT FROM (r.before_snapshot-'updated_at')) THEN
  RAISE EXCEPTION 'The accepted quote or job changed; review a new proposal' USING ERRCODE='40001'; END IF;
 IF p_action='publish' THEN
  SELECT * INTO b FROM public.bids WHERE quote_id=q.id AND job_id=j.id AND contractor_id=q.contractor_id AND status='accepted' FOR UPDATE;
  IF b.id IS NULL OR b.amount IS DISTINCT FROM q.total_amount OR (r.after_snapshot->>'total_amount')::numeric<=0 OR
    (SELECT count(*) FROM public.bids WHERE job_id=j.id AND status='accepted')<>1 THEN
   RAISE EXCEPTION 'A matching accepted bid and positive proposed total are required' USING ERRCODE='23514'; END IF;
  INSERT INTO public.quote_amendments(id,quote_id,job_id,bid_id,contractor_id,customer_id,status,base_bid_amount)
   VALUES(r.id,q.id,j.id,b.id,q.contractor_id,customer,'published',b.amount) RETURNING * INTO a;
 ELSE
  IF (p_action IN ('approve','reject') AND a.status<>'published') OR
     (p_action='withdraw' AND a.status NOT IN ('published','approved')) OR
     (p_action='apply' AND a.status<>'approved') THEN
   RAISE EXCEPTION 'This amendment no longer permits that action' USING ERRCODE='40001'; END IF;
  IF p_action='apply' THEN
   SELECT * INTO b FROM public.bids WHERE id=a.bid_id FOR UPDATE;
   IF b.quote_id IS DISTINCT FROM q.id OR b.status IS DISTINCT FROM 'accepted' OR b.amount IS DISTINCT FROM a.base_bid_amount OR
     b.job_id IS DISTINCT FROM j.id OR b.contractor_id IS DISTINCT FROM q.contractor_id THEN
    RAISE EXCEPTION 'Accepted bid changed; review a new proposal' USING ERRCODE='40001'; END IF;
   -- Fail closed for any financial footprint, even cancelled/failed reservations.
   IF EXISTS(SELECT 1 FROM public.escrow_transactions WHERE job_id=j.id) OR
      EXISTS(SELECT 1 FROM public.payment_funding_reservations WHERE job_id=j.id) OR
      EXISTS(SELECT 1 FROM public.invoices WHERE job_id=j.id) OR
      EXISTS(SELECT 1 FROM public.payments WHERE job_id=j.id) OR
      EXISTS(SELECT 1 FROM public.escrow_payments WHERE job_id=j.id) OR
      EXISTS(SELECT 1 FROM public.payment_tracking WHERE job_id=j.id) OR
      EXISTS(SELECT 1 FROM public.tax_payment_records WHERE job_id=j.id) OR
      EXISTS(SELECT 1 FROM public.contractor_payout_credit_events WHERE job_id=j.id) THEN
    RAISE EXCEPTION 'Financial records exist; a separate payment variation is required' USING ERRCODE='23514'; END IF;
   PERFORM 1 FROM public.contracts WHERE job_id=j.id FOR UPDATE;
   SELECT count(*) INTO contract_count FROM public.contracts WHERE job_id=j.id;
   SELECT * INTO c FROM public.contracts WHERE job_id=j.id LIMIT 1;
   IF contract_count<>1 OR c.contractor_id IS DISTINCT FROM q.contractor_id OR c.quote_id IS DISTINCT FROM q.id OR
      c.amount IS DISTINCT FROM a.base_bid_amount OR c.status IS NULL OR c.status NOT IN ('draft','pending_contractor','pending_homeowner') OR
      (c.homeowner_id IS DISTINCT FROM j.homeowner_id AND c.homeowner_id IS DISTINCT FROM customer) OR
      c.homeowner_signed_at IS NOT NULL OR c.contractor_signed_at IS NOT NULL OR c.agreement_formed_at IS NOT NULL OR
      c.cancellation_requested_at IS NOT NULL OR c.cancellation_deadline IS NOT NULL OR
      EXISTS(SELECT 1 FROM public.contract_signatories WHERE contract_id=c.id AND signed_at IS NOT NULL) OR
      EXISTS(SELECT 1 FROM public.contract_signatures WHERE contract_id=c.id) OR
      EXISTS(SELECT 1 FROM public.contract_acceptance_evidence WHERE contract_id=c.id) OR
      EXISTS(SELECT 1 FROM public.contract_cosignature_evidence WHERE contract_id=c.id) OR
      EXISTS(SELECT 1 FROM public.contract_consents WHERE contract_id=c.id) THEN
    RAISE EXCEPTION 'Exactly one matching unsigned contract without consent evidence is required; signed agreements need a separate variation' USING ERRCODE='23514'; END IF;
   replacement:=q; replacement.id:=gen_random_uuid();
   replacement.quote_number:=left(coalesce(q.quote_number,'QUOTE'),50)||'-A-'||replacement.id::text;
   replacement.line_items:=r.after_snapshot->'line_items';
   replacement.subtotal:=(r.after_snapshot->>'subtotal')::numeric;
   replacement.tax_rate:=(r.after_snapshot->>'tax_rate')::numeric;
   replacement.tax_amount:=(r.after_snapshot->>'tax_amount')::numeric;
   replacement.total_amount:=(r.after_snapshot->>'total_amount')::numeric;
   replacement.created_at:=clock_timestamp(); replacement.updated_at:=replacement.created_at;
   replacement.quote_date:=CURRENT_DATE; replacement.accepted_at:=a.decided_at;
   replacement.sent_at:=NULL; replacement.viewed_at:=NULL;
   INSERT INTO public.contractor_quotes SELECT (replacement).*;
   UPDATE public.quote_amendments SET status='applying',applied_quote_id=replacement.id WHERE id=a.id;
   UPDATE public.bids SET amount=replacement.total_amount,quote_id=replacement.id,updated_at=clock_timestamp() WHERE id=b.id;
   UPDATE public.contracts SET amount=replacement.total_amount,quote_id=replacement.id,status='draft',
    contract_version=coalesce(contract_version,1)+1,updated_at=clock_timestamp() WHERE id=c.id;
   a.applied_quote_id:=replacement.id;
  END IF;
  UPDATE public.quote_amendments SET status=target,version=version+1,
   decided_at=CASE WHEN p_action IN ('approve','reject') THEN clock_timestamp() ELSE decided_at END,
   applied_quote_id=a.applied_quote_id,applied_at=CASE WHEN p_action='apply' THEN clock_timestamp() ELSE applied_at END
   WHERE id=a.id RETURNING * INTO a;
 END IF;
 INSERT INTO public.quote_amendment_events(amendment_id,version,action,actor_id,note)
  VALUES(a.id,a.version,p_action,p_actor,event_note);
 RETURN to_jsonb(a);
END $$;
REVOKE ALL ON FUNCTION public.transition_quote_amendment(uuid,uuid,uuid,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.transition_quote_amendment(uuid,uuid,uuid,text,integer,text) TO service_role;

CREATE FUNCTION public.read_job_quote_amendments(p_job uuid,p_actor uuid,p_before bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j public.jobs; items jsonb;
BEGIN
 SELECT * INTO j FROM public.jobs WHERE id=p_job;
 IF p_actor IS NULL OR j.id IS NULL OR (p_actor IS DISTINCT FROM j.contractor_id AND p_actor IS DISTINCT FROM j.homeowner_id AND p_actor IS DISTINCT FROM j.payer_user_id) THEN
  RAISE EXCEPTION 'Amendment access denied' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.sequence DESC),'[]'::jsonb) INTO items FROM (
  SELECT a.*,r.reason,r.before_snapshot-'notes' AS before_snapshot,r.after_snapshot-'notes' AS after_snapshot,
    (SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.version),'[]'::jsonb) FROM public.quote_amendment_events e WHERE e.amendment_id=a.id) AS events
  FROM public.quote_amendments a JOIN public.quote_revisions r ON r.id=a.id
  WHERE a.job_id=j.id AND (p_before IS NULL OR a.sequence<p_before) ORDER BY a.sequence DESC LIMIT 51
 ) x;
 RETURN jsonb_build_object('amendments',items,'can_approve',p_actor=coalesce(j.payer_user_id,j.homeowner_id) AND p_actor IS DISTINCT FROM j.contractor_id,
   'is_contractor',p_actor=j.contractor_id);
END $$;
REVOKE ALL ON FUNCTION public.read_job_quote_amendments(uuid,uuid,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_job_quote_amendments(uuid,uuid,bigint) TO service_role;

-- Keep original documents available by id without counting superseded pricing twice.
CREATE VIEW public.current_contractor_quotes WITH (security_invoker=true) AS
 SELECT q.* FROM public.contractor_quotes q WHERE NOT EXISTS(
  SELECT 1 FROM public.quote_amendments a WHERE a.quote_id=q.id AND a.status='applied');
REVOKE ALL ON public.current_contractor_quotes FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.current_contractor_quotes TO service_role;
