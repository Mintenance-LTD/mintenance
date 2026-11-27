-- Internal CRM only. A record is not a user account, an invitation, an
-- authorisation to spend, or a grant of access to the linked property.
CREATE TABLE public.agency_landlords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 160),
  approval_limit_pence integer CHECK (approval_limit_pence BETWEEN 0 AND 100000000),
  primary_manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  backup_manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  CHECK (primary_manager_id IS NULL OR backup_manager_id IS NULL OR primary_manager_id <> backup_manager_id)
);

CREATE TABLE public.agency_landlord_property_allocations (
  org_id uuid NOT NULL,
  landlord_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  PRIMARY KEY (org_id, property_id),
  FOREIGN KEY (org_id, landlord_id) REFERENCES public.agency_landlords(org_id, id) ON DELETE CASCADE
);
CREATE INDEX agency_landlord_property_allocations_landlord_idx
  ON public.agency_landlord_property_allocations(org_id, landlord_id);

ALTER TABLE public.agency_landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_landlord_property_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agency_landlords, public.agency_landlord_property_allocations
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.agency_landlords TO service_role;
GRANT SELECT, INSERT, DELETE ON public.agency_landlord_property_allocations TO service_role;

CREATE FUNCTION public.agency_landlord_record_json(p_landlord public.agency_landlords)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
  SELECT jsonb_build_object(
    'id', p_landlord.id,
    'displayName', p_landlord.display_name,
    'approvalLimitPence', p_landlord.approval_limit_pence,
    'primaryManagerId', p_landlord.primary_manager_id,
    'backupManagerId', p_landlord.backup_manager_id,
    'revision', p_landlord.revision,
    'propertyIds', coalesce((
      SELECT jsonb_agg(a.property_id ORDER BY a.property_id)
      FROM public.agency_landlord_property_allocations a
      JOIN public.properties p ON p.id = a.property_id AND p.org_id = a.org_id
      WHERE a.org_id = p_landlord.org_id AND a.landlord_id = p_landlord.id
    ), '[]'::jsonb)
  );
$$;

