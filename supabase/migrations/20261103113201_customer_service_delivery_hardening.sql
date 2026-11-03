CREATE OR REPLACE FUNCTION public.publish_customer_campaign(p_campaign uuid,p_actor uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.customer_campaigns%ROWTYPE; recipient record; channel text; total integer:=0;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.support_operator_settings s JOIN public.profiles p ON p.id=s.admin_id WHERE s.admin_id=p_actor AND s.can_broadcast AND p.role='admin' AND p.deleted_at IS NULL) THEN RAISE EXCEPTION 'Broadcast permission required' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.customer_campaigns WHERE id=p_campaign FOR UPDATE;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Draft not found' USING ERRCODE='P0002'; END IF;
 IF c.published_at IS NOT NULL THEN RETURN 0; END IF;
 FOR recipient IN SELECT p.id,p.email FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE p.id=ANY(c.recipient_ids) AND p.deleted_at IS NULL AND u.deleted_at IS NULL AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until<=now()) LOOP
  FOREACH channel IN ARRAY c.channels LOOP
   IF channel='in_app' AND 'push'=ANY(c.channels) THEN CONTINUE; END IF;
   INSERT INTO public.customer_communication_outbox(event_key,recipient_id,recipient_email,channel,subject,body,action_url) VALUES('campaign:'||c.id||':'||recipient.id||':'||channel,recipient.id,recipient.email,channel,c.title,c.body,'/support') ON CONFLICT(event_key) DO NOTHING;
   total:=total+1;
  END LOOP;
 END LOOP;
 UPDATE public.customer_campaigns SET published_at=now() WHERE id=c.id;
 RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.publish_customer_campaign(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.publish_customer_campaign(uuid,uuid) TO service_role;
