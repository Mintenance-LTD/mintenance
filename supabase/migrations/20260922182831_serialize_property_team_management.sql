-- Keep legacy direct inserts safe while application callers move to the RPC.
CREATE OR REPLACE FUNCTION public.enforce_property_team_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM 1 FROM public.properties WHERE id=NEW.property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found' USING ERRCODE='P0002'; END IF;
  NEW.email := lower(btrim(NEW.email));
  IF NEW.email='' THEN RAISE EXCEPTION 'Email is required' USING ERRCODE='23514'; END IF;
  IF EXISTS (SELECT 1 FROM public.property_team_members WHERE property_id=NEW.property_id
    AND lower(btrim(email))=NEW.email AND id<>NEW.id) THEN
    RAISE EXCEPTION 'This email has already been invited' USING ERRCODE='23505';
  END IF;
  IF (SELECT count(*) FROM public.property_team_members WHERE property_id=NEW.property_id AND id<>NEW.id)>=10 THEN
    RAISE EXCEPTION 'Team member limit reached (maximum 10 per property)' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_property_team_capacity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER property_team_capacity BEFORE INSERT OR UPDATE OF property_id,email
ON public.property_team_members FOR EACH ROW EXECUTE FUNCTION public.enforce_property_team_capacity();

CREATE OR REPLACE FUNCTION public.manage_property_team(
  p_property_id uuid, p_actor_id uuid, p_action text, p_email text DEFAULT NULL,
  p_role text DEFAULT NULL, p_member_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_owner uuid; v_member public.property_team_members%ROWTYPE; v_allowed boolean := false;
BEGIN
  SELECT owner_id INTO v_owner FROM public.properties WHERE id=p_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found' USING ERRCODE='P0002'; END IF;
  v_allowed := p_actor_id=v_owner OR EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor_id AND role='admin');
  IF NOT coalesce(v_allowed,false) THEN
    PERFORM 1 FROM public.property_team_members WHERE property_id=p_property_id
      AND user_id=p_actor_id AND status='accepted' AND role='admin' FOR UPDATE;
    v_allowed := FOUND;
  END IF;
  IF NOT coalesce(v_allowed,false) THEN RAISE EXCEPTION 'Team administration not permitted' USING ERRCODE='42501'; END IF;
  IF p_action='invite' THEN
    IF p_email IS NULL OR length(btrim(p_email))>254 OR btrim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      OR p_role IS NULL OR p_role NOT IN ('admin','manager','viewer') THEN
      RAISE EXCEPTION 'Invalid invitation' USING ERRCODE='23514';
    END IF;
    INSERT INTO public.property_team_members(property_id,invited_by,email,role,status)
      VALUES(p_property_id,p_actor_id,lower(btrim(p_email)),p_role,'pending') RETURNING * INTO v_member;
    RETURN to_jsonb(v_member);
  ELSIF p_action='remove' THEN
    DELETE FROM public.property_team_members WHERE id=p_member_id AND property_id=p_property_id RETURNING * INTO v_member;
    IF NOT FOUND THEN RAISE EXCEPTION 'Team member not found' USING ERRCODE='P0002'; END IF;
    RETURN jsonb_build_object('id',v_member.id,'removed',true);
  END IF;
  RAISE EXCEPTION 'Invalid team action' USING ERRCODE='23514';
END $$;
REVOKE ALL ON FUNCTION public.manage_property_team(uuid,uuid,text,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manage_property_team(uuid,uuid,text,text,text,uuid) TO service_role;
