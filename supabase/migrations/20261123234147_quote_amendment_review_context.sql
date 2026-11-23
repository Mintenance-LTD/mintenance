-- Read the proposal history and the live pricing context from one snapshot.
-- Amendment decisions and payment rules remain enforced by the write RPC.
CREATE OR REPLACE FUNCTION public.read_job_quote_amendments(
  p_job uuid, p_actor uuid, p_before bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  j public.jobs;
  items jsonb;
  agreement jsonb;
  agreed_total numeric;
  history_only text;
BEGIN
  SELECT * INTO j FROM public.jobs WHERE id = p_job;
  IF p_actor IS NULL OR j.id IS NULL OR
    (p_actor IS DISTINCT FROM j.contractor_id AND
     p_actor IS DISTINCT FROM j.homeowner_id AND
     p_actor IS DISTINCT FROM j.payer_user_id) THEN
    RAISE EXCEPTION 'Amendment access denied' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.sequence DESC), '[]'::jsonb)
    INTO items
  FROM (
    SELECT a.*, r.reason, r.before_snapshot - 'notes' AS before_snapshot,
      r.after_snapshot - 'notes' AS after_snapshot,
      (SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.version), '[]'::jsonb)
        FROM public.quote_amendment_events e WHERE e.amendment_id = a.id) AS events
    FROM public.quote_amendments a
    JOIN public.quote_revisions r ON r.id = a.id
    WHERE a.job_id = j.id AND (p_before IS NULL OR a.sequence < p_before)
    ORDER BY a.sequence DESC LIMIT 51
  ) x;

  SELECT min(b.amount) INTO agreed_total
  FROM public.bids b
  WHERE b.job_id = j.id AND b.status = 'accepted'
  HAVING count(*) = 1 AND bool_and(b.contractor_id = j.contractor_id);

  SELECT jsonb_build_object(
    'id', c.id, 'quote_id', c.quote_id, 'version', c.contract_version,
    'total', c.amount, 'status', c.status
  ) INTO agreement
  FROM public.contracts c
  WHERE c.job_id = j.id AND c.status <> 'cancelled'
    AND c.contractor_id = j.contractor_id
    AND (SELECT count(*) FROM public.contracts WHERE job_id = j.id AND status <> 'cancelled') = 1;

  IF EXISTS (
    SELECT 1 FROM public.contracts c WHERE c.job_id = j.id AND (
      c.status = 'accepted' OR c.homeowner_signed_at IS NOT NULL OR
      c.contractor_signed_at IS NOT NULL OR c.agreement_formed_at IS NOT NULL OR
      EXISTS (SELECT 1 FROM public.contract_signatories WHERE contract_id = c.id AND signed_at IS NOT NULL) OR
      EXISTS (SELECT 1 FROM public.contract_signatures WHERE contract_id = c.id) OR
      EXISTS (SELECT 1 FROM public.contract_acceptance_evidence WHERE contract_id = c.id) OR
      EXISTS (SELECT 1 FROM public.contract_cosignature_evidence WHERE contract_id = c.id) OR
      EXISTS (SELECT 1 FROM public.contract_consents WHERE contract_id = c.id)
    )
  ) OR EXISTS (
    SELECT 1 FROM public.escrow_transactions WHERE job_id = j.id AND
      (funded_at IS NOT NULL OR status IN ('held', 'release_pending', 'released', 'completed', 'disputed', 'refunded'))
  ) THEN
    history_only := 'signed_or_funded';
  ELSIF EXISTS (SELECT 1 FROM public.escrow_transactions WHERE job_id = j.id) OR
    EXISTS (SELECT 1 FROM public.payment_funding_reservations WHERE job_id = j.id) OR
    EXISTS (SELECT 1 FROM public.invoices WHERE job_id = j.id) OR
    EXISTS (SELECT 1 FROM public.payments WHERE job_id = j.id) OR
    EXISTS (SELECT 1 FROM public.escrow_payments WHERE job_id = j.id) OR
    EXISTS (SELECT 1 FROM public.payment_tracking WHERE job_id = j.id) OR
    EXISTS (SELECT 1 FROM public.tax_payment_records WHERE job_id = j.id) OR
    EXISTS (SELECT 1 FROM public.contractor_payout_credit_events WHERE job_id = j.id) THEN
    history_only := 'payment_activity';
  ELSIF j.status IS DISTINCT FROM 'assigned' THEN
    history_only := 'job_status';
  END IF;

  RETURN jsonb_build_object(
    'amendments', items,
    'can_approve', p_actor = coalesce(j.payer_user_id, j.homeowner_id) AND p_actor IS DISTINCT FROM j.contractor_id,
    'is_contractor', p_actor = j.contractor_id,
    'agreed_total', agreed_total,
    'current_agreement', agreement,
    'history_only', history_only
  );
END;
$$;

REVOKE ALL ON FUNCTION public.read_job_quote_amendments(uuid, uuid, bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_job_quote_amendments(uuid, uuid, bigint)
  TO service_role;
