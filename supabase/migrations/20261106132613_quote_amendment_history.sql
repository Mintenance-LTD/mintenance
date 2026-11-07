-- Prospective history only. No fabricated backfill and no change to agreed prices.
CREATE TABLE public.quote_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  contractor_id uuid NOT NULL,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  kind text NOT NULL CHECK (kind IN ('created', 'updated', 'deleted', 'amendment_proposed')),
  reason text,
  actor_id uuid,
  request_id uuid,
  before_snapshot jsonb,
  after_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (quote_id, revision_number),
  UNIQUE (quote_id, request_id),
  CHECK (kind <> 'amendment_proposed' OR
    (request_id IS NOT NULL AND actor_id IS NOT NULL AND reason IS NOT NULL AND
     length(btrim(reason)) BETWEEN 1 AND 2000 AND before_snapshot IS NOT NULL AND after_snapshot IS NOT NULL))
);
-- No cascading quote FK: draft deletion must not silently erase its history.
ALTER TABLE public.quote_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quote_revisions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.quote_revisions TO service_role;
CREATE INDEX quote_revisions_owner_idx ON public.quote_revisions (contractor_id, quote_id, revision_number DESC);

CREATE FUNCTION public.quote_history_snapshot(q public.contractor_quotes)
RETURNS jsonb LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object('title', q.title, 'description', q.description,
    'line_items', q.line_items, 'subtotal', q.subtotal, 'tax_rate', q.tax_rate,
    'tax_amount', q.tax_amount, 'total_amount', q.total_amount,
    'terms', q.terms, 'notes', q.notes, 'valid_until', q.valid_until,
    'status', q.status, 'updated_at', q.updated_at);
$$;
REVOKE ALL ON FUNCTION public.quote_history_snapshot(public.contractor_quotes) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.quote_revisions_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Quote history is append-only' USING ERRCODE = '23514';
END;
$$;
REVOKE ALL ON FUNCTION public.quote_revisions_immutable() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER quote_revisions_immutable BEFORE UPDATE OR DELETE ON public.quote_revisions
FOR EACH ROW EXECUTE FUNCTION public.quote_revisions_immutable();

-- Check BEFORE foreign-key ON DELETE SET NULL actions can erase a bid link.
CREATE FUNCTION public.guard_accepted_quote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  linked_accepted boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.bids b WHERE b.quote_id = OLD.id AND b.status = 'accepted')
      INTO linked_accepted;
    IF OLD.status = 'accepted' OR linked_accepted THEN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Accepted quotes cannot be deleted' USING ERRCODE = '23514';
      END IF;
      -- Allow status synchronization after bid acceptance, and delivery telemetry,
      -- but never a price, scope, owner, job or terms rewrite of an agreed quote.
      IF (to_jsonb(NEW) - ARRAY['updated_at', 'viewed_at', 'status']) IS DISTINCT FROM
         (to_jsonb(OLD) - ARRAY['updated_at', 'viewed_at', 'status'])
         OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'accepted') THEN
        RAISE EXCEPTION 'Accepted quotes require a separate amendment proposal' USING ERRCODE = '23514';
      END IF;
    END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_accepted_quote() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_accepted_quote BEFORE UPDATE OR DELETE ON public.contractor_quotes
FOR EACH ROW EXECUTE FUNCTION public.guard_accepted_quote();

-- SECURITY DEFINER is intentional: ordinary quote writers cannot insert invented
-- history. Only this trigger and the service-only proposal RPC can append it.
CREATE FUNCTION public.record_quote_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  q public.contractor_quotes;
  prior jsonb;
  following jsonb;
BEGIN
  IF TG_OP <> 'INSERT' THEN prior := public.quote_history_snapshot(OLD); END IF;
  IF TG_OP = 'DELETE' THEN q := OLD;
  ELSE q := NEW; following := public.quote_history_snapshot(NEW);
  END IF;
  -- Ignore timestamp-only refreshes. The row write already serializes revisions.
  IF TG_OP = 'UPDATE' AND (to_jsonb(OLD) - ARRAY['updated_at', 'viewed_at']) =
    (to_jsonb(NEW) - ARRAY['updated_at', 'viewed_at']) THEN RETURN NEW; END IF;
  INSERT INTO public.quote_revisions(quote_id, contractor_id, revision_number, kind, before_snapshot, after_snapshot)
  SELECT q.id, q.contractor_id, COALESCE(MAX(revision_number), 0) + 1,
    CASE TG_OP WHEN 'INSERT' THEN 'created' WHEN 'DELETE' THEN 'deleted' ELSE 'updated' END,
    prior, following FROM public.quote_revisions WHERE quote_id = q.id;
  -- actor_id deliberately remains NULL: a service-role write does not prove a human actor.
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_quote_revision() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER record_quote_revision AFTER INSERT OR UPDATE OR DELETE ON public.contractor_quotes
FOR EACH ROW EXECUTE FUNCTION public.record_quote_revision();

CREATE FUNCTION public.propose_quote_amendment(
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
    RAISE EXCEPTION 'Only accepted quotes support amendment proposals' USING ERRCODE = '40001';
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
      RAISE EXCEPTION 'Request id already used for a different amendment' USING ERRCODE = '40001';
    END IF;
    RETURN existing;
  END IF;
  IF q.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'Quote changed; reload before proposing an amendment' USING ERRCODE = '40001';
  END IF;
  INSERT INTO public.quote_revisions(quote_id, contractor_id, revision_number, kind, reason,
    actor_id, request_id, before_snapshot, after_snapshot)
  SELECT q.id, q.contractor_id, COALESCE(MAX(revision_number), 0) + 1, 'amendment_proposed', btrim(p_reason),
    p_actor_id, p_request_id, public.quote_history_snapshot(q), proposed
    FROM public.quote_revisions WHERE quote_id = q.id RETURNING * INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.propose_quote_amendment(uuid, uuid, uuid, timestamptz, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.propose_quote_amendment(uuid, uuid, uuid, timestamptz, text, jsonb) TO service_role;
COMMENT ON TABLE public.quote_revisions IS
  'Prospective quote history and internal amendment proposals; proposals do not change bids, contracts or payments. No historical backfill.';
