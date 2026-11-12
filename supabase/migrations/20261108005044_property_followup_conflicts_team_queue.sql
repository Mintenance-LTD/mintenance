-- Local migration only. Deploy compatible PT409 API handling before applying.
SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE FUNCTION public.save_property_action_followup(p_actor uuid,p_property uuid,p_kind text,p_source uuid,p_revision integer,p_assignee uuid,p_due timestamptz,p_waiting text,p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE owner_key uuid; current_row public.property_action_followups%ROWTYPE; source_property uuid; notification_key uuid;
BEGIN
 IF p_actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND deleted_at IS NULL) THEN
 RAISE EXCEPTION 'Property access denied' USING ERRCODE='42501'; END IF;
 IF p_revision IS NULL OR p_revision<0 OR p_waiting IS NULL OR p_waiting NOT IN ('manager','tenant','contractor','approval')
 OR length(coalesce(p_note,''))>5000 THEN RAISE EXCEPTION 'Invalid follow-up' USING ERRCODE='22023'; END IF;
 SELECT owner_id INTO owner_key FROM public.properties WHERE id=p_property FOR SHARE;
 IF NOT FOUND OR (owner_key<>p_actor AND NOT EXISTS(SELECT 1 FROM public.property_team_members WHERE property_id=p_property AND user_id=p_actor AND status='accepted' AND role IN ('admin','manager'))) THEN
 RAISE EXCEPTION 'Property access denied' USING ERRCODE='42501'; END IF;
 CASE p_kind
 WHEN 'job' THEN SELECT property_id INTO source_property FROM public.jobs WHERE id=p_source;
 WHEN 'report' THEN SELECT property_id INTO source_property FROM public.anonymous_reports WHERE id=p_source;
 WHEN 'maintenance' THEN SELECT property_id INTO source_property FROM public.recurring_schedules WHERE id=p_source;
 WHEN 'certificate' THEN SELECT property_id INTO source_property FROM public.compliance_certificates WHERE id=p_source;
 ELSE RAISE EXCEPTION 'Invalid source' USING ERRCODE='22023'; END CASE;
 IF source_property IS DISTINCT FROM p_property OR (p_kind='report' AND owner_key<>p_actor) THEN RAISE EXCEPTION 'Invalid source access' USING ERRCODE='42501'; END IF;
 IF p_assignee IS NOT NULL AND (NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_assignee AND deleted_at IS NULL)
 OR (p_assignee<>owner_key AND NOT EXISTS(SELECT 1 FROM public.property_team_members WHERE property_id=p_property AND user_id=p_assignee AND status='accepted' AND role IN ('admin','manager')))) THEN
 RAISE EXCEPTION 'Invalid assignee' USING ERRCODE='22023'; END IF;
 INSERT INTO public.property_action_followups(kind,source_id,property_id) VALUES(p_kind,p_source,p_property) ON CONFLICT DO NOTHING;
 SELECT * INTO current_row FROM public.property_action_followups WHERE kind=p_kind AND source_id=p_source FOR UPDATE;
 IF current_row.revision<>p_revision OR current_row.property_id IS DISTINCT FROM p_property THEN
 RAISE EXCEPTION 'Follow-up changed; reload before saving' USING ERRCODE='PT409'; END IF;
 UPDATE public.property_action_followups SET assigned_to=p_assignee,due_at=p_due,waiting_for=p_waiting,revision=revision+1,updated_at=now()
 WHERE kind=p_kind AND source_id=p_source RETURNING * INTO current_row;
 IF p_assignee IS NOT NULL AND p_assignee<>p_actor THEN
 INSERT INTO public.notification_queue(user_id,notification_type,priority,title,message,action_url,metadata,scheduled_for)
 VALUES(p_assignee,'property_followup','medium','Property follow-up updated','A property follow-up assigned to you has been updated.',
 '/properties/'||p_property::text,jsonb_build_object('propertyId',p_property,'followupRevision',current_row.revision),now()) RETURNING id INTO notification_key;
 END IF;
 INSERT INTO public.property_action_updates(kind,source_id,author_id,body,notification_id) VALUES(p_kind,p_source,p_actor,
 concat('Waiting for: ',p_waiting,E'\nDue: ',coalesce(p_due::text,'not set'),E'\nAssignee: ',coalesce(p_assignee::text,'unassigned'),E'\n',coalesce(p_note,'')),notification_key);
 RETURN to_jsonb(current_row);
