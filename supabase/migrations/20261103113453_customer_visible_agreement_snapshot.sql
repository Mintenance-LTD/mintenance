-- Archive only customer-visible proposal fields, excluding private quote notes.
CREATE OR REPLACE FUNCTION public.contract_review_snapshot(p_contract uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object('contract',to_jsonb(c),'quote',CASE WHEN q.id IS NULL THEN NULL ELSE
  jsonb_build_object('id',q.id,'subtotal',q.subtotal,'tax_rate',q.tax_rate,'tax_amount',q.tax_amount,'total_amount',q.total_amount,'line_items',q.line_items,'terms',q.terms,'quote_number',q.quote_number,'valid_until',q.valid_until) END,
  'bid',CASE WHEN b.id IS NULL THEN NULL ELSE jsonb_build_object('id',b.id,'quote_id',b.quote_id,'message',b.message,'description',b.description,'estimated_duration_days',b.estimated_duration_days,'warranty_months',b.warranty_months,'materials_included',b.materials_included) END)
 FROM public.contracts c LEFT JOIN public.bids b ON b.id::text=c.terms->>'bid_id' AND b.job_id=c.job_id AND b.contractor_id=c.contractor_id
 LEFT JOIN public.contractor_quotes q ON q.id=coalesce(c.quote_id,b.quote_id) WHERE c.id=p_contract
$$;

ALTER TABLE public.contracts ADD COLUMN cancellation_information_provided_at timestamptz;
CREATE FUNCTION public.review_legacy_cancellation(p_contract uuid,p_customer uuid,p_legal jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.contracts%ROWTYPE; j public.jobs%ROWTYPE; doc text;
BEGIN
 SELECT * INTO j FROM public.jobs WHERE id=(SELECT job_id FROM public.contracts WHERE id=p_contract) FOR UPDATE;
 SELECT * INTO c FROM public.contracts WHERE id=p_contract FOR UPDATE;
 IF c.id IS NULL OR (p_customer IS DISTINCT FROM c.homeowner_id AND p_customer IS DISTINCT FROM j.payer_user_id) THEN RAISE EXCEPTION 'Customer access required' USING ERRCODE='42501'; END IF;
 IF c.status<>'accepted' OR c.cancellation_deadline IS NOT NULL OR c.cancellation_requested_at IS NOT NULL OR j.status<>'assigned' THEN RAISE EXCEPTION 'This agreement is not eligible for an information review' USING ERRCODE='23514'; END IF;
 PERFORM public.record_contract_consent(c.id,p_customer,p_legal);
 -- Give a fresh review period when information was previously missing. Do not
 -- fabricate a past formation date or rewrite existing signature evidence.
 UPDATE public.contracts SET cancellation_information_provided_at=now(),cancellation_deadline=((now() AT TIME ZONE 'Europe/London')::date+15)::timestamp AT TIME ZONE 'Europe/London' WHERE id=c.id RETURNING * INTO c;
 SELECT body INTO STRICT doc FROM public.customer_policy_documents WHERE version='2026-11-03';
 INSERT INTO public.customer_communication_outbox(event_key,recipient_id,recipient_email,channel,subject,body,action_url)
  SELECT 'legacy-cancellation-information:'||c.id||':'||p.id,p.id,p.email,'email','Your existing agreement: cancellation information and choices',
   'This records information provided today; it does not change the original agreement date.'||E'\nInformation provided: '||c.cancellation_information_provided_at||E'\nCancellation deadline (exclusive): '||c.cancellation_deadline||E'\nEarly start requested: '||(p_legal->>'earlyStartRequested')||E'\nFull-performance acknowledgement: '||(p_legal->>'fullPerformanceAcknowledged')||E'\n\n'||jsonb_pretty(public.contract_review_snapshot(c.id))||E'\n\n'||doc,'/jobs/'||c.job_id
  FROM public.profiles p WHERE p.id IN (p_customer,c.contractor_id) ON CONFLICT(event_key) DO NOTHING;
 RETURN to_jsonb(c);
END $$;
REVOKE ALL ON FUNCTION public.review_legacy_cancellation(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_legacy_cancellation(uuid,uuid,jsonb) TO service_role;

CREATE FUNCTION public.guard_cancellation_information() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.cancellation_deadline IS NOT NULL AND NEW.cancellation_deadline IS DISTINCT FROM OLD.cancellation_deadline THEN RAISE EXCEPTION 'Cancellation deadline is immutable' USING ERRCODE='23514'; END IF;
 IF OLD.cancellation_information_provided_at IS NOT NULL AND NEW.cancellation_information_provided_at IS DISTINCT FROM OLD.cancellation_information_provided_at THEN RAISE EXCEPTION 'Information date is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_cancellation_information() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_cancellation_information BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.guard_cancellation_information();
