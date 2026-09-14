-- Authorize from storage ownership and the path's job, never an editable URL array.
CREATE FUNCTION public.authorized_private_photo_paths(p_actor_id uuid, p_paths text[])
RETURNS TABLE(path text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT o.name FROM storage.objects o
 JOIN public.profiles actor ON actor.id=p_actor_id
 WHERE o.bucket_id='Job-storage' AND o.name=ANY(p_paths) AND (
   actor.role='admin' OR o.owner_id=p_actor_id::text OR o.owner=p_actor_id OR
   o.name LIKE 'property-photos/'||p_actor_id::text||'/%' OR
   (split_part(o.name,'/',1)='job-photos' AND array_length(string_to_array(o.name,'/'),1)=2
     AND position('-'||p_actor_id::text||'-' IN split_part(o.name,'/',2)) > 0) OR
   (split_part(o.name,'/',1)='property-room-photos' AND
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id::text=split_part(o.name,'/',3)
      AND (p.owner_id=p_actor_id OR EXISTS (
        SELECT 1 FROM public.property_team_members t WHERE t.property_id=p.id
          AND t.user_id=p_actor_id AND t.status='accepted')))) OR
   EXISTS (SELECT 1 FROM public.jobs j WHERE
     (j.id::text=split_part(o.name,'/',1) OR
      (split_part(o.name,'/',1)='job-photos' AND j.id::text=split_part(o.name,'/',2))) AND
     (p_actor_id IN (j.homeowner_id,j.contractor_id,j.payer_user_id) OR
      (actor.role='contractor' AND j.status='posted')))
 );
$$;
REVOKE ALL ON FUNCTION public.authorized_private_photo_paths(uuid,text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authorized_private_photo_paths(uuid,text[]) TO service_role;
