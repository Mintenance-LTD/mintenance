-- Prospective only: no historical notification backfill or delivery invocation.
SET LOCAL lock_timeout = '5s';
CREATE FUNCTION public.queue_quote_amendment_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.quote_amendments; recipient uuid; headline text; detail text;
BEGIN
 SELECT * INTO STRICT a FROM public.quote_amendments WHERE id=NEW.amendment_id;
 recipient:=CASE WHEN NEW.action IN ('approve','reject') THEN a.contractor_id ELSE a.customer_id END;
 headline:=CASE NEW.action
  WHEN 'publish' THEN 'Quote amendment ready for review'
  WHEN 'approve' THEN 'Quote amendment approved'
  WHEN 'reject' THEN 'Quote amendment declined'
  WHEN 'withdraw' THEN 'Quote amendment withdrawn'
  ELSE 'Revised quote pricing applied' END;
 detail:=CASE NEW.action
  WHEN 'publish' THEN 'Review the proposed pricing in your job. The accepted price has not changed.'
  WHEN 'approve' THEN 'Customer approval is recorded. Review eligibility before applying the amendment.'
  WHEN 'reject' THEN 'The customer declined the proposal. The accepted price has not changed.'
  WHEN 'withdraw' THEN 'The contractor withdrew the proposal. The accepted price has not changed.'
  ELSE 'The unsigned contract is back in draft. Review it through the normal signing process. No money was moved.' END;
 INSERT INTO public.notification_queue(id,user_id,notification_type,priority,title,message,action_url,metadata,scheduled_for,status,retry_count)
 VALUES(md5('quote-amendment:'||a.id::text||':'||NEW.version::text)::uuid,recipient,
  'quote_amendment_update','high',headline,detail,'/jobs/'||a.job_id::text||'/amendments',
  jsonb_build_object('jobId',a.job_id,'quote_amendment_id',a.id,'amendment_version',NEW.version),
  clock_timestamp(),'pending',0);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_quote_amendment_event() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER queue_quote_amendment_event AFTER INSERT ON public.quote_amendment_events
 FOR EACH ROW EXECUTE FUNCTION public.queue_quote_amendment_event();
