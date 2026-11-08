-- Deterministic business conflicts must terminate, not trigger PostgREST retries.
-- Release compatible API mappings BEFORE applying this migration.
-- Function-only changes: eight SQLSTATE substitutions; no row/backfill writes,
-- grants, locking, idempotency, pricing, notification or financial logic changes.
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.propose_quote_amendment(
  p_quote_id uuid, p_actor_id uuid, p_request_id uuid, p_expected_updated_at timestamptz,
  p_reason text, p_pricing jsonb
) RETURNS public.quote_revisions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  q public.contractor_quotes;
  existing public.quote_revisions;
  result public.quote_revisions;
  proposed jsonb;
  item jsonb;
  subtotal numeric := 0;
  tax numeric;
BEGIN
  SELECT * INTO q FROM public.contractor_quotes
    WHERE id = p_quote_id AND contractor_id = p_actor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found' USING ERRCODE = 'P0002'; END IF;
  IF q.status <> 'accepted' THEN
    RAISE EXCEPTION 'Only accepted quotes support amendment proposals' USING ERRCODE = 'PT409';
  END IF;
  IF p_request_id IS NULL OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'A request id and amendment reason are required' USING ERRCODE = '22023';
  END IF;
  -- The API calculates pricing; validate the complete snapshot again at the trust boundary.
  IF p_pricing IS NULL OR jsonb_typeof(p_pricing->'line_items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid amendment pricing' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_pricing->'line_items') NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid amendment items' USING ERRCODE = '22023';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_pricing->'line_items') LOOP
    IF COALESCE(length(btrim(item->>'description')), 0) NOT BETWEEN 1 AND 500 OR
      NOT COALESCE((item->>'quantity')::numeric > 0 AND (item->>'quantity')::numeric <= 1000000 AND
        round((item->>'quantity')::numeric, 3) = (item->>'quantity')::numeric AND
        (item->>'unitPrice')::numeric BETWEEN 0 AND 1000000 AND
        round((item->>'unitPrice')::numeric, 2) = (item->>'unitPrice')::numeric AND
        (item->>'total')::numeric = round((item->>'quantity')::numeric * (item->>'unitPrice')::numeric, 2), false) THEN
      RAISE EXCEPTION 'Invalid amendment item' USING ERRCODE = '22023';
    END IF;
    subtotal := subtotal + (item->>'total')::numeric;
  END LOOP;
  tax := round(subtotal * (p_pricing->>'tax_rate')::numeric / 100, 2);
  IF NOT COALESCE((p_pricing->>'tax_rate')::numeric BETWEEN 0 AND 100 AND
    round((p_pricing->>'tax_rate')::numeric, 2) = (p_pricing->>'tax_rate')::numeric AND
    subtotal = (p_pricing->>'subtotal')::numeric AND tax = (p_pricing->>'tax_amount')::numeric AND
    subtotal + tax = (p_pricing->>'total_amount')::numeric AND subtotal + tax <= 99999999.99, false) THEN
    RAISE EXCEPTION 'Invalid amendment totals' USING ERRCODE = '22023';
  END IF;
  proposed := public.quote_history_snapshot(q) || jsonb_build_object(
    'line_items', p_pricing->'line_items', 'subtotal', subtotal,
    'tax_rate', p_pricing->'tax_rate', 'tax_amount', tax, 'total_amount', subtotal + tax,
    'status', 'proposal');
  SELECT * INTO existing FROM public.quote_revisions WHERE quote_id = q.id AND request_id = p_request_id;
  IF FOUND THEN
    IF existing.actor_id IS DISTINCT FROM p_actor_id OR existing.reason IS DISTINCT FROM btrim(p_reason)
      OR (existing.after_snapshot - 'updated_at') IS DISTINCT FROM (proposed - 'updated_at') THEN
      RAISE EXCEPTION 'Request id already used for a different amendment' USING ERRCODE = 'PT409';
    END IF;
    RETURN existing;
  END IF;
  IF q.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'Quote changed; reload before proposing an amendment' USING ERRCODE = 'PT409';
  END IF;
  INSERT INTO public.quote_revisions(quote_id, contractor_id, revision_number, kind, reason,
    actor_id, request_id, before_snapshot, after_snapshot)
  SELECT q.id, q.contractor_id, COALESCE(MAX(revision_number), 0) + 1, 'amendment_proposed', btrim(p_reason),
    p_actor_id, p_request_id, public.quote_history_snapshot(q), proposed
    FROM public.quote_revisions WHERE quote_id = q.id RETURNING * INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_quote_amendment(p_job uuid,p_revision uuid,p_actor uuid,p_action text,p_expected_version integer,p_note text DEFAULT '')
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
  RAISE EXCEPTION 'The responsible customer changed; withdraw and publish a new proposal' USING ERRCODE='PT409'; END IF;
 target:=CASE p_action WHEN 'publish' THEN 'published' WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' WHEN 'withdraw' THEN 'withdrawn' ELSE 'applied' END;
 IF a.id IS NOT NULL AND a.status=target AND a.version=p_expected_version+1 AND EXISTS(
   SELECT 1 FROM public.quote_amendment_events e WHERE e.amendment_id=a.id AND e.version=a.version
    AND e.actor_id=p_actor AND e.action=p_action AND e.note=event_note) THEN RETURN to_jsonb(a); END IF;
 IF (a.id IS NULL AND (p_action<>'publish' OR p_expected_version<>0)) OR
    (a.id IS NOT NULL AND (p_action='publish' OR a.version<>p_expected_version)) THEN
  RAISE EXCEPTION 'Amendment changed; refresh before continuing' USING ERRCODE='PT409'; END IF;
 IF p_action<>'withdraw' AND (j.status<>'assigned' OR j.contractor_id IS DISTINCT FROM q.contractor_id OR
   q.status<>'accepted' OR q.contractor_id IS DISTINCT FROM r.contractor_id OR
   (public.quote_history_snapshot(q)-'updated_at') IS DISTINCT FROM (r.before_snapshot-'updated_at')) THEN
  RAISE EXCEPTION 'The accepted quote or job changed; review a new proposal' USING ERRCODE='PT409'; END IF;
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
   RAISE EXCEPTION 'This amendment no longer permits that action' USING ERRCODE='PT409'; END IF;
  IF p_action='apply' THEN
   SELECT * INTO b FROM public.bids WHERE id=a.bid_id FOR UPDATE;
   IF b.quote_id IS DISTINCT FROM q.id OR b.status IS DISTINCT FROM 'accepted' OR b.amount IS DISTINCT FROM a.base_bid_amount OR
     b.job_id IS DISTINCT FROM j.id OR b.contractor_id IS DISTINCT FROM q.contractor_id THEN
    RAISE EXCEPTION 'Accepted bid changed; review a new proposal' USING ERRCODE='PT409'; END IF;
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
