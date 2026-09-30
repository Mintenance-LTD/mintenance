CREATE OR REPLACE FUNCTION public.portfolio_action_queue(p_user_id uuid, p_offset integer DEFAULT 0, p_limit integer DEFAULT 25)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
WITH accessible AS (
  SELECT p.id, p.property_name, p.owner_id FROM public.properties p
  WHERE p.owner_id = p_user_id OR EXISTS (
    SELECT 1 FROM public.property_team_members m WHERE m.property_id=p.id
      AND m.user_id=p_user_id AND m.status='accepted' AND m.role IN ('admin','manager','viewer')
  )
), actions AS (
  SELECT 'job'::text AS kind, j.id, p.id AS property_id, p.property_name,
    j.title, j.status::text, (j.homeowner_id=p_user_id) AS can_open_job,
    CASE WHEN j.scheduled_end_date < now() THEN 'Review overdue work'
      WHEN j.contractor_id IS NULL THEN 'Assign a contractor'
      WHEN j.scheduled_start_date >= now() THEN 'Confirm upcoming visit' ELSE 'Review progress' END AS next_action,
    coalesce(j.scheduled_end_date,j.scheduled_start_date) AS due_at,
    CASE WHEN j.scheduled_end_date < now() THEN 0 WHEN j.contractor_id IS NULL THEN 1 ELSE 2 END AS urgency
  FROM public.jobs j JOIN accessible p ON p.id=j.property_id
  WHERE j.status IN ('open','posted','assigned','in_progress','disputed')
  UNION ALL
  SELECT 'report', r.id, p.id, p.property_name, left(r.description,120),r.status::text,false,
    'Review tenant report',r.created_at, CASE WHEN r.urgency IN ('high','emergency') THEN 0 ELSE 1 END
  FROM public.anonymous_reports r JOIN accessible p ON p.id=r.property_id
  WHERE p.owner_id=p_user_id AND r.status IN ('new','acknowledged')
  UNION ALL
  SELECT 'maintenance',s.id,p.id,p.property_name,s.title,'scheduled',false,'Arrange maintenance',s.next_due_date::timestamptz,
    CASE WHEN s.next_due_date < current_date THEN 0 ELSE 2 END
  FROM public.recurring_schedules s JOIN accessible p ON p.id=s.property_id
  WHERE s.is_active AND s.next_due_date <= current_date + 30
  UNION ALL
  SELECT 'certificate',c.id,p.id,p.property_name,replace(c.cert_type,'_',' '),c.status::text,false,
    'Review certificate expiry',c.expiry_date::timestamptz,CASE WHEN c.expiry_date < current_date THEN 0 ELSE 2 END
  FROM public.compliance_certificates c JOIN accessible p ON p.id=c.property_id
  WHERE c.expiry_date <= current_date + 30
), page AS (
  SELECT * FROM actions ORDER BY urgency,due_at NULLS LAST,kind,id
  LIMIT greatest(1,least(p_limit,100)) OFFSET greatest(0,p_offset)
)
SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(page)) FROM page),'[]'::jsonb),
  'total',(SELECT count(*) FROM actions),
  'overdue',(SELECT count(*) FROM actions WHERE urgency=0),
  'hasMore',(SELECT count(*) FROM actions) > greatest(0,p_offset)+greatest(1,least(p_limit,100)));
$$;
REVOKE ALL ON FUNCTION public.portfolio_action_queue(uuid,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.portfolio_action_queue(uuid,integer,integer) TO service_role;
