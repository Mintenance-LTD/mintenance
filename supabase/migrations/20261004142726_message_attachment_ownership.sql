CREATE OR REPLACE FUNCTION public.can_attach_message_file(p_path text, p_sender uuid, p_job uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM storage.objects o
    JOIN public.jobs j ON j.id = p_job
    WHERE o.bucket_id = 'job-attachments' AND o.name = p_path
      AND p_sender IN (j.homeowner_id, j.contractor_id, j.payer_user_id)
      AND (string_to_array(o.name, '/'))[1] IN (p_sender::text, p_job::text)
      AND (o.owner_id = p_sender::text OR o.owner = p_sender
        OR (o.owner_id IS NULL AND o.owner IS NULL
          AND (string_to_array(o.name, '/'))[1] = p_sender::text))
  );
$$;
REVOKE ALL ON FUNCTION public.can_attach_message_file(text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_attach_message_file(text, uuid, uuid) TO service_role;
NOTIFY pgrst, 'reload schema';
