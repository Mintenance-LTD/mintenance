-- One transaction for a ticket transition and its communication record.
-- Only the authenticated API may supply the verified actor identity.
CREATE OR REPLACE FUNCTION public.update_portfolio_ticket(
  p_ticket_id uuid, p_actor_id uuid, p_changes jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
DECLARE
  v_ticket public.maintenance_tickets%ROWTYPE;
  v_role text;
  v_manager boolean;
  v_note text := nullif(btrim(p_changes->>'resolutionNote'), '');
  v_body text;
BEGIN
  SELECT * INTO v_ticket FROM public.maintenance_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002'; END IF;
  SELECT org_role INTO v_role FROM public.organization_memberships
    WHERE org_id = v_ticket.org_id AND user_id = p_actor_id AND status = 'active';
  v_manager := coalesce(v_role IN ('owner','manager','maintenance_coordinator'), false)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = p_actor_id AND role = 'admin');
  IF NOT v_manager AND v_ticket.reported_by IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'Ticket access denied' USING ERRCODE = '42501';
  END IF;
  IF p_changes ?| ARRAY['status','priority','assignedTo'] AND NOT v_manager THEN
    RAISE EXCEPTION 'Only managers can change ticket fields' USING ERRCODE = '42501';
  END IF;
  IF p_changes ? 'assignedTo' AND p_changes->>'assignedTo' IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organization_memberships WHERE org_id = v_ticket.org_id
      AND user_id = (p_changes->>'assignedTo')::uuid AND status = 'active' AND org_role <> 'tenant'
  ) THEN RAISE EXCEPTION 'Assignee must be active organization staff' USING ERRCODE = '22023'; END IF;
  IF length(coalesce(v_note,'')) > 5000 THEN
    RAISE EXCEPTION 'Note too long' USING ERRCODE = '22023';
  END IF;
  v_body := concat_ws(E'\n',
    CASE WHEN p_changes ? 'status' THEN format('Status: %s → %s', v_ticket.status, p_changes->>'status') END,
    CASE WHEN p_changes ? 'priority' THEN format('Priority: %s → %s', v_ticket.priority, p_changes->>'priority') END,
    CASE WHEN p_changes ? 'assignedTo' THEN format('Assignee: %s → %s', coalesce(v_ticket.assigned_to::text,'unassigned'), coalesce(p_changes->>'assignedTo','unassigned')) END,
    v_note);
  IF v_body = '' THEN RAISE EXCEPTION 'No ticket changes provided' USING ERRCODE = '22023'; END IF;
  UPDATE public.maintenance_tickets SET
    status = CASE WHEN p_changes ? 'status' THEN p_changes->>'status' ELSE status END,
    priority = CASE WHEN p_changes ? 'priority' THEN p_changes->>'priority' ELSE priority END,
    assigned_to = CASE WHEN p_changes ? 'assignedTo' THEN (p_changes->>'assignedTo')::uuid ELSE assigned_to END,
    resolved_at = CASE WHEN NOT p_changes ? 'status' THEN resolved_at
      WHEN p_changes->>'status' IN ('resolved','closed') THEN coalesce(resolved_at,now()) ELSE NULL END,
    updated_at = now()
  WHERE id = p_ticket_id RETURNING * INTO v_ticket;
  INSERT INTO public.ticket_updates(ticket_id,author_id,update_type,body,visibility)
    VALUES (p_ticket_id,p_actor_id,
      CASE WHEN p_changes ? 'status' THEN 'status_change' WHEN p_changes ? 'assignedTo' THEN 'assignment' ELSE 'comment' END,
      v_body, CASE WHEN v_manager THEN 'internal' ELSE 'tenant_visible' END);
  RETURN to_jsonb(v_ticket);
END;
$$;
REVOKE ALL ON FUNCTION public.update_portfolio_ticket(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_portfolio_ticket(uuid,uuid,jsonb) TO service_role;

-- Writes must use the API, which validates organisation/property/unit linkage
-- and records changes atomically. The existing clients use these API routes.
REVOKE INSERT, UPDATE, DELETE ON public.maintenance_tickets, public.ticket_updates FROM anon, authenticated;
DROP POLICY IF EXISTS maintenance_tickets_select_member ON public.maintenance_tickets;
CREATE POLICY maintenance_tickets_select_member ON public.maintenance_tickets FOR SELECT TO authenticated
USING (
  reported_by = (SELECT auth.uid())
  OR EXISTS (SELECT 1 FROM public.organization_memberships m WHERE m.org_id = maintenance_tickets.org_id
    AND m.user_id = (SELECT auth.uid()) AND m.status = 'active' AND m.org_role <> 'tenant')
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
);
DROP POLICY IF EXISTS ticket_updates_access_member ON public.ticket_updates;
CREATE POLICY ticket_updates_access_member ON public.ticket_updates FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.maintenance_tickets t WHERE t.id = ticket_updates.ticket_id AND (
    (t.reported_by = (SELECT auth.uid()) AND ticket_updates.visibility = 'tenant_visible')
    OR EXISTS (SELECT 1 FROM public.organization_memberships m WHERE m.org_id = t.org_id
      AND m.user_id = (SELECT auth.uid()) AND m.status = 'active' AND m.org_role <> 'tenant')
  ))
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
);
