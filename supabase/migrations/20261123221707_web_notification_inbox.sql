-- Collapse multiple notices for the same review without deleting their history.
CREATE FUNCTION public.notification_approval_key(
  p_type text, p_action_url text, p_metadata jsonb
)
RETURNS text LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  WITH targets AS (
    SELECT
      lower(substring(p_metadata->>'escrowId' FROM '^([0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})$')) AS escrow_id,
      lower(coalesce(
        substring(p_metadata->>'jobId' FROM '^([0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})$'),
        substring(p_action_url FROM '^/jobs/([0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})(?:[?#].*)?$')
      )) AS job_id
  )
  SELECT CASE
    WHEN p_type IN ('approval_reminder','escrow_approval_request','escrow_reminder','escrow_final_warning')
         AND escrow_id IS NOT NULL THEN 'escrow:' || escrow_id
    WHEN (p_type = 'job_completed' AND p_action_url LIKE '/jobs/%')
         OR (p_type = 'job_update' AND p_metadata->>'event' = 'job_completed')
         OR p_type = 'approval_reminder'
      THEN 'job:' || job_id
  END
  FROM targets;
$$;

CREATE FUNCTION public.web_notification_unread_count(p_user uuid, p_excluded_types text[])
RETURNS bigint LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  SELECT count(DISTINCT coalesce(
    public.notification_approval_key(n.type, n.action_url, n.metadata), n.id::text
  ))
  FROM public.notifications n
  WHERE n.user_id = p_user AND n.read IS NOT TRUE
    AND NOT (coalesce(n.type, '') = ANY(p_excluded_types));
$$;

CREATE FUNCTION public.web_notification_inbox(
  p_user uuid, p_excluded_types text[], p_limit integer,
  p_before timestamptz DEFAULT NULL, p_before_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid, type text, title text, message text, read boolean,
  created_at timestamptz, action_url text, metadata jsonb, approval_key text
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  WITH keyed AS (
    SELECT n.id, n.type, n.title, n.message, n.read, n.action_url, n.metadata,
      coalesce(n.created_at, '1970-01-01 UTC'::timestamptz) AS created_at,
      public.notification_approval_key(n.type, n.action_url, n.metadata) AS approval_key
    FROM public.notifications n
    WHERE n.user_id = p_user AND NOT (coalesce(n.type, '') = ANY(p_excluded_types))
  ), grouped AS (
    SELECT k.*,
      bool_and(k.read IS TRUE) OVER by_action AS group_read,
      row_number() OVER (
        by_action ORDER BY k.created_at DESC, k.id DESC
      ) AS position
    FROM keyed k
    WINDOW by_action AS (PARTITION BY coalesce(k.approval_key, k.id::text))
  )
  SELECT g.id, g.type::text, g.title::text, g.message, g.group_read,
    g.created_at, g.action_url, g.metadata, g.approval_key
  FROM grouped g
  WHERE g.position = 1
    AND (p_before IS NULL OR (g.created_at, g.id) < (p_before, p_before_id))
  ORDER BY g.created_at DESC, g.id DESC
  LIMIT greatest(1, least(p_limit, 101));
$$;

CREATE FUNCTION public.update_web_notification_group(
  p_user uuid, p_notifications uuid[], p_delete boolean
)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  target_ids uuid[];
  approval_keys text[];
BEGIN
  SELECT array_agg(n.id),
    array_agg(DISTINCT public.notification_approval_key(n.type, n.action_url, n.metadata))
  INTO target_ids, approval_keys FROM public.notifications n
  WHERE n.user_id = p_user AND n.id = ANY(p_notifications);
  IF target_ids IS NULL THEN RETURN false; END IF;

  IF p_delete THEN
    DELETE FROM public.notifications n
    WHERE n.user_id = p_user AND (
      n.id = ANY(target_ids) OR
      public.notification_approval_key(n.type, n.action_url, n.metadata) = ANY(approval_keys)
    );
  ELSE
    UPDATE public.notifications n SET read = true
    WHERE n.user_id = p_user AND n.read IS NOT TRUE AND (
      n.id = ANY(target_ids) OR
      public.notification_approval_key(n.type, n.action_url, n.metadata) = ANY(approval_keys)
    );
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.notification_approval_key(text,text,jsonb),
  public.web_notification_unread_count(uuid,text[]),
  public.web_notification_inbox(uuid,text[],integer,timestamptz,uuid),
  public.update_web_notification_group(uuid,uuid[],boolean)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notification_approval_key(text,text,jsonb),
  public.web_notification_unread_count(uuid,text[]),
  public.web_notification_inbox(uuid,text[],integer,timestamptz,uuid),
  public.update_web_notification_group(uuid,uuid[],boolean)
TO service_role;