CREATE FUNCTION public.agency_landlord_directory(
  p_org_id uuid, p_actor_id uuid, p_landlord_id uuid, p_changes jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_role text;
  v_landlord public.agency_landlords%ROWTYPE;
  v_primary uuid;
  v_backup uuid;
  v_count integer;
  v_property_ids uuid[];
  v_can_edit boolean;
BEGIN
  IF p_changes IS NOT NULL THEN
    -- Serialize allocation replacements across landlord records in this workspace.
    PERFORM 1 FROM public.organizations o
    WHERE o.id = p_org_id
      AND o.organization_type IN ('portfolio', 'agency', 'property_management')
    FOR UPDATE;
  ELSE
    PERFORM 1 FROM public.organizations o
    WHERE o.id = p_org_id
      AND o.organization_type IN ('portfolio', 'agency', 'property_management')
    FOR SHARE;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agency workspace not found' USING ERRCODE = 'P0002'; END IF;

  SELECT m.org_role INTO v_role
  FROM public.organization_memberships m
  JOIN public.profiles pr ON pr.id = m.user_id AND pr.deleted_at IS NULL
  WHERE m.org_id = p_org_id AND m.user_id = p_actor_id AND m.status = 'active'
    AND m.org_role IN ('owner', 'manager', 'maintenance_coordinator')
  FOR SHARE OF m, pr;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agency workspace not found' USING ERRCODE = 'P0002'; END IF;
  v_can_edit := v_role IN ('owner', 'manager');

  IF p_changes IS NULL THEN
    RETURN jsonb_build_object(
      'canEdit', v_can_edit,
      'landlords', coalesce((
        SELECT jsonb_agg(public.agency_landlord_record_json(l) ORDER BY l.display_name, l.id)
        FROM public.agency_landlords l WHERE l.org_id = p_org_id
      ), '[]'::jsonb),
      'staff', coalesce((
        SELECT jsonb_agg(jsonb_build_object('id', q.id, 'name', q.name) ORDER BY q.name, q.id)
        FROM (
          SELECT pr.id, coalesce(nullif(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), 'Unnamed staff member') AS name
          FROM public.organization_memberships m
          JOIN public.profiles pr ON pr.id = m.user_id
          WHERE m.org_id = p_org_id AND m.status = 'active'
            AND m.org_role IN ('owner', 'manager', 'maintenance_coordinator')
            AND pr.deleted_at IS NULL
        ) q
      ), '[]'::jsonb),
      'properties', coalesce((
        SELECT jsonb_agg(jsonb_build_object('id', q.id, 'name', q.name, 'landlordId', q.landlord_id) ORDER BY q.name, q.id)
        FROM (
          SELECT p.id, coalesce(nullif(btrim(p.property_name), ''), nullif(btrim(p.address), ''), 'Unnamed property') AS name,
            a.landlord_id
          FROM public.properties p
          LEFT JOIN public.agency_landlord_property_allocations a
            ON a.org_id = p.org_id AND a.property_id = p.id
          WHERE p.org_id = p_org_id
        ) q
      ), '[]'::jsonb)
    );
  END IF;

  IF NOT v_can_edit THEN RAISE EXCEPTION 'Only workspace owners and managers can edit landlord records' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(p_changes) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_changes -> 'propertyIds') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid landlord record' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_changes -> 'propertyIds') > 100 THEN
    RAISE EXCEPTION 'Choose up to 100 properties' USING ERRCODE = '22023';
  END IF;
  v_primary := (p_changes ->> 'primaryManagerId')::uuid;
  v_backup := (p_changes ->> 'backupManagerId')::uuid;
  IF v_primary = v_backup THEN
    RAISE EXCEPTION 'Choose different primary and backup managers' USING ERRCODE = '22023';
  END IF;

  PERFORM m.user_id FROM public.organization_memberships m
  JOIN public.profiles pr ON pr.id = m.user_id
  WHERE m.org_id = p_org_id AND m.user_id IN (v_primary, v_backup) AND m.status = 'active'
    AND m.org_role IN ('owner', 'manager', 'maintenance_coordinator') AND pr.deleted_at IS NULL
  ORDER BY m.user_id FOR SHARE OF m, pr;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> num_nonnulls(v_primary, v_backup) THEN
    RAISE EXCEPTION 'Choose current staff from this workspace' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(array_agg(u.value::uuid ORDER BY u.value::uuid), '{}'::uuid[]) INTO v_property_ids
  FROM jsonb_array_elements_text(p_changes -> 'propertyIds') AS u(value);
  PERFORM p.id FROM public.properties p
  WHERE p.org_id = p_org_id AND p.id = ANY(v_property_ids)
  ORDER BY p.id FOR SHARE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> cardinality(v_property_ids) THEN
    RAISE EXCEPTION 'Choose distinct properties linked to this workspace' USING ERRCODE = '22023';
  END IF;

  IF p_landlord_id IS NOT NULL THEN
    SELECT l.* INTO v_landlord FROM public.agency_landlords l
    WHERE l.id = p_landlord_id AND l.org_id = p_org_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Landlord record not found' USING ERRCODE = 'P0002'; END IF;
    IF jsonb_typeof(p_changes -> 'revision') IS DISTINCT FROM 'number'
      OR (p_changes ->> 'revision')::integer IS DISTINCT FROM v_landlord.revision THEN
      RAISE EXCEPTION 'Landlord record changed' USING ERRCODE = '40001';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.agency_landlord_property_allocations a
    WHERE a.org_id = p_org_id AND a.property_id = ANY(v_property_ids)
      AND a.landlord_id IS DISTINCT FROM p_landlord_id
  ) THEN RAISE EXCEPTION 'A selected property is already linked to another landlord' USING ERRCODE = '23505'; END IF;

  IF p_landlord_id IS NULL THEN
    INSERT INTO public.agency_landlords (org_id, display_name, approval_limit_pence, primary_manager_id, backup_manager_id)
    VALUES (p_org_id, btrim(p_changes ->> 'displayName'), (p_changes ->> 'approvalLimitPence')::integer, v_primary, v_backup)
    RETURNING * INTO v_landlord;
  ELSE
    UPDATE public.agency_landlords l SET
      display_name = btrim(p_changes ->> 'displayName'),
      approval_limit_pence = (p_changes ->> 'approvalLimitPence')::integer,
      primary_manager_id = v_primary,
      backup_manager_id = v_backup,
      revision = l.revision + 1,
      updated_at = now()
    WHERE l.org_id = p_org_id AND l.id = p_landlord_id RETURNING * INTO v_landlord;
  END IF;

  DELETE FROM public.agency_landlord_property_allocations a
  WHERE a.org_id = p_org_id AND a.landlord_id = v_landlord.id AND a.property_id <> ALL(v_property_ids);
  INSERT INTO public.agency_landlord_property_allocations (org_id, landlord_id, property_id)
  SELECT p_org_id, v_landlord.id, p FROM unnest(v_property_ids) AS p
  ON CONFLICT (org_id, property_id) DO NOTHING;

  RETURN jsonb_build_object('landlord', public.agency_landlord_record_json(v_landlord));
END;
$$;

REVOKE ALL ON FUNCTION public.agency_landlord_record_json(public.agency_landlords),
  public.agency_landlord_directory(uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agency_landlord_record_json(public.agency_landlords),
  public.agency_landlord_directory(uuid, uuid, uuid, jsonb) TO service_role;
