-- Preserve exact payment identity without granting clients a mutable association.
-- Legacy disputes remain unbound until their payment association is reconciled;
-- do not infer it from a job that may have several escrows.
CREATE TABLE public.dispute_escrow_links (
 dispute_id uuid PRIMARY KEY REFERENCES public.disputes(id) ON DELETE CASCADE,
 escrow_id uuid NOT NULL REFERENCES public.escrow_transactions(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dispute_escrow_links_escrow_idx ON public.dispute_escrow_links(escrow_id);
ALTER TABLE public.dispute_escrow_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dispute_escrow_links FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.dispute_escrow_links TO service_role;

CREATE OR REPLACE FUNCTION public.create_dispute_atomic(
 p_escrow_id uuid,p_raised_by uuid,p_against uuid,p_reason text,p_description text
) RETURNS TABLE(dispute_id uuid,job_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.escrow_transactions%ROWTYPE; j public.jobs%ROWTYPE; existing_id uuid; target_job uuid;
BEGIN
 SELECT x.job_id INTO target_job FROM public.escrow_transactions x WHERE x.id=p_escrow_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO j FROM public.jobs WHERE id=target_job FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR e.job_id IS DISTINCT FROM j.id THEN RAISE EXCEPTION 'Escrow changed' USING ERRCODE='23514'; END IF;
 IF p_raised_by IS NULL OR (p_raised_by IS DISTINCT FROM e.payer_id AND p_raised_by IS DISTINCT FROM e.payee_id) THEN
 RAISE EXCEPTION 'Not authorized to dispute escrow' USING ERRCODE='42501'; END IF;
 IF p_against IS NULL OR p_against=p_raised_by OR (p_against IS DISTINCT FROM e.payer_id AND p_against IS DISTINCT FROM e.payee_id) THEN
 RAISE EXCEPTION 'Invalid dispute participant' USING ERRCODE='23514'; END IF;
 IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 1 AND 2000 OR p_description IS NULL OR length(p_description)>60000 THEN
 RAISE EXCEPTION 'Invalid dispute details' USING ERRCODE='23514'; END IF;
 IF e.status='disputed' THEN
 SELECT d.id INTO existing_id FROM public.disputes d JOIN public.dispute_escrow_links l ON l.dispute_id=d.id
  WHERE l.escrow_id=e.id AND d.job_id=j.id AND d.raised_by=p_raised_by
  AND d.against=p_against AND d.reason=p_reason AND d.description=p_description
  AND d.status IN('open','under_review','pending') ORDER BY d.created_at DESC,d.id DESC LIMIT 1;
 IF FOUND THEN RETURN QUERY SELECT existing_id,j.id; RETURN; END IF;
 END IF;
 IF e.status NOT IN('held','awaiting_homeowner_approval') THEN
 RAISE EXCEPTION 'Escrow is not eligible for a new dispute' USING ERRCODE='23514'; END IF;
 UPDATE public.escrow_transactions SET status='disputed',admin_hold_status='pending_review',auto_approval_date=NULL,auto_release_date=NULL,
  sla_deadline=NULL,dispute_priority=NULL,escalation_level=0,
  release_blocked_reason='Dispute requires resolution',updated_at=now() WHERE id=e.id;
 INSERT INTO public.disputes(job_id,raised_by,against,reason,description,status)
 VALUES(j.id,p_raised_by,p_against,p_reason,p_description,'open') RETURNING id INTO existing_id;
 INSERT INTO public.dispute_escrow_links(dispute_id,escrow_id) VALUES(existing_id,e.id);
 RETURN QUERY SELECT existing_id,j.id;
END $$;
REVOKE ALL ON FUNCTION public.create_dispute_atomic(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_dispute_atomic(uuid,uuid,uuid,text,text) TO service_role;

