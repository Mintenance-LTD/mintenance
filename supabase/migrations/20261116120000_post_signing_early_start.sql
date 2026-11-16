-- A later express request is separate evidence; never overwrite signatures or dates.
CREATE TABLE public.contract_early_start_requests (
  contract_id uuid PRIMARY KEY REFERENCES public.contracts(id),
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  policy_version text NOT NULL REFERENCES public.customer_policy_documents(version),
  contract_snapshot jsonb NOT NULL,
  full_performance_acknowledged boolean NOT NULL,
  early_start_wording text NOT NULL,
  full_performance_wording text NOT NULL
);
ALTER TABLE public.contract_early_start_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contract_early_start_requests FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.contract_early_start_requests TO service_role;
CREATE INDEX contract_early_start_requests_requested_by_idx ON public.contract_early_start_requests(requested_by);
CREATE INDEX contract_early_start_requests_policy_version_idx ON public.contract_early_start_requests(policy_version);

CREATE FUNCTION public.request_contract_early_start(p_contract uuid, p_customer uuid, p_legal jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE c public.contracts%ROWTYPE; j public.jobs%ROWTYPE; snapshot jsonb;
  receipt public.contract_early_start_requests%ROWTYPE;
BEGIN
  -- Match the job -> contract lock order used by signing and work-start transitions.
  SELECT * INTO j FROM public.jobs WHERE id=(SELECT job_id FROM public.contracts WHERE id=p_contract) FOR UPDATE;
  SELECT * INTO c FROM public.contracts WHERE id=p_contract FOR UPDATE;
  IF c.id IS NULL OR p_customer IS NULL OR (p_customer IS DISTINCT FROM c.homeowner_id AND p_customer IS DISTINCT FROM j.payer_user_id) THEN
    RAISE EXCEPTION 'Customer access required' USING ERRCODE='42501';
  END IF;
  IF c.status<>'accepted' OR j.status<>'assigned' OR c.cancellation_requested_at IS NOT NULL OR c.cancellation_deadline IS NULL OR now()>=c.cancellation_deadline THEN
    RAISE EXCEPTION 'Agreement is not eligible for an early-start request' USING ERRCODE='23514';
  END IF;
  IF p_legal->>'termsVersion' IS DISTINCT FROM '2026-11-03' OR p_legal->'termsAccepted' IS DISTINCT FROM 'true'::jsonb OR
    p_legal->'earlyStartRequested' IS DISTINCT FROM 'true'::jsonb OR jsonb_typeof(p_legal->'fullPerformanceAcknowledged') IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'Review the terms and expressly request an early start' USING ERRCODE='23514';
  END IF;
  snapshot:=public.contract_review_snapshot(c.id);
  IF p_legal->>'expectedReviewToken' IS DISTINCT FROM md5(snapshot::text) OR
    (p_legal->>'expectedUpdatedAt')::timestamptz IS DISTINCT FROM c.updated_at THEN
    RAISE EXCEPTION 'Agreement changed; refresh and review it again' USING ERRCODE='23514';
  END IF;
  INSERT INTO public.contract_early_start_requests(contract_id, requested_by, policy_version, contract_snapshot, full_performance_acknowledged, early_start_wording, full_performance_wording)
  VALUES(c.id,p_customer,'2026-11-03',snapshot,(p_legal->>'fullPerformanceAcknowledged')::boolean,
    'I expressly request that the contractor starts the agreed service before the end of my 14-day cancellation period. If I cancel after it starts, I understand that I may have to pay a proportionate amount for the service supplied before cancellation, where the law allows.',
    'I understand that, once the service has been fully performed following my express request, I will lose the cancellation right where the legal conditions for this are met.')
  ON CONFLICT(contract_id) DO NOTHING;
  SELECT * INTO STRICT receipt FROM public.contract_early_start_requests WHERE contract_id=c.id;
  INSERT INTO public.customer_communication_outbox(event_key,recipient_id,recipient_email,channel,subject,body,action_url)
  SELECT 'early-start-request:'||c.id||':'||p.id,p.id,p.email,'email','Early start requested for your Mintenance agreement',
    'The customer recorded a separate early-start request. Original signatures, agreed price and cancellation deadline are unchanged.'||E'\nRequested at: '||receipt.requested_at||E'\nCancellation deadline: '||c.cancellation_deadline||E'\n'||receipt.early_start_wording||E'\nFull-performance acknowledgement: '||receipt.full_performance_acknowledged||E'\n'||receipt.full_performance_wording||E'\n\n'||jsonb_pretty(receipt.contract_snapshot),
    '/jobs/'||c.job_id
  FROM public.profiles p WHERE p.id IN (p_customer,c.contractor_id) ON CONFLICT(event_key) DO NOTHING;
  RETURN to_jsonb(receipt);
END $$;
REVOKE ALL ON FUNCTION public.request_contract_early_start(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_contract_early_start(uuid,uuid,jsonb) TO service_role;
-- The snapshot function remains internal; the new invoker function needs its existing service role.
GRANT EXECUTE ON FUNCTION public.contract_review_snapshot(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_customer_work_start() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.contracts%ROWTYPE;
BEGIN
 IF NEW.status='in_progress' AND OLD.status IS DISTINCT FROM 'in_progress' THEN
  SELECT * INTO c FROM public.contracts WHERE job_id=NEW.id AND status='accepted' ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF c.id IS NULL OR c.cancellation_requested_at IS NOT NULL THEN RAISE EXCEPTION 'An accepted agreement without a pending cancellation is required' USING ERRCODE='23514'; END IF;
  IF c.cancellation_deadline IS NULL THEN RAISE EXCEPTION 'Legacy agreement requires cancellation-information review before starting' USING ERRCODE='23514'; END IF;
  IF now()<c.cancellation_deadline AND
    NOT EXISTS(SELECT 1 FROM public.contract_consents WHERE contract_id=c.id AND signer_role='homeowner' AND early_start_requested) AND
    NOT EXISTS(SELECT 1 FROM public.contract_early_start_requests WHERE contract_id=c.id) THEN
    RAISE EXCEPTION 'Wait until the cancellation deadline or obtain the customer early-start request' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
