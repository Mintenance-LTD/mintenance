-- Explicit Portfolio onboarding. Property sharing does not grant workspace membership.
CREATE OR REPLACE FUNCTION public.setup_portfolio_workspace(
  p_actor_id uuid,
  p_property_id uuid,
  p_org_id uuid,
  p_name text
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
DECLARE
  v_property_owner uuid;
  v_current_org uuid;
  v_org_id uuid;
  v_name text := nullif(btrim(p_name), '');
BEGIN
  SELECT owner_id, org_id INTO v_property_owner, v_current_org
    FROM public.properties WHERE id = p_property_id FOR UPDATE;
  IF NOT FOUND OR v_property_owner IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'Property not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_org_id IS NOT NULL THEN
    SELECT o.id INTO v_org_id
      FROM public.organizations o
      JOIN public.organization_memberships m ON m.org_id = o.id
      WHERE o.id = p_org_id AND o.organization_type IN ('portfolio', 'agency', 'property_management')
        AND m.user_id = p_actor_id AND m.status = 'active' AND m.org_role = 'owner'
      FOR UPDATE OF m;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Workspace ownership required' USING ERRCODE = '42501';
    END IF;
    IF v_current_org = v_org_id THEN RETURN v_org_id; END IF;
  ELSIF v_name IS NULL OR length(v_name) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'Invalid workspace name' USING ERRCODE = '22023';
  END IF;

  IF v_current_org IS NOT NULL THEN
    RAISE EXCEPTION 'Property is already linked' USING ERRCODE = '23505';
  END IF;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, organization_type, created_by)
      VALUES (v_name, 'agency', p_actor_id) RETURNING id INTO v_org_id;
    INSERT INTO public.organization_memberships (org_id, user_id, org_role, status)
      VALUES (v_org_id, p_actor_id, 'owner', 'active');
  END IF;

  UPDATE public.properties SET org_id = v_org_id WHERE id = p_property_id;
  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.setup_portfolio_workspace(uuid,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.setup_portfolio_workspace(uuid,uuid,uuid,text) TO service_role;
