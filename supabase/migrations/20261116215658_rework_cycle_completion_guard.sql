-- A new cycle needs its own evidence and an explicit assigned-contractor submission.
-- Existing completed jobs, signed agreements and payment dates are not rewritten.
ALTER TABLE public.job_rework_requests ADD COLUMN submitted_at timestamptz;

CREATE FUNCTION public.enforce_rework_completion_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE r public.job_rework_requests%ROWTYPE; n integer; wide boolean; close_up boolean;
BEGIN
  IF NOT (OLD.status='in_progress' AND NEW.status='completed') AND NOT (NEW.completion_confirmed_by_homeowner IS TRUE AND OLD.completion_confirmed_by_homeowner IS DISTINCT FROM TRUE) THEN RETURN NEW; END IF;
  SELECT * INTO r FROM public.job_rework_requests WHERE job_id=NEW.id
    ORDER BY created_at DESC,id DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF OLD.status='in_progress' AND NEW.status='completed' AND current_setting('mintenance.submit_rework',true) IS DISTINCT FROM r.id::text THEN
    RAISE EXCEPTION 'Explicit submission of the current rework cycle is required' USING ERRCODE='23514';
  END IF;
  SELECT count(*),coalesce(bool_or(angle_type='wide'),false),coalesce(bool_or(angle_type='close-up'),false)
    INTO n,wide,close_up FROM (
      SELECT angle_type FROM public.job_photos_metadata WHERE job_id=NEW.id AND photo_type='after'
        AND verified IS TRUE AND created_at>r.created_at FOR SHARE
    ) evidence;
  IF n<3 OR NOT wide OR (lower(coalesce(NEW.category,'')) IN ('plumbing','electrical','painting') AND NOT close_up) THEN
    RAISE EXCEPTION 'Fresh completion-cycle evidence is incomplete' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_rework_completion_evidence() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_rework_completion_evidence BEFORE UPDATE OF status,completion_confirmed_by_homeowner ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.enforce_rework_completion_evidence();

CREATE FUNCTION public.submit_job_rework(p_job_id uuid,p_actor_id uuid,p_rework_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE j public.jobs%ROWTYPE; r public.job_rework_requests%ROWTYPE; e public.escrow_transactions%ROWTYPE; submitted timestamptz;
BEGIN
  SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found' USING ERRCODE='P0002'; END IF;
  IF j.contractor_id IS DISTINCT FROM p_actor_id OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not assigned contractor' USING ERRCODE='42501'; END IF;
  SELECT * INTO r FROM public.job_rework_requests WHERE job_id=j.id ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR r.id IS DISTINCT FROM p_rework_id THEN
    RAISE EXCEPTION 'Rework cycle changed' USING ERRCODE='23514'; END IF;
  IF j.status='completed' AND r.submitted_at=j.completed_at THEN RETURN false; END IF;
  IF j.status<>'in_progress' THEN RAISE EXCEPTION 'Job is not open for rework' USING ERRCODE='23514'; END IF;
  SELECT * INTO e FROM public.escrow_transactions WHERE job_id=j.id ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR e.status<>'held' THEN RAISE EXCEPTION 'Payment must remain held' USING ERRCODE='23514'; END IF;
  submitted:=clock_timestamp();
  PERFORM set_config('mintenance.submit_rework',r.id::text,true);
  UPDATE public.jobs SET status='completed',completed_at=submitted,updated_at=submitted WHERE id=j.id;
  PERFORM set_config('mintenance.submit_rework','',true);
  UPDATE public.job_rework_requests SET submitted_at=submitted WHERE id=r.id;
  -- Clear only the obsolete rework reason. Independent holds and disputes remain intact.
  UPDATE public.escrow_transactions SET release_blocked_reason=NULL,updated_at=submitted
    WHERE id=e.id AND release_blocked_reason='Rework requested; completion must be reviewed again';
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.submit_job_rework(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_job_rework(uuid,uuid,uuid) TO service_role;

-- Record the first actual send transition; never infer it from later signatures.
ALTER TABLE public.contracts ADD COLUMN sent_at timestamptz;
CREATE FUNCTION public.record_contract_first_sent() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.sent_at:=CASE WHEN NEW.status IN ('pending_homeowner','pending_contractor') THEN clock_timestamp() ELSE NULL END;
  ELSIF OLD.status='draft' AND NEW.status IN ('pending_homeowner','pending_contractor') AND OLD.sent_at IS NULL THEN
    NEW.sent_at:=clock_timestamp();
  ELSE NEW.sent_at:=OLD.sent_at;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_contract_first_sent() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER record_contract_first_sent BEFORE INSERT OR UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.record_contract_first_sent();
