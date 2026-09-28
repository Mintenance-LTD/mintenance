CREATE TABLE public.retained_dispute_records (
 dispute_id uuid PRIMARY KEY, escrow_id uuid, job_id uuid NOT NULL,
 participant_ids uuid[] NOT NULL, claimant_id uuid, evidence jsonb NOT NULL,
 archived_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 review_due_at timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '30 days'),
 retention_reason text NOT NULL DEFAULT 'dispute_evidence_review',
 requires_retention_review boolean NOT NULL DEFAULT true
);
CREATE INDEX retained_dispute_escrow_idx ON public.retained_dispute_records(escrow_id,archived_at DESC);
CREATE INDEX retained_dispute_participants_idx ON public.retained_dispute_records USING gin(participant_ids);
ALTER TABLE public.retained_dispute_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.retained_dispute_records FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.retained_dispute_records TO service_role;
CREATE TABLE public.retained_dispute_access_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 dispute_id uuid NOT NULL, actor_id uuid NOT NULL, accessed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.retained_dispute_access_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.retained_dispute_access_log FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.retained_dispute_access_log TO service_role;

-- Parent triggers run before FK cascades can destroy payment bindings or parties.
-- Deliberately no archive foreign keys back to erasable application records.
CREATE FUNCTION public.archive_disputes_before_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 INSERT INTO public.retained_dispute_records(dispute_id,escrow_id,job_id,participant_ids,claimant_id,evidence)
 SELECT d.id,e.id,d.job_id,
  ARRAY(SELECT DISTINCT actor FROM unnest(ARRAY[e.payer_id,e.payee_id,j.homeowner_id,j.contractor_id]) actor WHERE actor IS NOT NULL),
  d.raised_by,jsonb_build_object('id',e.id,'job_id',d.job_id,'payer_id',e.payer_id,'payee_id',e.payee_id,
   'amount',e.amount,'status','archived','original_status',e.status,'priority',e.dispute_priority,
   'dispute_record_id',d.id,'dispute_reason',d.reason,'description',d.description,
   'resolution',d.resolution,'resolved_at',d.resolved_at,'created_at',d.created_at,'raised_by',d.raised_by)
 FROM public.disputes d LEFT JOIN public.dispute_escrow_links l ON l.dispute_id=d.id
 LEFT JOIN public.escrow_transactions e ON e.id=l.escrow_id LEFT JOIN public.jobs j ON j.id=d.job_id
 WHERE (TG_TABLE_NAME='profiles' AND OLD.id=ANY(ARRAY[e.payer_id,e.payee_id,j.homeowner_id,d.raised_by,d.against]))
 OR (TG_TABLE_NAME='jobs' AND d.job_id=OLD.id)
 OR (TG_TABLE_NAME='escrow_transactions' AND e.id=OLD.id)
 OR (TG_TABLE_NAME='disputes' AND d.id=OLD.id)
 ON CONFLICT(dispute_id) DO NOTHING;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.archive_disputes_before_delete() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER archive_disputes_before_delete BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.archive_disputes_before_delete();
CREATE TRIGGER archive_disputes_before_delete BEFORE DELETE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.archive_disputes_before_delete();
CREATE TRIGGER archive_disputes_before_delete BEFORE DELETE ON public.escrow_transactions FOR EACH ROW EXECUTE FUNCTION public.archive_disputes_before_delete();
CREATE TRIGGER archive_disputes_before_delete BEFORE DELETE ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.archive_disputes_before_delete();

CREATE FUNCTION public.read_retained_dispute(p_escrow_id uuid,p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.retained_dispute_records%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user_id AND deleted_at IS NULL) THEN
  RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.retained_dispute_records WHERE escrow_id=p_escrow_id
  AND p_user_id=ANY(participant_ids) ORDER BY archived_at DESC,dispute_id LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 INSERT INTO public.retained_dispute_access_log(dispute_id,actor_id) VALUES(r.dispute_id,p_user_id);
 RETURN r.evidence || jsonb_build_object('archived',true,'archived_at',r.archived_at,
  'review_due_at',r.review_due_at,'requires_retention_review',r.requires_retention_review);
END $$;
REVOKE ALL ON FUNCTION public.read_retained_dispute(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_retained_dispute(uuid,uuid) TO service_role;
COMMENT ON TABLE public.retained_dispute_records IS 'Restricted dispute deletion archive; due dates require retention review, not automatic deletion. Unbound legacy disputes require separate reconciliation.';
