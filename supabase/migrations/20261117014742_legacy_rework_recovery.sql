CREATE TABLE public.legacy_rework_recoveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 rework_id uuid NOT NULL UNIQUE REFERENCES public.job_rework_requests(id),
 job_id uuid NOT NULL REFERENCES public.jobs(id),
 escrow_id uuid NOT NULL REFERENCES public.escrow_transactions(id),
 contractor_id uuid NOT NULL REFERENCES public.profiles(id),
 previous_completed_at timestamptz,
 recovered_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legacy_rework_recoveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legacy_rework_recoveries FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.legacy_rework_recoveries TO service_role;
CREATE INDEX legacy_rework_recoveries_job ON public.legacy_rework_recoveries(job_id);

CREATE FUNCTION public.recover_legacy_rework(p_actor uuid,p_job uuid,p_rework uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE j public.jobs; r public.job_rework_requests; e public.escrow_transactions;
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=p_actor AND role='contractor' AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current contractor required' USING ERRCODE='42501'; END IF;
 SELECT * INTO j FROM public.jobs WHERE id=p_job FOR UPDATE;
 IF NOT FOUND OR j.contractor_id IS DISTINCT FROM p_actor THEN RAISE EXCEPTION 'Job unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.job_rework_requests WHERE job_id=p_job ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR r.id IS DISTINCT FROM p_rework THEN RAISE EXCEPTION 'Rework cycle changed' USING ERRCODE='40001'; END IF;
 IF EXISTS(SELECT FROM public.legacy_rework_recoveries WHERE rework_id=r.id) THEN RETURN false; END IF;
 IF j.status IS DISTINCT FROM 'completed' OR j.completion_confirmed_by_homeowner IS TRUE OR r.submitted_at IS NOT NULL THEN
  RAISE EXCEPTION 'Only an unapproved legacy rework submission can be reopened' USING ERRCODE='23514'; END IF;
 SELECT * INTO e FROM public.escrow_transactions WHERE job_id=j.id ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR e.status NOT IN('held','awaiting_homeowner_approval') OR e.homeowner_approval IS TRUE OR
    EXISTS(SELECT FROM public.disputes WHERE job_id=j.id AND status IN('open','under_review','escalated')) OR
    EXISTS(SELECT FROM public.escrow_transfer_attempts WHERE escrow_id=e.id) OR
    EXISTS(SELECT FROM public.escrow_admin_release_operations WHERE escrow_id=e.id) OR
    EXISTS(SELECT FROM public.escrow_dispute_resolutions WHERE escrow_id=e.id) OR
    EXISTS(SELECT FROM public.escrow_refund_operations WHERE escrow_id=e.id AND state IN('reserved','pending','requires_action','reconciliation_required')) OR
    EXISTS(SELECT FROM public.escrow_refund_balances WHERE escrow_id=e.id AND needs_review) THEN
  RAISE EXCEPTION 'Payment or dispute requires review; recovery is unavailable' USING ERRCODE='23514'; END IF;
 INSERT INTO public.legacy_rework_recoveries(rework_id,job_id,escrow_id,contractor_id,previous_completed_at)
 VALUES(r.id,j.id,e.id,p_actor,j.completed_at);
 UPDATE public.escrow_transactions SET status='held',auto_approval_date=NULL,auto_release_date=NULL,cooling_off_ends_at=NULL,
  release_blocked_reason=coalesce(release_blocked_reason,'Rework requested; completion must be reviewed again'),updated_at=now() WHERE id=e.id;
 PERFORM set_config('mintenance.rework_job',j.id::text,true);
 UPDATE public.jobs SET status='in_progress',completed_at=NULL,updated_at=now() WHERE id=j.id;
 PERFORM set_config('mintenance.rework_job','',true);
 -- Keep the original cycle/evidence boundary, independent admin holds, signed terms
 -- and all payment balances. The normal explicit submission/evidence guard now applies.
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.recover_legacy_rework(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.recover_legacy_rework(uuid,uuid,uuid) TO service_role;
