-- Service-only projection: the API supplies the authenticated actor. No new direct
-- jobs SELECT grant is needed for designated payers or private property fields.
CREATE INDEX IF NOT EXISTS messages_inbox_activity ON public.messages(job_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS messages_inbox_unread ON public.messages(receiver_id,job_id) WHERE read=false;
CREATE FUNCTION public.list_message_inbox(p_actor uuid,p_limit integer DEFAULT 20,p_snapshot timestamptz DEFAULT now(),p_before timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL)
RETURNS TABLE(job jsonb,last_message jsonb,unread_count bigint,last_activity timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
 WITH authorized AS (
 SELECT j.id,j.title,j.homeowner_id,j.payer_user_id,j.contractor_id,j.created_at
 FROM public.jobs j WHERE p_actor IS NOT NULL AND p_actor IN (j.homeowner_id,j.payer_user_id,j.contractor_id)
 AND j.created_at<=p_snapshot
 ), activity AS (
 SELECT j.*,m.content,m.message_type,m.created_at AS message_at,
 coalesce(m.created_at,j.created_at) AS activity_at
 FROM authorized j LEFT JOIN LATERAL (
 SELECT content,message_type,created_at FROM public.messages WHERE job_id=j.id AND created_at<=p_snapshot ORDER BY created_at DESC,id DESC LIMIT 1
 ) m ON true
 WHERE j.contractor_id IS NOT NULL OR m.created_at IS NOT NULL
 ), page AS (
 SELECT * FROM activity WHERE p_before IS NULL OR activity_at<p_before OR (activity_at=p_before AND id<p_before_id)
 ORDER BY activity_at DESC,id DESC LIMIT greatest(1,least(p_limit,51))
 )
 SELECT jsonb_build_object('id',p.id,'title',p.title,'homeowner_id',p.homeowner_id,'payer_user_id',p.payer_user_id,'contractor_id',p.contractor_id,
 'homeowner',to_jsonb(h),'payer',to_jsonb(y),'contractor',to_jsonb(c)),
 CASE WHEN p.message_at IS NOT NULL THEN jsonb_build_object('content',p.content,'message_type',p.message_type,'created_at',p.message_at) END,
 (SELECT count(*) FROM public.messages m WHERE m.job_id=p.id AND m.receiver_id=p_actor AND m.read=false),p.activity_at
 FROM page p
 LEFT JOIN public.profile_directory h ON h.id=p.homeowner_id
 LEFT JOIN public.profile_directory y ON y.id=p.payer_user_id
 LEFT JOIN public.profile_directory c ON c.id=p.contractor_id
 ORDER BY p.activity_at DESC,p.id DESC;
$$;
REVOKE ALL ON FUNCTION public.list_message_inbox(uuid,integer,timestamptz,timestamptz,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_message_inbox(uuid,integer,timestamptz,timestamptz,uuid) TO service_role;
NOTIFY pgrst,'reload schema';
