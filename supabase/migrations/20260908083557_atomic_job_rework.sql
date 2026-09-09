CREATE TABLE public.job_rework_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  request_key text NOT NULL,
  comments text NOT NULL CHECK (length(btrim(comments)) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(actor_id, request_key)
);
ALTER TABLE public.job_rework_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_rework_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.job_rework_requests TO service_role;

CREATE OR REPLACE FUNCTION "public"."validate_job_status_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Only validate when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  CASE OLD.status
    WHEN 'draft' THEN
      IF NEW.status NOT IN ('posted', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'open' THEN
      IF NEW.status NOT IN ('posted', 'assigned', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'posted' THEN
      IF NEW.status NOT IN ('assigned', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'assigned' THEN
      IF NEW.status NOT IN ('in_progress', 'cancelled', 'posted') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'in_progress' THEN
      IF NEW.status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid job status transition: % -> %', OLD.status, NEW.status;
      END IF;
    WHEN 'completed' THEN
      IF NEW.status = 'in_progress' AND current_user = 'postgres'
         AND current_setting('mintenance.rework_job', true) = NEW.id::text THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Cannot transition from completed status';
    WHEN 'cancelled' THEN
      -- Cancelled is a terminal state
      RAISE EXCEPTION 'Cannot transition from cancelled status';
    ELSE
      -- Unknown status — allow (for backward compatibility)
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.request_job_rework(p_job_id uuid, p_actor_id uuid, p_request_key text, p_comments text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE j public.jobs%ROWTYPE; e public.escrow_transactions%ROWTYPE; prior public.job_rework_requests%ROWTYPE;
BEGIN
  IF p_request_key IS NULL OR length(p_request_key) NOT BETWEEN 1 AND 255 OR
     p_comments IS NULL OR length(btrim(p_comments)) NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'Invalid rework request' USING ERRCODE='23514';
  END IF;
  SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found' USING ERRCODE='P0002'; END IF;
  IF coalesce(j.payer_user_id,j.homeowner_id) IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
  END IF;
  SELECT * INTO prior FROM public.job_rework_requests WHERE actor_id=p_actor_id AND request_key=p_request_key;
  IF FOUND THEN
    IF prior.job_id <> p_job_id OR prior.comments <> btrim(p_comments) THEN
      RAISE EXCEPTION 'Request key payload mismatch' USING ERRCODE='23514';
    END IF;
    RETURN false;
  END IF;
  IF j.status <> 'completed' THEN RAISE EXCEPTION 'Job is not completed' USING ERRCODE='23514'; END IF;
  SELECT * INTO e FROM public.escrow_transactions WHERE job_id=p_job_id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR e.status <> 'held' THEN
    RAISE EXCEPTION 'Escrow is not available for rework' USING ERRCODE='23514';
  END IF;
  UPDATE public.escrow_transactions SET homeowner_approval=false, homeowner_approval_at=NULL,
    homeowner_inspection_completed=false, homeowner_inspection_at=NULL, auto_release_date=NULL,
    release_reason=NULL, updated_at=now() WHERE id=e.id;
  PERFORM set_config('mintenance.rework_job',p_job_id::text,true);
  UPDATE public.jobs SET status='in_progress',completed_at=NULL,completion_confirmed_by_homeowner=false,
    completion_confirmed_at=NULL,updated_at=now() WHERE id=p_job_id;
  PERFORM set_config('mintenance.rework_job','',true);
  INSERT INTO public.job_rework_requests(job_id,actor_id,request_key,comments)
    VALUES(p_job_id,p_actor_id,p_request_key,btrim(p_comments));
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.request_job_rework(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_job_rework(uuid,uuid,text,text) TO service_role;
