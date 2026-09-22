CREATE TABLE public.escrow_dispute_resolutions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 escrow_id uuid NOT NULL UNIQUE REFERENCES public.escrow_transactions(id),
 dispute_id uuid NOT NULL UNIQUE REFERENCES public.disputes(id),
 initiated_by uuid NOT NULL REFERENCES public.profiles(id),
 decision text NOT NULL CHECK(decision IN('refund_homeowner','pay_contractor','split_50_50')),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 5 AND 500),
 principal_minor integer NOT NULL CHECK(principal_minor>0),
 refund_minor integer NOT NULL CHECK(refund_minor>=0),
 release_minor integer NOT NULL CHECK(release_minor>=0),
 fee_rate numeric NOT NULL CHECK(fee_rate>=0 AND fee_rate<=1 AND fee_rate<>'NaN'::numeric),
 refund_operation_id uuid REFERENCES public.escrow_refund_operations(id),
 release_operation_id uuid REFERENCES public.escrow_admin_release_operations(id),
 state text NOT NULL DEFAULT 'processing' CHECK(state IN('processing','completed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CHECK(refund_minor+release_minor=principal_minor),
 CHECK((decision='refund_homeowner' AND refund_minor=principal_minor AND release_minor=0) OR
       (decision='pay_contractor' AND refund_minor=0 AND release_minor=principal_minor) OR
       (decision='split_50_50' AND refund_minor=principal_minor/2 AND refund_minor>0 AND release_minor>0))
);
ALTER TABLE public.escrow_dispute_resolutions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.escrow_dispute_resolutions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.escrow_dispute_resolutions TO service_role;

CREATE FUNCTION public.reserve_dispute_resolution(p_admin_id uuid,p_escrow_id uuid,p_decision text,p_reason text,p_fee_rate numeric)
RETURNS SETOF public.escrow_dispute_resolutions LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE e public.escrow_transactions; b public.escrow_refund_balances;
 r public.escrow_dispute_resolutions; job_key uuid; dispute_key uuid; dispute_count integer; principal integer; refund integer;
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=p_admin_id AND role='admin' AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current administrator required' USING ERRCODE='42501'; END IF;
 SELECT job_id INTO job_key FROM public.escrow_transactions WHERE id=p_escrow_id;
 PERFORM 1 FROM public.jobs WHERE id=job_key FOR UPDATE;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Escrow missing' USING ERRCODE='23514'; END IF;
 SELECT * INTO r FROM public.escrow_dispute_resolutions WHERE escrow_id=e.id;
 IF FOUND THEN
  IF r.decision IS DISTINCT FROM p_decision OR r.reason IS DISTINCT FROM p_reason THEN
   RAISE EXCEPTION 'Resolution decision changed; recover the existing resolution' USING ERRCODE='23514'; END IF;
  RETURN NEXT r; RETURN;
 END IF;
 IF e.status<>'disputed' OR p_decision IS NULL OR p_decision NOT IN('refund_homeowner','pay_contractor','split_50_50') OR
    p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 5 AND 500 OR
    p_fee_rate IS NULL OR p_fee_rate<0 OR p_fee_rate>1 OR p_fee_rate='NaN'::numeric THEN
  RAISE EXCEPTION 'Dispute is not available for resolution' USING ERRCODE='23514'; END IF;
 SELECT count(*),(array_agg(d.id))[1] INTO dispute_count,dispute_key
 FROM public.disputes d JOIN public.dispute_escrow_links l ON l.dispute_id=d.id
 WHERE l.escrow_id=e.id AND d.job_id=e.job_id AND d.status IN('open','under_review','escalated');
 IF dispute_count<>1 THEN RAISE EXCEPTION 'Dispute payment association requires reconciliation' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT FROM public.escrow_transfer_attempts WHERE escrow_id=e.id) OR
    EXISTS(SELECT FROM public.escrow_admin_release_operations WHERE escrow_id=e.id) OR
    EXISTS(SELECT FROM public.escrow_refund_operations WHERE escrow_id=e.id AND state IN('reserved','pending','requires_action','reconciliation_required')) THEN
  RAISE EXCEPTION 'Existing settlement requires recovery' USING ERRCODE='23514'; END IF;
 SELECT * INTO b FROM public.escrow_refund_balances WHERE escrow_id=e.id;
 IF FOUND THEN
  IF b.needs_review OR b.gross_minor<>round(e.amount*100) THEN RAISE EXCEPTION 'Payment balance requires reconciliation' USING ERRCODE='23514'; END IF;
  principal:=b.remaining_minor;
 ELSE principal:=round(e.amount*100); END IF;
 IF principal IS NULL OR principal<=0 OR (p_decision='split_50_50' AND principal<2) THEN
  RAISE EXCEPTION 'Insufficient remaining principal' USING ERRCODE='23514'; END IF;
 refund:=CASE p_decision WHEN 'refund_homeowner' THEN principal WHEN 'split_50_50' THEN principal/2 ELSE 0 END;
 INSERT INTO public.escrow_dispute_resolutions(escrow_id,dispute_id,initiated_by,decision,reason,principal_minor,refund_minor,release_minor,fee_rate)
 VALUES(e.id,dispute_key,p_admin_id,p_decision,p_reason,principal,refund,principal-refund,p_fee_rate) RETURNING * INTO r;
 UPDATE public.escrow_transactions SET admin_hold_status='admin_hold',admin_hold_by=p_admin_id,
  admin_hold_reason=p_reason,admin_hold_at=now(),updated_at=now() WHERE id=e.id;
 RETURN NEXT r;
END $$;
REVOKE ALL ON FUNCTION public.reserve_dispute_resolution(uuid,uuid,text,text,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_dispute_resolution(uuid,uuid,text,text,numeric) TO service_role;
