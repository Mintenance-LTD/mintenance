ALTER TABLE public.anonymous_reports ADD COLUMN conversation_key_hash text;
CREATE TABLE public.report_messages (
 id uuid PRIMARY KEY, report_id uuid NOT NULL REFERENCES public.anonymous_reports(id) ON DELETE CASCADE,
 author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 author_role text NOT NULL CHECK(author_role IN ('resident','manager','contractor','system')),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 5000), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX report_messages_page ON public.report_messages(report_id,created_at,id);
ALTER TABLE public.report_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.report_messages FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.report_messages TO service_role;
-- Only a hash is stored; the random receipt secret is returned once to its creator.

CREATE FUNCTION public.report_conversation(p_report uuid,p_actor uuid,p_hash text,p_message uuid DEFAULT NULL,p_body text DEFAULT NULL,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE r public.anonymous_reports%ROWTYPE; owner_key uuid; contractor_key uuid; actor_role text; previous public.report_messages%ROWTYPE; result jsonb;
BEGIN
 SELECT * INTO r FROM public.anonymous_reports WHERE id=p_report FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Report unavailable' USING ERRCODE='42501'; END IF;
 SELECT owner_id INTO owner_key FROM public.properties WHERE id=r.property_id;
 IF owner_key IS NULL THEN RAISE EXCEPTION 'Report unavailable' USING ERRCODE='42501'; END IF;
 SELECT contractor_id INTO contractor_key FROM public.jobs WHERE id=r.job_id AND property_id=r.property_id;
 IF p_actor=owner_key OR EXISTS(SELECT 1 FROM public.property_team_members WHERE property_id=r.property_id AND user_id=p_actor AND status='accepted' AND role IN ('admin','manager')) THEN actor_role='manager';
 ELSIF p_actor=contractor_key THEN actor_role='contractor';
 ELSIF p_hash IS NOT NULL AND p_hash=r.conversation_key_hash THEN actor_role='resident';
 ELSE RAISE EXCEPTION 'Report unavailable' USING ERRCODE='42501'; END IF;
 IF p_message IS NOT NULL THEN
 IF length(trim(p_body)) NOT BETWEEN 1 AND 5000 OR p_body IS NULL THEN RAISE EXCEPTION 'Invalid message' USING ERRCODE='22023'; END IF;
 INSERT INTO public.report_messages(id,report_id,author_id,author_role,body) VALUES(p_message,p_report,p_actor,actor_role,trim(p_body)) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN
 SELECT * INTO previous FROM public.report_messages WHERE id=p_message;
 IF previous.report_id IS DISTINCT FROM p_report OR previous.author_id IS DISTINCT FROM p_actor OR previous.author_role<>actor_role OR previous.body<>trim(p_body) THEN RAISE EXCEPTION 'Message retry differs' USING ERRCODE='22023'; END IF;
 ELSE
 INSERT INTO public.notification_queue(user_id,notification_type,priority,title,message,action_url,metadata,scheduled_for)
 SELECT target,'tenant_report','medium','Maintenance conversation updated','There is a new update on a maintenance report.','/maintenance/reports/'||p_report::text,jsonb_build_object('reportId',p_report),now()
 FROM (SELECT owner_key AS target UNION SELECT contractor_key) recipients WHERE target IS NOT NULL AND target IS DISTINCT FROM p_actor;
 END IF;
 END IF;
 SELECT jsonb_build_object('status',r.status,'role',actor_role,'messages',coalesce(jsonb_agg(to_jsonb(page)),'[]'::jsonb),'hasMore',(SELECT count(*) FROM public.report_messages WHERE report_id=p_report)>p_offset+25) INTO result
 FROM (SELECT id,author_role,body,created_at FROM public.report_messages WHERE report_id=p_report ORDER BY created_at,id OFFSET greatest(0,p_offset) LIMIT 25) page;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.report_conversation(uuid,uuid,text,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.report_conversation(uuid,uuid,text,uuid,text,integer) TO service_role;
ALTER TABLE public.appointments ADD COLUMN client_response text NOT NULL DEFAULT 'pending' CHECK(client_response IN ('pending','confirmed','change_requested'));
ALTER TABLE public.appointments ADD COLUMN client_response_at timestamptz;
-- Existing appointment editors must not impersonate the client's confirmation.
CREATE FUNCTION public.guard_visit_response() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF current_user IN ('anon','authenticated') THEN
  IF TG_OP='INSERT' THEN
   IF NEW.client_response<>'pending' OR NEW.client_response_at IS NOT NULL THEN RAISE EXCEPTION 'Use visit response endpoint' USING ERRCODE='42501'; END IF;
  ELSIF (NEW.client_response,NEW.client_response_at) IS DISTINCT FROM (OLD.client_response,OLD.client_response_at) THEN
   RAISE EXCEPTION 'Use visit response endpoint' USING ERRCODE='42501';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_visit_response BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.guard_visit_response();
REVOKE ALL ON FUNCTION public.guard_visit_response() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.reset_visit_response() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN IF (NEW.appointment_date,NEW.start_time,NEW.end_time,NEW.client_id) IS DISTINCT FROM (OLD.appointment_date,OLD.start_time,OLD.end_time,OLD.client_id) THEN NEW.client_response='pending'; NEW.client_response_at=NULL; END IF; RETURN NEW; END $$;
CREATE TRIGGER reset_visit_response BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.reset_visit_response();
CREATE FUNCTION public.respond_to_visit(p_actor uuid,p_id uuid,p_date date,p_start time,p_end time,p_response text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE a public.appointments%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public.appointments WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.client_id IS DISTINCT FROM p_actor THEN RAISE EXCEPTION 'Visit unavailable' USING ERRCODE='42501'; END IF;
 IF a.status NOT IN ('scheduled','confirmed','rescheduled') OR a.appointment_date IS DISTINCT FROM p_date OR a.start_time IS DISTINCT FROM p_start OR a.end_time IS DISTINCT FROM p_end THEN RAISE EXCEPTION 'Visit changed; reload' USING ERRCODE='40001'; END IF;
 IF p_response NOT IN ('confirmed','change_requested') THEN RAISE EXCEPTION 'Invalid response' USING ERRCODE='22023'; END IF;
 IF a.client_response=p_response THEN RETURN; END IF;
 UPDATE public.appointments SET client_response=p_response,client_response_at=now() WHERE id=p_id;
 INSERT INTO public.notification_queue(user_id,notification_type,priority,title,message,action_url,metadata,scheduled_for)
 VALUES(a.contractor_id,'appointment_update','medium','Visit response received',CASE WHEN p_response='confirmed' THEN 'The client confirmed the visit.' ELSE 'The client requested a different visit time.' END,'/contractor/appointments',jsonb_build_object('appointmentId',p_id),now());
END $$;
REVOKE ALL ON FUNCTION public.respond_to_visit(uuid,uuid,date,time,time,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_visit(uuid,uuid,date,time,time,text) TO service_role;

CREATE FUNCTION public.record_report_status() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status THEN
 INSERT INTO public.report_messages(id,report_id,author_role,body) VALUES(gen_random_uuid(),NEW.id,'system','Report status changed to '||NEW.status||'.');
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER report_status_history AFTER UPDATE OF status ON public.anonymous_reports FOR EACH ROW EXECUTE FUNCTION public.record_report_status();
REVOKE ALL ON FUNCTION public.record_report_status(),public.reset_visit_response() FROM PUBLIC,anon,authenticated;
