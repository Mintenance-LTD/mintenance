-- No existing evidence is scheduled or deleted by this migration.
-- An operator must classify the record and approve a separate disposal decision.
CREATE TABLE public.evidence_disposal_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 record_kind text NOT NULL CHECK(record_kind IN ('contract','dispute')),
 record_id uuid NOT NULL,
 review_revision integer NOT NULL CHECK(review_revision>0),
 scheduled_for timestamptz NOT NULL,
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 10 AND 1000),
 inventory_reference text NOT NULL CHECK(length(btrim(inventory_reference)) BETWEEN 5 AND 200),
 requested_by uuid NOT NULL,
 cancelled_by uuid,
 requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','needs_reconciliation','cancelled','completed')),
 outcome_code text,
 finished_at timestamptz,
 audit_review_due_at timestamptz
);
CREATE UNIQUE INDEX evidence_disposal_active_record_idx ON public.evidence_disposal_requests(record_kind,record_id)
 WHERE status IN ('scheduled','needs_reconciliation');
CREATE INDEX evidence_disposal_due_idx ON public.evidence_disposal_requests(scheduled_for,id) WHERE status='scheduled';
ALTER TABLE public.evidence_disposal_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.evidence_disposal_requests FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.evidence_disposal_requests TO service_role;

CREATE FUNCTION public.schedule_retained_evidence_disposal(p_admin_id uuid,p_kind text,p_record_id uuid,
 p_expected_revision integer,p_scheduled_for timestamptz,p_reason text,p_inventory_reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.evidence_retention_reviews%ROWTYPE; existing public.evidence_disposal_requests%ROWTYPE; result uuid; needs_review boolean; retain_until timestamptz;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_admin_id AND role='admin' AND deleted_at IS NULL) THEN
  RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 IF p_kind IS NULL OR p_kind NOT IN ('contract','dispute') OR p_expected_revision IS NULL OR p_expected_revision<1
  OR p_scheduled_for IS NULL
  OR p_scheduled_for>clock_timestamp()+interval '10 years'
  OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 1000
  OR p_inventory_reference IS NULL OR length(btrim(p_inventory_reference)) NOT BETWEEN 5 AND 200 THEN
  RAISE EXCEPTION 'Invalid disposal decision' USING ERRCODE='22023'; END IF;
 -- Same first lock as review/hold decisions. Never lock a queue row before its source.
 IF p_kind='contract' THEN
  SELECT requires_retention_review,retention_until INTO needs_review,retain_until FROM public.retained_contract_records WHERE contract_id=p_record_id FOR UPDATE;
 ELSE
  SELECT requires_retention_review INTO needs_review FROM public.retained_dispute_records WHERE dispute_id=p_record_id FOR UPDATE;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Record not found' USING ERRCODE='P0002'; END IF;
 IF retain_until IS NOT NULL AND p_scheduled_for<retain_until THEN RAISE EXCEPTION 'Retention period has not ended' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM public.evidence_retention_reviews WHERE record_kind=p_kind AND record_id=p_record_id;
 IF NOT FOUND OR r.revision<>p_expected_revision OR r.legal_hold OR needs_review THEN
  RAISE EXCEPTION 'Review changed or record remains held/unclassified' USING ERRCODE='40001'; END IF;
 SELECT * INTO existing FROM public.evidence_disposal_requests WHERE record_kind=p_kind AND record_id=p_record_id AND status IN ('scheduled','needs_reconciliation') FOR UPDATE;
 IF FOUND THEN
  IF existing.status='scheduled' AND existing.review_revision=p_expected_revision AND existing.scheduled_for=p_scheduled_for
   AND existing.reason=btrim(p_reason) AND existing.inventory_reference=btrim(p_inventory_reference) AND existing.requested_by=p_admin_id THEN
   RETURN existing.id;
  END IF;
  RAISE EXCEPTION 'Disposal decision already exists; reconcile before scheduling again' USING ERRCODE='40001';
 END IF;
 IF p_scheduled_for<clock_timestamp()+interval '24 hours' THEN RAISE EXCEPTION 'Disposal requires 24 hours notice' USING ERRCODE='22023'; END IF;
 INSERT INTO public.evidence_disposal_requests(record_kind,record_id,review_revision,scheduled_for,reason,inventory_reference,requested_by)
 VALUES(p_kind,p_record_id,p_expected_revision,p_scheduled_for,btrim(p_reason),btrim(p_inventory_reference),p_admin_id) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.schedule_retained_evidence_disposal(uuid,text,uuid,integer,timestamptz,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_retained_evidence_disposal(uuid,text,uuid,integer,timestamptz,text,text) TO service_role;

CREATE FUNCTION public.cancel_retained_evidence_disposal(p_admin_id uuid,p_kind text,p_record_id uuid,p_request_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_admin_id AND role='admin' AND deleted_at IS NULL) THEN
  RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 IF p_kind='contract' THEN
  PERFORM 1 FROM public.retained_contract_records WHERE contract_id=p_record_id FOR UPDATE;
 ELSIF p_kind='dispute' THEN
  PERFORM 1 FROM public.retained_dispute_records WHERE dispute_id=p_record_id FOR UPDATE;
 ELSE RAISE EXCEPTION 'Invalid record kind' USING ERRCODE='22023'; END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Record not found' USING ERRCODE='P0002'; END IF;
 UPDATE public.evidence_disposal_requests SET status='cancelled',cancelled_by=p_admin_id,outcome_code='staff_cancelled',finished_at=clock_timestamp(),
  audit_review_due_at=clock_timestamp()+interval '2 years'
 WHERE id=p_request_id AND record_kind=p_kind AND record_id=p_record_id AND status IN ('scheduled','needs_reconciliation');
 IF FOUND THEN RETURN true; END IF;
 RETURN EXISTS(SELECT 1 FROM public.evidence_disposal_requests WHERE id=p_request_id AND record_kind=p_kind AND record_id=p_record_id AND status='cancelled');
END $$;
REVOKE ALL ON FUNCTION public.cancel_retained_evidence_disposal(uuid,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_retained_evidence_disposal(uuid,text,uuid,uuid) TO service_role;

-- This worker intentionally handles database-contained evidence only. Object/processor
-- references are held for reconciliation; SQL deletion of storage.objects is forbidden.
-- Every item executes in one database transaction: no lease can outlive the hold check.
CREATE FUNCTION public.process_retained_evidence_disposals(p_limit integer DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE candidate record; q public.evidence_disposal_requests%ROWTYPE; r public.evidence_retention_reviews%ROWTYPE;
 payload jsonb; job_key uuid; requires_review boolean; retain_until timestamptz; code text; processed integer:=0; completed integer:=0; blocked integer:=0; cancelled integer:=0;
BEGIN
 IF p_limit IS NULL OR p_limit<1 OR p_limit>25 THEN RAISE EXCEPTION 'Invalid batch size' USING ERRCODE='22023'; END IF;
 FOR candidate IN SELECT id,record_kind,record_id FROM public.evidence_disposal_requests
  WHERE status='scheduled' AND scheduled_for<=clock_timestamp() ORDER BY scheduled_for,id LIMIT p_limit LOOP
  payload:=NULL; code:=NULL; job_key:=NULL; requires_review:=true; retain_until:=NULL;
  IF candidate.record_kind='contract' THEN
   SELECT evidence,job_id,requires_retention_review,retention_until INTO payload,job_key,requires_review,retain_until FROM public.retained_contract_records
    WHERE contract_id=candidate.record_id FOR UPDATE SKIP LOCKED;
  ELSE
   SELECT evidence,job_id,requires_retention_review INTO payload,job_key,requires_review FROM public.retained_dispute_records
    WHERE dispute_id=candidate.record_id FOR UPDATE SKIP LOCKED;
  END IF;
  -- Missing and currently locked source rows are never interpreted as erased.
  IF NOT FOUND THEN
   IF NOT EXISTS(SELECT 1 FROM public.retained_contract_records WHERE contract_id=candidate.record_id AND candidate.record_kind='contract'
    UNION ALL SELECT 1 FROM public.retained_dispute_records WHERE dispute_id=candidate.record_id AND candidate.record_kind='dispute') THEN
    UPDATE public.evidence_disposal_requests SET status='needs_reconciliation',outcome_code='archive_missing'
     WHERE id=candidate.id AND status='scheduled';
    IF FOUND THEN processed:=processed+1; blocked:=blocked+1; END IF;
   END IF;
   CONTINUE;
  END IF;
  SELECT * INTO q FROM public.evidence_disposal_requests WHERE id=candidate.id AND status='scheduled'
   AND scheduled_for<=clock_timestamp() FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN CONTINUE; END IF;
  processed:=processed+1;
  SELECT * INTO r FROM public.evidence_retention_reviews WHERE record_kind=q.record_kind AND record_id=q.record_id;
  IF NOT FOUND OR r.revision<>q.review_revision OR r.legal_hold OR requires_review THEN
   UPDATE public.evidence_disposal_requests SET status='cancelled',outcome_code='review_changed_or_held',finished_at=clock_timestamp(),
    audit_review_due_at=clock_timestamp()+interval '2 years' WHERE id=q.id;
   cancelled:=cancelled+1; CONTINUE;
  END IF;
  IF retain_until IS NOT NULL AND retain_until>clock_timestamp() THEN code:='retention_period_not_ended';
  ELSIF EXISTS(SELECT 1 FROM public.jobs WHERE id=job_key)
   OR EXISTS(SELECT 1 FROM public.contracts WHERE id=q.record_id AND q.record_kind='contract')
   OR EXISTS(SELECT 1 FROM public.disputes WHERE id=q.record_id AND q.record_kind='dispute') THEN code:='source_still_active';
  ELSIF q.record_kind='contract' AND (payload->>'version' IS DISTINCT FROM '1' OR jsonb_typeof(payload->'contract') IS DISTINCT FROM 'object') THEN code:='unclassified_evidence';
  ELSIF q.record_kind='dispute' AND (payload->>'resolved_at' IS NULL OR payload->>'resolution' IS NULL) THEN code:='unresolved_dispute';
  -- Conservative reconciliation: even unfamiliar links in notes must be inventoried.
  -- Inline SVG namespace URLs can also require manual review; false erasure is worse.
  ELSIF payload::text ~* '(https?://|job-attachments:|/storage/|"(storage_path|bucket|file_path|attachment)[^"]*"[[:space:]]*:)' THEN code:='external_evidence_requires_reconciliation';
  END IF;
  IF code IS NOT NULL THEN
   UPDATE public.evidence_disposal_requests SET status='needs_reconciliation',outcome_code=code WHERE id=q.id;
   blocked:=blocked+1; CONTINUE;
  END IF;
  IF q.record_kind='contract' THEN DELETE FROM public.retained_contract_records WHERE contract_id=q.record_id;
  ELSE DELETE FROM public.retained_dispute_records WHERE dispute_id=q.record_id; END IF;
  -- Keep the minimal decision/tombstone, never a copy of the erased evidence.
  UPDATE public.evidence_disposal_requests SET status='completed',outcome_code='database_evidence_removed',finished_at=clock_timestamp(),
   audit_review_due_at=clock_timestamp()+interval '2 years' WHERE id=q.id;
  completed:=completed+1;
 END LOOP;
 RETURN jsonb_build_object('processed',processed,'completed',completed,'needsReconciliation',blocked,'cancelled',cancelled);
END $$;
REVOKE ALL ON FUNCTION public.process_retained_evidence_disposals(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_retained_evidence_disposals(integer) TO service_role;
COMMENT ON TABLE public.evidence_disposal_requests IS 'Explicitly approved disposal decisions. Completed refers only to the archived database evidence, not backups or processor copies. External evidence requires reconciliation; no automatic review-date expiry.';
