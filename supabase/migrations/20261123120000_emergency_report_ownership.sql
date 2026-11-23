-- Apply before deploying the emergency inbox/processor. No external sends here.
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.emergency_report_incidents (
  report_id uuid PRIMARY KEY REFERENCES public.anonymous_reports(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  escalated_at timestamptz,
  needs_attention boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_at timestamptz,
  cycle uuid NOT NULL DEFAULT gen_random_uuid()
);
ALTER TABLE public.emergency_report_incidents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.emergency_report_incidents FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.emergency_report_incidents TO service_role;
CREATE INDEX emergency_reports_due ON public.emergency_report_incidents(due_at)
  WHERE acknowledged_at IS NULL AND closed_at IS NULL;
CREATE INDEX emergency_reports_property ON public.emergency_report_incidents(property_id);
CREATE INDEX emergency_reports_assignee ON public.emergency_report_incidents(assigned_to);
CREATE INDEX emergency_reports_acknowledger ON public.emergency_report_incidents(acknowledged_by);

-- Assignment is not authority: membership and account state are checked live.
CREATE FUNCTION public.emergency_report_responder(p_property uuid, p_actor uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
  SELECT EXISTS(SELECT 1 FROM public.properties p JOIN public.profiles a
    ON a.id=p_actor AND a.deleted_at IS NULL WHERE p.id=p_property AND
    (p.owner_id=p_actor OR EXISTS(SELECT 1 FROM public.property_team_members m
      WHERE m.property_id=p.id AND m.user_id=p_actor AND m.status='accepted'
        AND m.role IN ('admin','manager'))));
$$;

CREATE FUNCTION public.queue_emergency_report(p_report uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE incident public.emergency_report_incidents;
BEGIN
  SELECT * INTO STRICT incident FROM public.emergency_report_incidents WHERE report_id=p_report;
  IF incident.assigned_to IS NOT NULL THEN
    INSERT INTO public.notification_queue(user_id,notification_type,priority,title,message,action_url,metadata,scheduled_for)
    VALUES(incident.assigned_to,'emergency_report','high','Emergency maintenance report needs acknowledgment',
      'Review the emergency report and explicitly acknowledge responsibility. Delivery is not acknowledgment.',
      '/maintenance/emergencies',
      jsonb_build_object('emergency_report_id',p_report,'emergency_cycle',incident.cycle),now());
  ELSE
    INSERT INTO public.operator_alerts(dedupe_key,job_name)
      VALUES('emergency-reports:'||to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD-HH'),'emergency-reports')
      ON CONFLICT(dedupe_key) DO NOTHING;
  END IF;
END $$;

-- Runs in the report transaction: accepting a report without its ownership
-- record and initial outbox item is impossible, even when notification APIs fail.
CREATE FUNCTION public.track_emergency_report()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE owner_key uuid;
BEGIN
  IF NEW.urgency <> 'emergency' OR NEW.property_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' OR (NEW.status='new' AND OLD.status<>'new')
    OR (TG_OP='UPDATE' AND OLD.urgency<>'emergency') THEN
    SELECT owner_id INTO owner_key FROM public.properties WHERE id=NEW.property_id;
    IF NOT public.emergency_report_responder(NEW.property_id,owner_key) THEN owner_key:=NULL; END IF;
    INSERT INTO public.emergency_report_incidents(report_id,property_id,assigned_to,due_at)
    VALUES(NEW.id,NEW.property_id,owner_key,CASE WHEN owner_key IS NULL THEN now() ELSE now()+interval '15 minutes' END)
    ON CONFLICT(report_id) DO UPDATE SET assigned_to=excluded.assigned_to,due_at=excluded.due_at,
      escalated_at=NULL,needs_attention=false,acknowledged_at=NULL,acknowledged_by=NULL,closed_at=NULL,cycle=gen_random_uuid();
    PERFORM public.queue_emergency_report(NEW.id);
  END IF;
  -- Existing owner report controls also count as explicit human action.
  -- Do not invent an actor for legacy status updates. The new RPC records one.
  IF NEW.status='acknowledged' THEN
    UPDATE public.emergency_report_incidents SET acknowledged_at=coalesce(acknowledged_at,now()),needs_attention=false WHERE report_id=NEW.id;
  ELSIF NEW.status IN ('converted','resolved','dismissed') THEN
    UPDATE public.emergency_report_incidents SET closed_at=coalesce(closed_at,now()),needs_attention=false WHERE report_id=NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER track_emergency_report AFTER INSERT OR UPDATE OF status,urgency
  ON public.anonymous_reports FOR EACH ROW EXECUTE FUNCTION public.track_emergency_report();

CREATE FUNCTION public.advance_emergency_reports()
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE report_row record; incident public.emergency_report_incidents; fallback_key uuid; processed integer:=0;
BEGIN
  -- Lock report before incident everywhere (including status-trigger writes).
  -- Concurrent cron runs skip locked reports; acknowledgment wins atomically.
  FOR report_row IN SELECT r.id,p.owner_id FROM public.anonymous_reports r
    JOIN public.emergency_report_incidents i ON i.report_id=r.id
    JOIN public.properties p ON p.id=i.property_id
    WHERE r.status='new' AND r.urgency='emergency' AND i.acknowledged_at IS NULL AND i.closed_at IS NULL
      AND (i.due_at<=now() OR (NOT i.needs_attention AND NOT public.emergency_report_responder(i.property_id,i.assigned_to)))
    ORDER BY i.due_at,r.id LIMIT 100 FOR UPDATE OF r SKIP LOCKED
  LOOP
    SELECT * INTO STRICT incident FROM public.emergency_report_incidents WHERE report_id=report_row.id FOR UPDATE;
    fallback_key:=NULL;
    IF incident.escalated_at IS NULL THEN
      SELECT m.user_id INTO fallback_key FROM public.property_team_members m
      JOIN public.profiles a ON a.id=m.user_id AND a.deleted_at IS NULL
      WHERE m.property_id=incident.property_id AND m.status='accepted' AND m.role IN ('admin','manager')
        AND m.user_id IS DISTINCT FROM incident.assigned_to AND m.user_id<>report_row.owner_id
      ORDER BY CASE m.role WHEN 'admin' THEN 0 ELSE 1 END,m.user_id LIMIT 1;
    END IF;
    IF fallback_key IS NOT NULL THEN
      UPDATE public.emergency_report_incidents SET assigned_to=fallback_key,escalated_at=now(),
        needs_attention=false,due_at=now()+interval '15 minutes' WHERE report_id=report_row.id;
      PERFORM public.queue_emergency_report(report_row.id);
    ELSE
      UPDATE public.emergency_report_incidents SET needs_attention=true,due_at=now()+interval '15 minutes',
        assigned_to=CASE WHEN public.emergency_report_responder(property_id,assigned_to) THEN assigned_to ELSE NULL END
        WHERE report_id=report_row.id;
      INSERT INTO public.operator_alerts(dedupe_key,job_name)
        VALUES('emergency-reports:'||to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD-HH'),'emergency-reports')
        ON CONFLICT(dedupe_key) DO NOTHING;
    END IF;
    processed:=processed+1;
  END LOOP;
  RETURN processed;
END $$;

CREATE FUNCTION public.acknowledge_emergency_report(p_actor uuid,p_report uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE incident public.emergency_report_incidents; owner_key uuid; report_status text;
BEGIN
  SELECT status INTO report_status FROM public.anonymous_reports WHERE id=p_report FOR UPDATE;
  SELECT * INTO incident FROM public.emergency_report_incidents WHERE report_id=p_report FOR UPDATE;
  SELECT owner_id INTO owner_key FROM public.properties WHERE id=incident.property_id;
  IF incident.report_id IS NULL OR NOT public.emergency_report_responder(incident.property_id,p_actor)
    OR (p_actor IS DISTINCT FROM owner_key AND p_actor IS DISTINCT FROM incident.assigned_to) THEN
    RAISE EXCEPTION 'Emergency report access denied' USING ERRCODE='42501';
  END IF;
  IF incident.closed_at IS NOT NULL OR report_status NOT IN ('new','acknowledged') THEN
    RAISE EXCEPTION 'Report is no longer awaiting acknowledgment' USING ERRCODE='PT409';
  END IF;
  IF incident.acknowledged_at IS NULL THEN
    UPDATE public.emergency_report_incidents SET acknowledged_at=now(),acknowledged_by=p_actor,
      assigned_to=p_actor,needs_attention=false WHERE report_id=p_report;
    UPDATE public.anonymous_reports SET status='acknowledged',acknowledged_at=coalesce(acknowledged_at,now()),updated_at=now() WHERE id=p_report;
  END IF;
  SELECT * INTO incident FROM public.emergency_report_incidents WHERE report_id=p_report;
  RETURN to_jsonb(incident);
END $$;

CREATE FUNCTION public.emergency_report_inbox(p_actor uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(items) ORDER BY items.acknowledged_at NULLS FIRST,items.due_at),'[]'::jsonb)
  FROM (SELECT i.*,p.property_name,r.description,r.category,r.status,
      coalesce(nullif(trim(concat_ws(' ',a.first_name,a.last_name)),''),'Unassigned') AS assignee_name
    FROM public.emergency_report_incidents i JOIN public.anonymous_reports r ON r.id=i.report_id
    JOIN public.properties p ON p.id=i.property_id LEFT JOIN public.profiles a ON a.id=i.assigned_to
    WHERE (p.owner_id=p_actor OR i.assigned_to=p_actor) AND public.emergency_report_responder(i.property_id,p_actor)
      AND i.closed_at IS NULL ORDER BY i.acknowledged_at NULLS FIRST,i.due_at LIMIT 100) items;
$$;

-- Recheck before either initial delivery or push retry; revoked responders and
-- old escalation/reopen cycles must not receive report notifications.
CREATE FUNCTION public.should_deliver_emergency_report(p_report uuid,p_actor uuid,p_cycle uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
  SELECT EXISTS(SELECT 1 FROM public.emergency_report_incidents i JOIN public.anonymous_reports r ON r.id=i.report_id
    WHERE i.report_id=p_report AND i.cycle=p_cycle AND i.assigned_to=p_actor
      AND i.acknowledged_at IS NULL AND i.closed_at IS NULL AND r.status='new' AND r.urgency='emergency'
      AND public.emergency_report_responder(i.property_id,p_actor));
$$;

REVOKE ALL ON FUNCTION public.emergency_report_responder(uuid,uuid),public.queue_emergency_report(uuid),
  public.track_emergency_report(),public.advance_emergency_reports(),public.acknowledge_emergency_report(uuid,uuid),
  public.emergency_report_inbox(uuid),public.should_deliver_emergency_report(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.emergency_report_responder(uuid,uuid),public.queue_emergency_report(uuid),
  public.track_emergency_report(),public.advance_emergency_reports(),public.acknowledge_emergency_report(uuid,uuid),
  public.emergency_report_inbox(uuid),public.should_deliver_emergency_report(uuid,uuid,uuid) TO service_role;

-- Recover existing unacknowledged emergencies without claiming prior delivery.
INSERT INTO public.emergency_report_incidents(report_id,property_id,assigned_to,due_at)
SELECT r.id,r.property_id,CASE WHEN public.emergency_report_responder(p.id,p.owner_id) THEN p.owner_id END,now()
FROM public.anonymous_reports r JOIN public.properties p ON p.id=r.property_id
WHERE r.urgency='emergency' AND r.status='new' ON CONFLICT DO NOTHING;
