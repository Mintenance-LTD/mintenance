CREATE TABLE public.job_work_window_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  proposal_by uuid NOT NULL,
  response_by uuid NOT NULL,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'accepted', 'declined', 'withdrawn', 'expired')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz CHECK (ends_at > starts_at),
  duration_hours integer CHECK (duration_hours > 0),
  previous_start timestamptz,
  previous_end timestamptz,
  previous_duration integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (proposal_by <> response_by)
);

CREATE UNIQUE INDEX job_work_window_pending_idx
  ON public.job_work_window_proposals (job_id) WHERE state = 'pending';
CREATE INDEX job_work_window_history_idx
  ON public.job_work_window_proposals (job_id, created_at DESC);
ALTER TABLE public.job_work_window_proposals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_work_window_proposals FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.job_work_window_proposals TO service_role;

CREATE FUNCTION public.apply_job_work_window_action(
  p_actor uuid, p_job uuid, p_start timestamptz, p_end timestamptz,
  p_duration integer, p_proposal uuid, p_action text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  job public.jobs%ROWTYPE;
  proposal public.job_work_window_proposals%ROWTYPE;
  recipient uuid;
  notification_title text;
  notification_message text;
BEGIN
  SELECT * INTO job FROM public.jobs WHERE id = p_job FOR UPDATE;
  IF NOT FOUND OR p_actor IS NULL OR (
    p_actor IS DISTINCT FROM job.homeowner_id AND p_actor IS DISTINCT FROM job.payer_user_id
    AND p_actor IS DISTINCT FROM job.contractor_id
  ) THEN
    RAISE EXCEPTION 'Job unavailable' USING ERRCODE = '42501';
  END IF;
  IF job.status NOT IN ('assigned', 'in_progress') THEN
    RAISE EXCEPTION 'Job is not active' USING ERRCODE = '40001';
  END IF;
  PERFORM 1 FROM public.contracts
    WHERE job_id = p_job AND status = 'accepted'
      AND homeowner_signed_at IS NOT NULL AND contractor_signed_at IS NOT NULL
    FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Both parties must sign before proposing work dates' USING ERRCODE = '22023';
  END IF;

  IF p_action = 'propose' THEN
    IF p_start IS NULL OR p_start <= now() OR p_end <= p_start OR p_duration <= 0 THEN
      RAISE EXCEPTION 'Choose a future start and valid end time' USING ERRCODE = '22023';
    END IF;
    IF ROW(p_start, p_end, p_duration) IS NOT DISTINCT FROM
       ROW(job.scheduled_start_date, job.scheduled_end_date, job.scheduled_duration_hours) THEN
      RAISE EXCEPTION 'Choose a different work window' USING ERRCODE = '22023';
    END IF;
    recipient := CASE WHEN p_actor = job.contractor_id THEN job.homeowner_id ELSE job.contractor_id END;
    IF recipient IS NULL OR recipient = p_actor THEN
      RAISE EXCEPTION 'The other party must have an account' USING ERRCODE = '22023';
    END IF;
    UPDATE public.job_work_window_proposals SET state = 'expired', responded_at = now()
      WHERE job_id = p_job AND state = 'pending' AND starts_at <= now();
    SELECT * INTO proposal FROM public.job_work_window_proposals
      WHERE job_id = p_job AND state = 'pending';
    IF FOUND THEN
      IF proposal.proposal_by = p_actor AND proposal.starts_at = p_start
        AND proposal.ends_at IS NOT DISTINCT FROM p_end
        AND proposal.duration_hours IS NOT DISTINCT FROM p_duration THEN
        RETURN to_jsonb(proposal);
      END IF;
      RAISE EXCEPTION 'A work-window proposal is waiting for a response' USING ERRCODE = '40001';
    END IF;

    INSERT INTO public.job_work_window_proposals (
      job_id, proposal_by, response_by, starts_at, ends_at, duration_hours,
      previous_start, previous_end, previous_duration
    ) VALUES (
      p_job, p_actor, recipient, p_start, p_end, p_duration,
      job.scheduled_start_date, job.scheduled_end_date, job.scheduled_duration_hours
    ) RETURNING * INTO proposal;
    notification_title := 'New work window proposed';
    notification_message := 'Review the proposed dates. The current work window stays in place until you accept.';
  ELSIF p_action IN ('accepted', 'declined', 'withdrawn') THEN
    SELECT * INTO proposal FROM public.job_work_window_proposals
      WHERE id = p_proposal AND job_id = p_job;
    IF NOT FOUND OR (
      CASE WHEN p_action = 'withdrawn' THEN proposal.proposal_by ELSE proposal.response_by END
    ) IS DISTINCT FROM p_actor OR (
      job.contractor_id = ANY (ARRAY[proposal.proposal_by, proposal.response_by]) AND
      (job.homeowner_id = ANY (ARRAY[proposal.proposal_by, proposal.response_by]) OR
       job.payer_user_id = ANY (ARRAY[proposal.proposal_by, proposal.response_by]))
    ) IS NOT TRUE THEN
      RAISE EXCEPTION 'Proposal unavailable' USING ERRCODE = '42501';
    END IF;
    IF proposal.state = p_action THEN RETURN to_jsonb(proposal); END IF;
    IF proposal.state <> 'pending' THEN
      RAISE EXCEPTION 'Proposal already resolved' USING ERRCODE = '40001';
    END IF;
    IF p_action = 'accepted' THEN
      IF proposal.starts_at <= now() OR
         ROW(proposal.previous_start, proposal.previous_end, proposal.previous_duration)
           IS DISTINCT FROM ROW(job.scheduled_start_date, job.scheduled_end_date, job.scheduled_duration_hours) THEN
        RAISE EXCEPTION 'The proposal expired or the current work window changed' USING ERRCODE = '40001';
      END IF;
      UPDATE public.jobs SET scheduled_start_date = proposal.starts_at,
        scheduled_end_date = proposal.ends_at, scheduled_duration_hours = proposal.duration_hours,
        updated_at = now() WHERE id = p_job;
    END IF;
    UPDATE public.job_work_window_proposals SET state = p_action, responded_at = now()
      WHERE id = proposal.id RETURNING * INTO proposal;
    recipient := CASE WHEN p_action = 'withdrawn' THEN proposal.response_by ELSE proposal.proposal_by END;
    notification_title := 'Work-window proposal ' || p_action;
    notification_message := CASE WHEN p_action = 'accepted' THEN
      'The agreed dates are now in the job calendar.'
      ELSE 'The current work window stays in place.' END;
  ELSE
    RAISE EXCEPTION 'Invalid work-window action' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.notification_queue (
    user_id, notification_type, priority, title, message, action_url, metadata, scheduled_for
  ) VALUES (
    recipient, 'job_scheduled', 'medium', notification_title,
    coalesce(job.title, 'Job') || '. ' || notification_message,
    '/jobs/' || p_job || '/schedule',
    jsonb_build_object('jobId', p_job, 'workWindowProposalId', proposal.id), now()
  );
  RETURN to_jsonb(proposal);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_job_work_window_action(uuid,uuid,timestamptz,timestamptz,integer,uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_job_work_window_action(uuid,uuid,timestamptz,timestamptz,integer,uuid,text)
  TO service_role;
