ALTER TABLE public.escrow_dispute_resolutions
 ADD COLUMN recovery_token uuid,
 ADD COLUMN recovery_lease_until timestamptz,
 ADD COLUMN recovery_attempts integer NOT NULL DEFAULT 0 CHECK(recovery_attempts>=0),
 ADD COLUMN recovery_after timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN recovery_error text CHECK(recovery_error IN('provider_unavailable','reconciliation_required'));
CREATE INDEX escrow_dispute_resolution_recovery_due ON public.escrow_dispute_resolutions(recovery_after,created_at)
 WHERE state='processing';

CREATE FUNCTION public.claim_dispute_resolution_recovery() RETURNS SETOF public.escrow_dispute_resolutions
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE selected_id uuid;
BEGIN
 SELECT id INTO selected_id FROM public.escrow_dispute_resolutions
 WHERE state='processing'
 AND created_at<clock_timestamp()-interval '2 minutes'
 AND recovery_after<=clock_timestamp()
 AND (recovery_lease_until IS NULL OR recovery_lease_until<=clock_timestamp())
 ORDER BY recovery_after,created_at,id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN; END IF;
 RETURN QUERY UPDATE public.escrow_dispute_resolutions
 SET recovery_token=gen_random_uuid(),recovery_lease_until=clock_timestamp()+interval '3 minutes',
 recovery_attempts=recovery_attempts+1 WHERE id=selected_id RETURNING *;
END $$;

CREATE FUNCTION public.finish_dispute_resolution_recovery(p_resolution_id uuid,p_token uuid,p_error text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF p_error IS NOT NULL AND p_error NOT IN('provider_unavailable','reconciliation_required') THEN
  RAISE EXCEPTION 'Invalid recovery outcome' USING ERRCODE='23514'; END IF;
 UPDATE public.escrow_dispute_resolutions SET recovery_token=NULL,recovery_lease_until=NULL,
 recovery_error=p_error,recovery_after=clock_timestamp()+
 CASE WHEN p_error IS NULL THEN interval '5 minutes'
 ELSE make_interval(secs=>least(3600,60*power(2,least(recovery_attempts,6))::integer)) END
 WHERE id=p_resolution_id AND recovery_token=p_token AND recovery_lease_until>clock_timestamp();
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_dispute_resolution_recovery() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_dispute_resolution_recovery(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_dispute_resolution_recovery() TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_dispute_resolution_recovery(uuid,uuid,text) TO service_role;
