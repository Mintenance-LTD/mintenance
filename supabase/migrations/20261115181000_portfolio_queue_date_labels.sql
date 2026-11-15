-- Filters are applied after access checks and before totals/pagination. Existing RPC remains compatible.
CREATE OR REPLACE FUNCTION public.portfolio_filtered_action_queue(
 p_user_id uuid, p_offset integer DEFAULT 0, p_limit integer DEFAULT 25, p_scope text DEFAULT 'team',
 p_property uuid DEFAULT NULL, p_priority integer DEFAULT NULL, p_person text DEFAULT '', p_sort text DEFAULT 'priority')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_scope IS NULL OR p_scope NOT IN ('team','mine','unassigned') THEN
  RAISE EXCEPTION 'Invalid queue scope' USING ERRCODE='22023'; END IF;
 IF p_sort NOT IN ('priority','due','property','person') OR (p_priority IS NOT NULL AND p_priority NOT BETWEEN 0 AND 2) OR length(p_person)>100 THEN
  RAISE EXCEPTION 'Invalid queue filters' USING ERRCODE='22023'; END IF;
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
    WHEN j.scheduled_start_date>=now() THEN 'Review scheduled job start' ELSE 'Review progress' END AS next_action,
   coalesce(j.scheduled_end_date,j.scheduled_start_date) AS due_at,
   CASE WHEN j.scheduled_end_date IS NOT NULL THEN 'Job end' ELSE 'Job start' END AS due_label,
   CASE WHEN j.scheduled_end_date<now() THEN 0 WHEN j.contractor_id IS NULL THEN 1 ELSE 2 END AS urgency
  FROM public.jobs j JOIN accessible p ON p.id=j.property_id
  WHERE j.status IN ('open','posted','assigned','in_progress','disputed')
  UNION ALL
  SELECT 'report',r.id,p.id,p.property_name,left(r.description,120),r.status::text,false,true,
   'Review tenant report',r.created_at,'Reported',CASE WHEN r.urgency IN ('high','emergency') THEN 0 ELSE 1 END
  FROM public.anonymous_reports r JOIN accessible p ON p.id=r.property_id
  WHERE p.owner_id=p_user_id AND r.status IN ('new','acknowledged')
  UNION ALL
  SELECT 'maintenance',s.id,p.id,p.property_name,s.title,'scheduled',false,p.can_manage_followup,
   'Arrange maintenance',s.next_due_date::timestamptz,'Maintenance due',CASE WHEN s.next_due_date<current_date THEN 0 ELSE 2 END
  FROM public.recurring_schedules s JOIN accessible p ON p.id=s.property_id
  WHERE s.is_active AND s.next_due_date<=current_date+30
  UNION ALL
  SELECT 'certificate',c.id,p.id,p.property_name,replace(c.cert_type,'_',' '),c.status::text,false,p.can_manage_followup,
   'Review certificate expiry',c.expiry_date::timestamptz,'Certificate expiry',CASE WHEN c.expiry_date<current_date THEN 0 ELSE 2 END
  FROM public.compliance_certificates c JOIN accessible p ON p.id=c.property_id
  WHERE c.expiry_date<=current_date+30
 ), ranked AS (
  SELECT a.kind,a.id,a.property_id,a.property_name,a.title,a.status,a.can_open_job,a.can_manage_followup,
   CASE WHEN f.kind IS NOT NULL THEN 'Awaiting '||f.waiting_for ELSE a.next_action END AS next_action,
   coalesce(f.due_at,a.due_at) AS due_at,
   CASE WHEN f.due_at IS NOT NULL THEN 'Follow-up due' ELSE a.due_label END AS due_label,
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
  SELECT * FROM ranked WHERE (p_scope='team' OR (p_scope='mine' AND assigned_to=p_user_id)
   OR (p_scope='unassigned' AND assigned_to IS NULL))
   AND (p_property IS NULL OR property_id=p_property) AND (p_priority IS NULL OR urgency=p_priority)
   AND (p_person='' OR strpos(lower(coalesce(assignee_name,'Unassigned')),lower(p_person))>0)
 ), page AS (
  SELECT * FROM filtered ORDER BY CASE WHEN p_sort='property' THEN lower(property_name) WHEN p_sort='person' THEN lower(coalesce(assignee_name,'Unassigned')) END NULLS LAST, CASE WHEN p_sort='priority' THEN urgency END NULLS LAST, due_at NULLS LAST,kind,id
  LIMIT greatest(1,least(p_limit,100)) OFFSET greatest(0,p_offset)
 ) SELECT jsonb_build_object(
  'properties',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',property_name) ORDER BY property_name,id) FROM accessible),'[]'::jsonb),
  'scope',p_scope,'items',coalesce((SELECT jsonb_agg(to_jsonb(page) ORDER BY CASE WHEN p_sort='property' THEN lower(property_name) WHEN p_sort='person' THEN lower(coalesce(assignee_name,'Unassigned')) END NULLS LAST, CASE WHEN p_sort='priority' THEN urgency END NULLS LAST, due_at NULLS LAST,kind,id) FROM page),'[]'::jsonb),
  'total',(SELECT count(*) FROM filtered),'overdue',(SELECT count(*) FROM filtered WHERE urgency=0),
  'hasMore',(SELECT count(*) FROM filtered)>greatest(0,p_offset)+greatest(1,least(p_limit,100)))
 );
END $$;
REVOKE ALL ON FUNCTION public.portfolio_filtered_action_queue(uuid,integer,integer,text,uuid,integer,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.portfolio_filtered_action_queue(uuid,integer,integer,text,uuid,integer,text,text) TO service_role;
