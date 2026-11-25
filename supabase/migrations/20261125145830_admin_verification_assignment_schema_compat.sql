-- Use the task columns available in both hosted environments.
CREATE OR REPLACE FUNCTION public.assign_admin_verifications()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE candidate record; assignee uuid; assigned integer := 0;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('admin_verification_assignment'));

  UPDATE public.admin_verification_tasks t
  SET status = 'completed', completed_at = now()
  WHERE t.status = 'open' AND NOT EXISTS (
    SELECT 1 FROM public.admin_verification_queue q
    WHERE q.id = t.contractor_id AND q.queue_status NOT IN ('verified','rejected')
  );

  FOR candidate IN
    SELECT q.id FROM public.admin_verification_queue q
    LEFT JOIN public.admin_verification_tasks t ON t.contractor_id = q.id
    WHERE q.queue_status = 'ready' AND (t.id IS NULL OR (
      t.status = 'completed' AND t.email_status <> 'sending' AND q.latest_evidence_at > t.completed_at
    ))
    ORDER BY q.created_at, q.id LIMIT 100
  LOOP
    SELECT p.id INTO assignee FROM public.profiles p
    LEFT JOIN public.admin_verification_tasks t ON t.admin_id = p.id AND t.status = 'open'
    WHERE p.role = 'admin' AND p.deleted_at IS NULL AND p.is_available IS TRUE
    GROUP BY p.id ORDER BY count(t.id), max(t.created_at) NULLS FIRST, p.id LIMIT 1;
    EXIT WHEN assignee IS NULL;

    INSERT INTO public.admin_verification_tasks AS t (contractor_id, admin_id)
    VALUES (candidate.id, assignee)
    ON CONFLICT (contractor_id) DO UPDATE
    SET admin_id = excluded.admin_id, status = 'open', created_at = excluded.created_at,
        completed_at = NULL, email_status = 'pending'
    WHERE t.status = 'completed' AND t.email_status <> 'sending';
    IF FOUND THEN assigned := assigned + 1; END IF;
  END LOOP;
  RETURN assigned;
END $$;

REVOKE ALL ON FUNCTION public.assign_admin_verifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_admin_verifications() TO service_role;