END $$;
REVOKE ALL ON FUNCTION public.save_property_action_followup(uuid,uuid,text,uuid,integer,uuid,timestamptz,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_property_action_followup(uuid,uuid,text,uuid,integer,uuid,timestamptz,text,text) TO service_role;

-- Separate RPC avoids ambiguous PostgREST overloads; filter before count/pagination.
CREATE OR REPLACE FUNCTION public.portfolio_team_action_queue(
 p_user_id uuid, p_offset integer DEFAULT 0, p_limit integer DEFAULT 25, p_scope text DEFAULT 'team')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_scope IS NULL OR p_scope NOT IN ('team','mine','unassigned') THEN
  RAISE EXCEPTION 'Invalid queue scope' USING ERRCODE='22023'; END IF;
 RETURN (
 WITH accessible AS (
  SELECT p.id,p.property_name,p.owner_id,
   (p.owner_id=p_user_id OR EXISTS(SELECT 1 FROM public.property_team_members m
    WHERE m.property_id=p.id AND m.user_id=p_user_id AND m.status='accepted' AND m.role IN ('admin','manager'))) AS can_manage_followup
  FROM public.properties p
  JOIN public.profiles actor ON actor.id=p_user_id AND actor.deleted_at IS NULL
  WHERE p.owner_id=p_user_id OR EXISTS(SELECT 1 FROM public.property_team_members m
   WHERE m.property_id=p.id AND m.user_id=p_user_id AND m.status='accepted' AND m.role IN ('admin','manager','viewer'))
 ), actions AS (
  SELECT 'job'::text AS kind,j.id,p.id AS property_id,p.property_name,j.title,j.status::text,
   (j.homeowner_id=p_user_id) AS can_open_job,p.can_manage_followup,
   CASE WHEN j.scheduled_end_date<now() THEN 'Review overdue work' WHEN j.contractor_id IS NULL THEN 'Assign a contractor'
    WHEN j.scheduled_start_date>=now() THEN 'Confirm upcoming visit' ELSE 'Review progress' END AS next_action,
   coalesce(j.scheduled_end_date,j.scheduled_start_date) AS due_at,
   CASE WHEN j.scheduled_end_date<now() THEN 0 WHEN j.contractor_id IS NULL THEN 1 ELSE 2 END AS urgency
  FROM public.jobs j JOIN accessible p ON p.id=j.property_id
  WHERE j.status IN ('open','posted','assigned','in_progress','disputed')
  UNION ALL
  SELECT 'report',r.id,p.id,p.property_name,left(r.description,120),r.status::text,false,true,
   'Review tenant report',r.created_at,CASE WHEN r.urgency IN ('high','emergency') THEN 0 ELSE 1 END
  FROM public.anonymous_reports r JOIN accessible p ON p.id=r.property_id
  WHERE p.owner_id=p_user_id AND r.status IN ('new','acknowledged')
  UNION ALL
  SELECT 'maintenance',s.id,p.id,p.property_name,s.title,'scheduled',false,p.can_manage_followup,
   'Arrange maintenance',s.next_due_date::timestamptz,CASE WHEN s.next_due_date<current_date THEN 0 ELSE 2 END
  FROM public.recurring_schedules s JOIN accessible p ON p.id=s.property_id
  WHERE s.is_active AND s.next_due_date<=current_date+30
  UNION ALL
  SELECT 'certificate',c.id,p.id,p.property_name,replace(c.cert_type,'_',' '),c.status::text,false,p.can_manage_followup,
   'Review certificate expiry',c.expiry_date::timestamptz,CASE WHEN c.expiry_date<current_date THEN 0 ELSE 2 END
  FROM public.compliance_certificates c JOIN accessible p ON p.id=c.property_id
  WHERE c.expiry_date<=current_date+30
 ), ranked AS (
  SELECT a.kind,a.id,a.property_id,a.property_name,a.title,a.status,a.can_open_job,a.can_manage_followup,
   CASE WHEN f.kind IS NOT NULL THEN 'Awaiting '||f.waiting_for ELSE a.next_action END AS next_action,
   coalesce(f.due_at,a.due_at) AS due_at,
   CASE WHEN f.due_at<now() THEN 0 ELSE a.urgency END AS urgency,
   assignee.id AS assigned_to,
   CASE WHEN assignee.id IS NOT NULL THEN coalesce(nullif(btrim(concat_ws(' ',assignee.first_name,assignee.last_name)),''),'Property team member') END AS assignee_name,
   CASE WHEN f.assigned_to IS NULL THEN 'unassigned' WHEN assignee.id IS NULL THEN 'needs_reassignment' ELSE 'assigned' END AS assignment_status
  FROM actions a JOIN accessible p ON p.id=a.property_id
  LEFT JOIN public.property_action_followups f ON f.kind=a.kind AND f.source_id=a.id AND f.property_id=a.property_id
  LEFT JOIN public.profiles assignee ON assignee.id=f.assigned_to AND assignee.deleted_at IS NULL
   AND (assignee.id=p.owner_id OR EXISTS(SELECT 1 FROM public.property_team_members m
    WHERE m.property_id=p.id AND m.user_id=assignee.id AND m.status='accepted' AND m.role IN ('admin','manager')))
 ), filtered AS (
  SELECT * FROM ranked WHERE p_scope='team' OR (p_scope='mine' AND assigned_to=p_user_id)
   OR (p_scope='unassigned' AND assigned_to IS NULL)
 ), page AS (
  SELECT * FROM filtered ORDER BY urgency,due_at NULLS LAST,kind,id
  LIMIT greatest(1,least(p_limit,100)) OFFSET greatest(0,p_offset)
 ) SELECT jsonb_build_object(
  'scope',p_scope,'items',coalesce((SELECT jsonb_agg(to_jsonb(page) ORDER BY urgency,due_at NULLS LAST,kind,id) FROM page),'[]'::jsonb),
  'total',(SELECT count(*) FROM filtered),'overdue',(SELECT count(*) FROM filtered WHERE urgency=0),
  'hasMore',(SELECT count(*) FROM filtered)>greatest(0,p_offset)+greatest(1,least(p_limit,100)))
 );
END $$;
REVOKE ALL ON FUNCTION public.portfolio_team_action_queue(uuid,integer,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.portfolio_team_action_queue(uuid,integer,integer,text) TO service_role;

-- Old clients retain the original signature and all-team meaning.
CREATE OR REPLACE FUNCTION public.portfolio_action_queue(p_user_id uuid,p_offset integer DEFAULT 0,p_limit integer DEFAULT 25)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT public.portfolio_team_action_queue(p_user_id,p_offset,p_limit,'team');
$$;
REVOKE ALL ON FUNCTION public.portfolio_action_queue(uuid,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.portfolio_action_queue(uuid,integer,integer) TO service_role;
