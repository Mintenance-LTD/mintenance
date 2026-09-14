-- Only trusted writes can attach a private upload to a shareable property.
CREATE TABLE public.property_photo_bindings (
 property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
 path text NOT NULL,
 attached_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(property_id,path)
);
CREATE INDEX property_photo_bindings_path_idx ON public.property_photo_bindings(path);
ALTER TABLE public.property_photo_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_photo_bindings FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.property_photo_bindings TO service_role;

CREATE FUNCTION public.save_property_with_photo_bindings(
 p_actor_id uuid, p_property_id uuid, p_fields jsonb, p_paths text[], p_create boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_property public.properties; v_actor_role text; v_path text;
BEGIN
 IF p_actor_id IS NULL OR p_property_id IS NULL OR p_create IS NULL
   OR p_fields IS NULL OR jsonb_typeof(p_fields)<>'object' OR p_paths IS NULL THEN
  RAISE EXCEPTION 'Invalid property request' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT FROM jsonb_object_keys(p_fields) k WHERE k NOT IN
  ('property_name','address','property_type','is_primary','photos','city','postcode','country',
   'bedrooms','bathrooms','square_footage','year_built','latitude','longitude','updated_at')) THEN
  RAISE EXCEPTION 'Unsupported property field' USING ERRCODE='22023';
 END IF;
 SELECT role INTO v_actor_role FROM public.profiles WHERE id=p_actor_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown actor' USING ERRCODE='42501'; END IF;
 IF p_create THEN
  -- Serialize primary-property changes for this owner and roll them back on failure.
  PERFORM 1 FROM public.profiles WHERE id=p_actor_id FOR UPDATE;
  INSERT INTO public.properties(id,owner_id,property_name,address,property_type)
   VALUES(p_property_id,p_actor_id,p_fields->>'property_name',p_fields->>'address',p_fields->>'property_type');
 END IF;
 SELECT * INTO v_property FROM public.properties WHERE id=p_property_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Property not found' USING ERRCODE='P0002'; END IF;
 IF v_property.owner_id<>p_actor_id AND v_actor_role<>'admin' AND NOT EXISTS (
  SELECT FROM public.property_team_members WHERE property_id=p_property_id AND user_id=p_actor_id
   AND status='accepted' AND role IN ('admin','manager')) THEN
  RAISE EXCEPTION 'Property edit not permitted' USING ERRCODE='42501';
 END IF;
 IF NOT p_create AND p_fields ? 'is_primary' THEN
  RAISE EXCEPTION 'Primary property changes require a separate operation' USING ERRCODE='22023';
 END IF;
 IF p_fields ? 'photos' THEN
  IF jsonb_typeof(p_fields->'photos')<>'array' THEN
   RAISE EXCEPTION 'Photos must be an array' USING ERRCODE='22023';
  END IF;
  FOREACH v_path IN ARRAY p_paths LOOP
   IF v_path IS NULL OR NOT EXISTS (
    SELECT FROM storage.objects o WHERE o.bucket_id='Job-storage' AND o.name=v_path AND
      (o.owner_id=p_actor_id::text OR o.owner=p_actor_id
       OR o.name LIKE 'property-photos/'||p_actor_id::text||'/%'
       OR EXISTS(SELECT FROM public.property_photo_bindings b
          WHERE b.property_id=p_property_id AND b.path=o.name))) THEN
    RAISE EXCEPTION 'A private photo is unavailable or is not your upload; remove it or upload a replacement'
      USING ERRCODE='42501';
   END IF;
  END LOOP;
 ELSIF cardinality(p_paths)>0 THEN
  RAISE EXCEPTION 'Photo paths require photos' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_property FROM jsonb_populate_record(v_property,p_fields);
 IF p_create AND v_property.is_primary THEN
  UPDATE public.properties SET is_primary=false WHERE owner_id=p_actor_id AND id<>p_property_id AND is_primary;
 END IF;
 UPDATE public.properties SET
  property_name=v_property.property_name,address=v_property.address,property_type=v_property.property_type,
  is_primary=v_property.is_primary,photos=v_property.photos,city=v_property.city,postcode=v_property.postcode,
  country=v_property.country,bedrooms=v_property.bedrooms,bathrooms=v_property.bathrooms,
  square_footage=v_property.square_footage,year_built=v_property.year_built,
  latitude=v_property.latitude,longitude=v_property.longitude,updated_at=now()
 WHERE id=p_property_id RETURNING * INTO v_property;
 IF p_fields ? 'photos' THEN
  DELETE FROM public.property_photo_bindings WHERE property_id=p_property_id AND NOT(path=ANY(p_paths));
  INSERT INTO public.property_photo_bindings(property_id,path,attached_by)
   SELECT p_property_id,x,p_actor_id FROM unnest(p_paths) x ON CONFLICT DO NOTHING;
 END IF;
 RETURN to_jsonb(v_property);
END $$;
REVOKE ALL ON FUNCTION public.save_property_with_photo_bindings(uuid,uuid,jsonb,text[],boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_property_with_photo_bindings(uuid,uuid,jsonb,text[],boolean) TO service_role;

-- Authorize from storage ownership and the path's job, never an editable URL array.
CREATE OR REPLACE FUNCTION public.authorized_private_photo_paths(p_actor_id uuid, p_paths text[])
RETURNS TABLE(path text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT o.name FROM storage.objects o
 JOIN public.profiles actor ON actor.id=p_actor_id
 WHERE o.bucket_id='Job-storage' AND o.name=ANY(p_paths) AND (
   EXISTS(SELECT FROM public.property_photo_bindings b JOIN public.properties p ON p.id=b.property_id
    WHERE b.path=o.name AND (p.owner_id=p_actor_id OR EXISTS(
      SELECT FROM public.property_team_members t WHERE t.property_id=p.id
       AND t.user_id=p_actor_id AND t.status='accepted'))) OR
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
