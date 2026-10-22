-- Email proof and delivery bookkeeping are service-only, separate from report projections.
CREATE TABLE public.report_email_access (
 report_id uuid PRIMARY KEY REFERENCES public.anonymous_reports(id) ON DELETE CASCADE,
 email text NOT NULL, verified_at timestamptz, enabled boolean NOT NULL DEFAULT true,
 token_hash text, expires_at timestamptz, requested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.report_email_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.report_email_access FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.report_email_access TO service_role;
CREATE TABLE public.report_email_outbox (
 message_id uuid PRIMARY KEY REFERENCES public.report_messages(id) ON DELETE CASCADE,
 report_id uuid NOT NULL REFERENCES public.anonymous_reports(id) ON DELETE CASCADE,
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 lease_id uuid, sent_at timestamptz
);
ALTER TABLE public.report_email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.report_email_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.report_email_outbox TO service_role;
CREATE INDEX report_email_pending ON public.report_email_outbox(available_at) WHERE sent_at IS NULL AND attempts < 5;
CREATE FUNCTION public.queue_report_email() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.author_role IN ('manager','contractor','system') AND EXISTS (SELECT 1 FROM public.report_email_access WHERE report_id=NEW.report_id AND verified_at IS NOT NULL AND enabled) THEN
 INSERT INTO public.report_email_outbox(message_id,report_id) VALUES(NEW.id,NEW.report_id) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_report_email() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER report_reply_email AFTER INSERT ON public.report_messages FOR EACH ROW EXECUTE FUNCTION public.queue_report_email();
CREATE FUNCTION public.verify_report_email(p_report uuid,p_token text,p_receipt text) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE public.report_email_access SET verified_at=now(),enabled=true,token_hash=NULL,expires_at=NULL
 WHERE report_id=p_report AND token_hash=p_token AND expires_at>now();
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.anonymous_reports SET conversation_key_hash=p_receipt WHERE id=p_report;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.verify_report_email(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_report_email(uuid,text,text) TO service_role;
-- Atomic cooldown prevents concurrent requests from replacing each other's tokens.
CREATE FUNCTION public.issue_report_email(p_report uuid,p_email text,p_hash text) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 INSERT INTO public.report_email_access(report_id,email,token_hash,expires_at,requested_at)
 VALUES(p_report,p_email,p_hash,now()+interval '30 minutes',now())
 ON CONFLICT(report_id) DO UPDATE SET email=EXCLUDED.email,token_hash=EXCLUDED.token_hash,
 expires_at=EXCLUDED.expires_at,requested_at=EXCLUDED.requested_at,
 verified_at=CASE WHEN lower(report_email_access.email)=lower(EXCLUDED.email) THEN report_email_access.verified_at ELSE NULL END
 WHERE report_email_access.requested_at < now()-interval '1 minute';
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.issue_report_email(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.issue_report_email(uuid,text,text) TO service_role;
CREATE FUNCTION public.claim_report_emails() RETURNS SETOF public.report_email_outbox LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 UPDATE public.report_email_outbox SET attempts=attempts+1,lease_id=gen_random_uuid(),available_at=now()+interval '5 minutes'
 WHERE message_id IN (SELECT message_id FROM public.report_email_outbox WHERE sent_at IS NULL AND attempts<5 AND available_at<=now() ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 5)
 RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_report_emails() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_report_emails() TO service_role;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('tenant-report-photos','tenant-report-photos',false,3145728,ARRAY['image/jpeg']) ON CONFLICT(id) DO NOTHING;
