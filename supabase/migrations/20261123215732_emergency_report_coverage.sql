-- Project the same responder routing used by the emergency processor.
CREATE FUNCTION public.emergency_report_fallback(
  p_property uuid, p_owner uuid, p_current uuid
)
RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
  SELECT m.user_id
  FROM public.property_team_members m
  JOIN public.profiles a ON a.id=m.user_id AND a.deleted_at IS NULL
  WHERE m.property_id=p_property AND m.status='accepted' AND m.role IN ('admin','manager')
    AND m.user_id IS DISTINCT FROM p_current AND m.user_id<>p_owner
  ORDER BY CASE m.role WHEN 'admin' THEN 0 ELSE 1 END,m.user_id
  LIMIT 1;
$$;

CREATE FUNCTION public.emergency_report_coverage(p_actor uuid)
RETURNS TABLE(
  property_id uuid,
  property_name text,
  initial_responder text,
  fallback_responder text,
  emergency_phone text,
  has_active_link boolean
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
  WITH candidates AS (
    SELECT p.id FROM public.properties p WHERE p.owner_id=p_actor
    UNION
    SELECT m.property_id FROM public.property_team_members m
    WHERE m.user_id=p_actor AND m.status='accepted' AND m.role IN ('admin','manager')
  )
  SELECT p.id, p.property_name,
    CASE WHEN owner.id IS NOT NULL THEN
      coalesce(nullif(trim(concat_ws(' ',owner.first_name,owner.last_name)),''),'Property owner')
    END,
    CASE WHEN fallback.id IS NOT NULL THEN
      coalesce(nullif(trim(concat_ws(' ',fallback.first_name,fallback.last_name)),''),'Property team member')
    END,
    p.tenant_emergency_phone,
    EXISTS (
      SELECT 1 FROM public.anonymous_report_tokens t
      WHERE t.property_id=p.id AND t.is_active
    )
  FROM candidates c
  JOIN public.properties p ON p.id=c.id
  LEFT JOIN public.profiles owner ON owner.id=p.owner_id AND owner.deleted_at IS NULL
  LEFT JOIN public.profiles fallback
    ON fallback.id=public.emergency_report_fallback(p.id,p.owner_id,p.owner_id)
  WHERE public.emergency_report_responder(p.id,p_actor)
  ORDER BY lower(p.property_name),p.id;
$$;

CREATE OR REPLACE FUNCTION public.advance_emergency_reports()
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
      fallback_key:=public.emergency_report_fallback(
        incident.property_id, report_row.owner_id, incident.assigned_to
      );
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

REVOKE ALL ON FUNCTION public.emergency_report_fallback(uuid,uuid,uuid),
  public.emergency_report_coverage(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.emergency_report_fallback(uuid,uuid,uuid),
  public.emergency_report_coverage(uuid) TO service_role;
