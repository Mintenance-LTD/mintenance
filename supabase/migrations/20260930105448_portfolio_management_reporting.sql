CREATE FUNCTION public.portfolio_management_report(p_user_id uuid,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
WITH accessible AS (
 SELECT p.id,p.property_name,p.owner_id FROM public.properties p WHERE p.owner_id=p_user_id OR EXISTS(
 SELECT 1 FROM public.property_team_members m WHERE m.property_id=p.id AND m.user_id=p_user_id AND m.status='accepted' AND m.role IN ('admin','manager','viewer'))
), page AS (SELECT * FROM accessible ORDER BY property_name,id LIMIT 25 OFFSET greatest(0,p_offset)), rows AS (
 SELECT p.id,p.property_name,
 (SELECT count(*) FROM public.jobs j WHERE j.property_id=p.id AND j.status IN ('open','posted','assigned','in_progress','disputed')) AS open_jobs,
 (SELECT count(*) FROM public.jobs j WHERE j.property_id=p.id AND j.status IN ('open','posted','assigned','in_progress','disputed') AND j.scheduled_end_date<now()) AS overdue_jobs,
 (SELECT count(*) FROM public.jobs j WHERE j.property_id=p.id AND j.status='completed') AS completed_jobs,
 (SELECT round(avg(extract(epoch FROM (j.completed_at-j.created_at))/86400),1) FROM public.jobs j WHERE j.property_id=p.id AND j.status='completed' AND j.completed_at>=j.created_at) AS average_completion_days,
 (SELECT count(*) FROM public.jobs j WHERE j.property_id=p.id AND j.status='completed' AND j.completed_at>=j.created_at) AS timed_completions,
 coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM (
 SELECT j.category,count(*) AS jobs FROM public.jobs j WHERE j.property_id=p.id AND j.status='completed' GROUP BY j.category HAVING count(*)>1) c),'[]'::jsonb) AS repeated_categories,
 coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM (
 SELECT j.contractor_id,count(*) AS completed_jobs,round(avg(extract(epoch FROM (j.completed_at-j.created_at))/86400) FILTER(WHERE j.completed_at>=j.created_at),1) AS average_completion_days
 FROM public.jobs j WHERE j.property_id=p.id AND j.status='completed' AND j.contractor_id IS NOT NULL GROUP BY j.contractor_id) c),'[]'::jsonb) AS contractor_activity,
 CASE WHEN p.owner_id=p_user_id THEN coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM (
 SELECT upper(coalesce(t.currency,'GBP')) AS currency,sum(t.amount) AS released_escrow FROM public.escrow_transactions t JOIN public.jobs j ON j.id=t.job_id
 WHERE j.property_id=p.id AND j.homeowner_id=p_user_id AND t.status='released' GROUP BY upper(coalesce(t.currency,'GBP'))) e),'[]'::jsonb) ELSE NULL END AS released_payments
 FROM page p
)
SELECT jsonb_build_object('properties',coalesce((SELECT jsonb_agg(to_jsonb(rows)) FROM rows),'[]'::jsonb),
 'hasMore',(SELECT count(*) FROM accessible)>greatest(0,p_offset)+25,'totalProperties',(SELECT count(*) FROM accessible));
$$;
REVOKE ALL ON FUNCTION public.portfolio_management_report(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.portfolio_management_report(uuid,integer) TO service_role;
