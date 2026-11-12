-- Business conflicts must not use serialization_failure (40001): PostgREST can
-- retry that code until the caller times out. PT409 returns a terminal conflict.
-- Function-only replacement; existing rows, permissions and review history stay intact.
SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE FUNCTION public.review_quote_amendment_email(p_actor uuid,p_request uuid,p_amendment uuid,p_version integer,
 p_expected_review integer,p_action text,p_evidence text,p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q public.quote_amendment_email_outbox; prior public.quote_amendment_email_reviews; target text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND role='admin' AND deleted_at IS NULL) THEN
  RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_expected_review IS NULL OR p_expected_review<0 OR p_action IS NULL OR
  p_action NOT IN ('retry','confirm_accepted','close_unknown') OR p_evidence IS NULL OR p_note IS NULL OR
  length(btrim(p_note)) NOT BETWEEN 20 AND 2000 OR
  (p_action='retry' AND p_evidence<>'not_accepted') OR
  (p_action='confirm_accepted' AND p_evidence<>'accepted') OR
  (p_action='close_unknown' AND p_evidence<>'unknown') THEN
  RAISE EXCEPTION 'Review evidence required' USING ERRCODE='22023'; END IF;
 SELECT * INTO q FROM public.quote_amendment_email_outbox WHERE amendment_id=p_amendment AND version=p_version FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Email not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO prior FROM public.quote_amendment_email_reviews WHERE request_id=p_request;
 IF FOUND THEN
  IF prior.amendment_id<>p_amendment OR prior.version<>p_version OR prior.actor_id<>p_actor OR
   prior.review_version<>p_expected_review+1 OR prior.action<>p_action OR prior.evidence<>p_evidence OR prior.note<>btrim(p_note) THEN
   RAISE EXCEPTION 'Request already used' USING ERRCODE='PT409'; END IF;
  RETURN to_jsonb(prior);
 END IF;
 IF q.review_version<>p_expected_review OR q.status NOT IN ('failed','needs_review') THEN
  RAISE EXCEPTION 'Email changed; refresh review' USING ERRCODE='PT409'; END IF;
 IF p_action='retry' AND NOT EXISTS(
  SELECT 1 FROM public.quote_amendments a JOIN public.jobs j ON j.id=a.job_id
  WHERE a.id=q.amendment_id AND a.version=q.version AND a.job_id=q.job_id
   AND j.contractor_id=a.contractor_id AND COALESCE(j.payer_user_id,j.homeowner_id)=a.customer_id
   AND q.user_id=CASE WHEN a.status IN ('approved','rejected') THEN a.contractor_id ELSE a.customer_id END
 ) THEN RAISE EXCEPTION 'Amendment no longer current' USING ERRCODE='PT409'; END IF;
 target:=CASE p_action WHEN 'retry' THEN 'pending' WHEN 'confirm_accepted' THEN 'reviewed_accepted' ELSE 'reviewed_unknown' END;
 INSERT INTO public.quote_amendment_email_reviews(request_id,amendment_id,version,review_version,actor_id,action,evidence,note,
  previous_status,previous_attempts,previous_error_code,result_status)
 VALUES(p_request,p_amendment,p_version,p_expected_review+1,p_actor,p_action,p_evidence,btrim(p_note),q.status,q.attempts,q.error_code,target)
 RETURNING * INTO prior;
 UPDATE public.quote_amendment_email_outbox SET status=target,review_version=review_version+1,
  attempts=CASE WHEN p_action='retry' THEN 0 ELSE attempts END,
  scheduled_for=CASE WHEN p_action='retry' THEN clock_timestamp() ELSE scheduled_for END,
  error_code=CASE WHEN p_action='retry' THEN NULL ELSE error_code END
 WHERE amendment_id=p_amendment AND version=p_version;
 -- No provider call and no sent_at claim. The normal worker rechecks eligibility/preferences.
 RETURN to_jsonb(prior);
END $$;
REVOKE ALL ON FUNCTION public.review_quote_amendment_email(uuid,uuid,uuid,integer,integer,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_quote_amendment_email(uuid,uuid,uuid,integer,integer,text,text,text) TO service_role;
