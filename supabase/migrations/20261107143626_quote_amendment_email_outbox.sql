-- Prospective email only. No backfill, provider invocation or financial writes.
SET LOCAL lock_timeout = '5s';
CREATE TABLE public.quote_amendment_email_outbox (
 amendment_id uuid NOT NULL,
 version integer NOT NULL,
 job_id uuid NOT NULL,
 user_id uuid NOT NULL,
 action text NOT NULL CHECK (action IN ('publish','approve','reject','withdraw','apply')),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','cancelled','failed','needs_review')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 6),
 scheduled_for timestamptz NOT NULL DEFAULT clock_timestamp(),
 sent_at timestamptz,
 error_code text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(amendment_id,version),
 FOREIGN KEY(amendment_id,version) REFERENCES public.quote_amendment_events(amendment_id,version)
);
ALTER TABLE public.quote_amendment_email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quote_amendment_email_outbox FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.quote_amendment_email_outbox TO service_role;
GRANT UPDATE(status,attempts,scheduled_for,sent_at,error_code) ON public.quote_amendment_email_outbox TO service_role;
CREATE INDEX quote_amendment_email_due ON public.quote_amendment_email_outbox(scheduled_for)
 WHERE status IN ('pending','sending');

CREATE FUNCTION public.queue_quote_amendment_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.quote_amendments;
BEGIN
 SELECT * INTO STRICT a FROM public.quote_amendments WHERE id=NEW.amendment_id;
 INSERT INTO public.quote_amendment_email_outbox(amendment_id,version,job_id,user_id,action)
 VALUES(a.id,NEW.version,a.job_id,
  CASE WHEN NEW.action IN ('approve','reject') THEN a.contractor_id ELSE a.customer_id END,NEW.action);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_quote_amendment_email() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER queue_quote_amendment_email AFTER INSERT ON public.quote_amendment_events
 FOR EACH ROW EXECUTE FUNCTION public.queue_quote_amendment_email();
