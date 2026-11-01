-- Prevent automatic erasure from cascading through completed financial records.
-- Support must assess retention/anonymisation before erasing these accounts.
-- This is a safety hold, not a retention schedule or permission to retain forever.
CREATE FUNCTION public.assert_account_erasure_review(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE subject_jobs uuid[];
BEGIN
  -- FK insert locks cannot race the check and the subsequent account deletion.
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  PERFORM 1 FROM public.properties WHERE owner_id = p_user_id ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.jobs j WHERE j.homeowner_id = p_user_id
    OR j.contractor_id = p_user_id OR j.payer_user_id = p_user_id
    OR j.property_id IN (SELECT id FROM public.properties WHERE owner_id = p_user_id)
    ORDER BY j.id FOR UPDATE;
  SELECT coalesce(array_agg(j.id), '{}') INTO subject_jobs FROM public.jobs j
    WHERE j.homeowner_id = p_user_id OR j.contractor_id = p_user_id
      OR j.payer_user_id = p_user_id
      OR j.property_id IN (SELECT id FROM public.properties WHERE owner_id = p_user_id);

  IF EXISTS (SELECT 1 FROM public.payments WHERE payer_id = p_user_id OR payee_id = p_user_id OR job_id = ANY(subject_jobs))
    OR EXISTS (SELECT 1 FROM public.escrow_transactions WHERE payer_id = p_user_id OR payee_id = p_user_id OR job_id = ANY(subject_jobs))
    OR EXISTS (SELECT 1 FROM public.refunds WHERE job_id = ANY(subject_jobs))
    OR EXISTS (SELECT 1 FROM public.invoices WHERE contractor_id = p_user_id OR client_id = p_user_id OR job_id = ANY(subject_jobs))
    OR EXISTS (SELECT 1 FROM public.job_tips WHERE payer_id = p_user_id OR payee_id = p_user_id OR job_id = ANY(subject_jobs))
    OR EXISTS (SELECT 1 FROM public.contractor_payout_transfers WHERE contractor_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.contractor_payout_balances WHERE contractor_id = p_user_id AND (pending_amount_minor <> 0 OR last_payout_transfer_id IS NOT NULL))
    OR EXISTS (SELECT 1 FROM public.contractor_subscriptions WHERE contractor_id = p_user_id AND stripe_subscription_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM public.homeowner_subscriptions WHERE homeowner_id = p_user_id AND stripe_subscription_id IS NOT NULL)
    -- Organization erasure may affect other people's jobs, property and billing.
    OR EXISTS (SELECT 1 FROM public.organizations WHERE created_by = p_user_id)
  THEN
    RAISE EXCEPTION 'ACCOUNT_ERASURE_REQUIRES_REVIEW' USING ERRCODE = 'P0001';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_account_erasure_review(uuid) FROM PUBLIC, anon, authenticated, service_role;

-- Preserve the currently deployed cleanup implementation, ownership and grants.
-- Fail the migration if its expected PL/pgSQL entry point is absent.
DO $$
DECLARE definition text; marker text := E'\nBEGIN\n';
BEGIN
  SELECT replace(pg_get_functiondef('public.delete_user_data(uuid)'::regprocedure), E'\r\n', E'\n') INTO definition;
  IF position(marker IN definition) = 0 OR position('assert_account_erasure_review' IN definition) > 0 THEN
    RAISE EXCEPTION 'Unexpected delete_user_data definition; review before migration';
  END IF;
  definition := overlay(definition placing E'\nBEGIN\n  PERFORM public.assert_account_erasure_review(p_user_id);\n'
    from position(marker IN definition) for length(marker));
  EXECUTE definition;
END;
$$;

CREATE FUNCTION public.queue_account_erasure_review(p_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE request_id uuid;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002'; END IF;
  SELECT id INTO request_id FROM public.dsr_requests
    WHERE user_id = p_user_id AND request_type = 'erasure' AND status IN ('pending', 'in_progress')
    ORDER BY created_at, id LIMIT 1;
  IF request_id IS NULL THEN
    INSERT INTO public.dsr_requests(user_id, requested_by, request_type, status, notes)
    VALUES(p_user_id, p_user_id, 'erasure', 'pending',
      'Automatic erasure paused for financial retention or shared organization review. Assess eligible erasure, anonymisation and applicable retention; do not treat this hold as a retention schedule.')
    RETURNING id INTO request_id;
  END IF;
  RETURN request_id;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_account_erasure_review(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_account_erasure_review(uuid) TO service_role;
