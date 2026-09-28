-- Review decisions never erase evidence. Disposal requires a separate verified workflow.
CREATE TABLE public.evidence_retention_reviews (
 record_kind text NOT NULL CHECK(record_kind IN ('contract','dispute')),
 record_id uuid NOT NULL,
 revision integer NOT NULL DEFAULT 1,
 legal_hold boolean NOT NULL DEFAULT false,
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 10 AND 1000),
 review_due_at timestamptz NOT NULL,
 reviewed_by uuid NOT NULL,
 reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(record_kind,record_id)
);
CREATE TABLE public.evidence_retention_review_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 record_kind text NOT NULL, record_id uuid NOT NULL, revision integer NOT NULL,
 legal_hold boolean NOT NULL, reason text NOT NULL, review_due_at timestamptz NOT NULL,
 actor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.evidence_retention_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_retention_review_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.evidence_retention_reviews,public.evidence_retention_review_log FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.evidence_retention_reviews,public.evidence_retention_review_log TO service_role;

CREATE FUNCTION public.review_retained_evidence(p_admin_id uuid,p_kind text,p_record_id uuid,
 p_expected_revision integer,p_legal_hold boolean,p_reason text,p_review_due_at timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE current_revision integer; next_revision integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_admin_id AND role='admin' AND deleted_at IS NULL) THEN
  RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 IF p_kind IS NULL OR p_kind NOT IN ('contract','dispute') OR p_expected_revision IS NULL OR p_expected_revision<0
  OR p_legal_hold IS NULL OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 1000
  OR p_review_due_at IS NULL OR p_review_due_at<=clock_timestamp() OR p_review_due_at>clock_timestamp()+interval '366 days'
  OR (p_legal_hold AND p_review_due_at>clock_timestamp()+interval '90 days') THEN
  RAISE EXCEPTION 'Invalid review decision' USING ERRCODE='22023'; END IF;
 -- Lock the immutable source even for the first review: concurrent first decisions serialize.
 IF p_kind='contract' THEN
  PERFORM 1 FROM public.retained_contract_records WHERE contract_id=p_record_id FOR UPDATE;
 ELSE
  PERFORM 1 FROM public.retained_dispute_records WHERE dispute_id=p_record_id FOR UPDATE;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Record not found' USING ERRCODE='P0002'; END IF;
 SELECT revision INTO current_revision FROM public.evidence_retention_reviews WHERE record_kind=p_kind AND record_id=p_record_id;
 IF coalesce(current_revision,0)<>p_expected_revision THEN RAISE EXCEPTION 'Review changed; reload' USING ERRCODE='40001'; END IF;
 next_revision:=coalesce(current_revision,0)+1;
 INSERT INTO public.evidence_retention_reviews(record_kind,record_id,revision,legal_hold,reason,review_due_at,reviewed_by)
 VALUES(p_kind,p_record_id,next_revision,p_legal_hold,btrim(p_reason),p_review_due_at,p_admin_id)
 ON CONFLICT(record_kind,record_id) DO UPDATE SET revision=excluded.revision,legal_hold=excluded.legal_hold,
  reason=excluded.reason,review_due_at=excluded.review_due_at,reviewed_by=excluded.reviewed_by,reviewed_at=clock_timestamp();
 INSERT INTO public.evidence_retention_review_log(record_kind,record_id,revision,legal_hold,reason,review_due_at,actor_id)
 VALUES(p_kind,p_record_id,next_revision,p_legal_hold,btrim(p_reason),p_review_due_at,p_admin_id);
 IF p_kind='contract' THEN
  UPDATE public.retained_contract_records SET requires_retention_review=false,review_due_at=p_review_due_at WHERE contract_id=p_record_id;
 ELSE
  UPDATE public.retained_dispute_records SET requires_retention_review=false,review_due_at=p_review_due_at WHERE dispute_id=p_record_id;
 END IF;
 RETURN next_revision;
END $$;
REVOKE ALL ON FUNCTION public.review_retained_evidence(uuid,text,uuid,integer,boolean,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_retained_evidence(uuid,text,uuid,integer,boolean,text,timestamptz) TO service_role;
