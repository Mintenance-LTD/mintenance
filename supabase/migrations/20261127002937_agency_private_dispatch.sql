-- Isolated, authenticated private instructions; no marketplace/payment/notification integration.
-- Existing staff-entered paid/approved amounts are intentionally not used here.
CREATE SCHEMA IF NOT EXISTS agency_private;
REVOKE ALL ON SCHEMA agency_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA agency_private TO service_role;

ALTER TABLE public.agency_landlord_property_allocations
  ADD COLUMN approval_context uuid NOT NULL DEFAULT gen_random_uuid();

CREATE TABLE public.agency_landlord_identities (
  landlord_id uuid PRIMARY KEY REFERENCES public.agency_landlords(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approval_context uuid NOT NULL DEFAULT gen_random_uuid()
);
CREATE INDEX agency_landlord_identities_user_idx ON public.agency_landlord_identities(user_id);
CREATE TABLE public.agency_dispatch_state (
  ticket_id uuid PRIMARY KEY REFERENCES public.maintenance_tickets(id) ON DELETE RESTRICT,
  org_id uuid NOT NULL,
  property_id uuid NOT NULL,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  quote_version integer NOT NULL DEFAULT 0 CHECK (quote_version >= 0)
);
CREATE TABLE public.agency_dispatch_quotes (
  ticket_id uuid NOT NULL REFERENCES public.agency_dispatch_state(ticket_id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  amount_pence integer NOT NULL CHECK (amount_pence BETWEEN 0 AND 100000000),
  scope text NOT NULL CHECK (length(btrim(scope)) BETWEEN 1 AND 2000),
  PRIMARY KEY (ticket_id, version)
);
CREATE TABLE public.agency_dispatch_decisions (
  ticket_id uuid NOT NULL,
  version integer NOT NULL,
  landlord_id uuid NOT NULL,
  landlord_user_id uuid NOT NULL,
  identity_context uuid NOT NULL,
  property_context uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  decided_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(ticket_id,version,identity_context,property_context),
  FOREIGN KEY(ticket_id,version) REFERENCES public.agency_dispatch_quotes(ticket_id,version) ON DELETE RESTRICT
);
CREATE TABLE public.agency_dispatch_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  version integer NOT NULL,
  contractor_id uuid NOT NULL,
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  FOREIGN KEY(ticket_id,version) REFERENCES public.agency_dispatch_quotes(ticket_id,version) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX agency_dispatch_one_active_assignment ON public.agency_dispatch_assignments(ticket_id) WHERE revoked_at IS NULL;
CREATE INDEX agency_dispatch_inbox_contractor ON public.agency_dispatch_assignments(contractor_id) WHERE revoked_at IS NULL;
CREATE TABLE public.agency_dispatch_events (
  ticket_id uuid NOT NULL REFERENCES public.agency_dispatch_state(ticket_id) ON DELETE RESTRICT,
  revision integer NOT NULL,
  actor_id uuid NOT NULL,
  command jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(ticket_id,revision)
);
ALTER TABLE public.agency_landlord_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_dispatch_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_dispatch_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_dispatch_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_dispatch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_dispatch_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agency_landlord_identities, public.agency_dispatch_state, public.agency_dispatch_quotes,
  public.agency_dispatch_decisions, public.agency_dispatch_assignments, public.agency_dispatch_events
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_landlord_identities TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.agency_dispatch_state, public.agency_dispatch_assignments TO service_role;
GRANT SELECT, INSERT ON public.agency_dispatch_quotes, public.agency_dispatch_decisions, public.agency_dispatch_events TO service_role;

-- Narrow auth-directory read, not callable by browser roles. No fuzzy matching or exposed search.
CREATE FUNCTION agency_private.confirmed_user(p_id uuid, p_email text, p_role text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN count(*) = 1 THEN (array_agg(u.id))[1] END
  FROM auth.users u JOIN public.profiles p ON p.id = u.id
  WHERE u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until <= now())
    AND p.role = p_role AND p.deleted_at IS NULL
    AND ((p_id IS NOT NULL AND u.id = p_id)
      OR (p_id IS NULL AND p_email IS NOT NULL AND lower(u.email) = lower(btrim(p_email))));
$$;
REVOKE ALL ON FUNCTION agency_private.confirmed_user(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION agency_private.confirmed_user(uuid,text,text) TO service_role;

CREATE FUNCTION public.set_agency_landlord_identity(p_org_id uuid,p_landlord_id uuid,p_actor_id uuid,p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_user uuid;
BEGIN
  PERFORM 1 FROM public.organizations o
    WHERE o.id=p_org_id AND o.organization_type IN ('portfolio','agency','property_management') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agency workspace not found' USING ERRCODE='P0002'; END IF;
  PERFORM 1 FROM public.organization_memberships m JOIN public.profiles p ON p.id=m.user_id
    WHERE m.org_id=p_org_id AND m.user_id=p_actor_id AND m.status='active'
      AND m.org_role IN ('owner','manager') AND p.deleted_at IS NULL FOR SHARE OF m,p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agency workspace not found' USING ERRCODE='P0002'; END IF;
  PERFORM 1 FROM public.agency_landlords l WHERE l.id=p_landlord_id AND l.org_id=p_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Landlord record not found' USING ERRCODE='P0002'; END IF;
  IF p_email IS NULL THEN
    DELETE FROM public.agency_landlord_identities WHERE landlord_id=p_landlord_id;
  ELSE
    v_user := agency_private.confirmed_user(NULL,p_email,'homeowner');
    IF v_user IS NULL OR EXISTS (
      SELECT 1 FROM public.organization_memberships m WHERE m.org_id=p_org_id AND m.user_id=v_user
        AND m.status='active' AND m.org_role IN ('owner','manager','maintenance_coordinator')
    ) THEN RAISE EXCEPTION 'Unable to link this account' USING ERRCODE='22023'; END IF;
    INSERT INTO public.agency_landlord_identities(landlord_id,user_id) VALUES(p_landlord_id,v_user)
    ON CONFLICT(landlord_id) DO UPDATE SET user_id=EXCLUDED.user_id, approval_context=gen_random_uuid()
      WHERE public.agency_landlord_identities.user_id IS DISTINCT FROM EXCLUDED.user_id;
  END IF;
  RETURN jsonb_build_object('linked',v_user IS NOT NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.set_agency_landlord_identity(uuid,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_agency_landlord_identity(uuid,uuid,uuid,text) TO service_role;

CREATE FUNCTION public.get_agency_landlord_identity(p_org_id uuid,p_landlord_id uuid,p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.agency_landlords l
    JOIN public.organizations o ON o.id=l.org_id
    JOIN public.organization_memberships m ON m.org_id=l.org_id
    JOIN public.profiles p ON p.id=m.user_id
    WHERE l.id=p_landlord_id AND l.org_id=p_org_id AND m.user_id=p_actor_id
      AND o.organization_type IN ('portfolio','agency','property_management')
      AND m.status='active' AND m.org_role IN ('owner','manager') AND p.deleted_at IS NULL
  ) THEN RAISE EXCEPTION 'Landlord record not found' USING ERRCODE='P0002'; END IF;
  RETURN jsonb_build_object('linked',EXISTS (
    SELECT 1 FROM public.agency_landlord_identities i WHERE i.landlord_id=p_landlord_id
  ));
END;
$$;
REVOKE ALL ON FUNCTION public.get_agency_landlord_identity(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_agency_landlord_identity(uuid,uuid,uuid) TO service_role;

-- Returning NULL denotes a record not visible to this actor. The public RPCs
-- are service-only; all response fields are chosen explicitly for each role.
CREATE FUNCTION agency_private.dispatch_view(p_ticket_id uuid,p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  t public.maintenance_tickets%ROWTYPE;
  s public.agency_dispatch_state%ROWTYPE;
  q public.agency_dispatch_quotes%ROWTYPE;
  a public.agency_dispatch_assignments%ROWTYPE;
  v_role text; v_viewer text; v_landlord uuid; v_landlord_user uuid;
  v_limit integer; v_decision text; v_auth text; v_identity_context uuid; v_property_context uuid;
BEGIN
  SELECT t0.* INTO t FROM public.maintenance_tickets t0
    JOIN public.properties p ON p.id=t0.property_id AND p.org_id=t0.org_id
    JOIN public.organizations o ON o.id=t0.org_id
    WHERE t0.id=p_ticket_id AND o.organization_type IN ('portfolio','agency','property_management');
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO s FROM public.agency_dispatch_state WHERE ticket_id=t.id;
  IF s.ticket_id IS NOT NULL AND (s.org_id<>t.org_id OR s.property_id<>t.property_id) THEN RETURN NULL; END IF;
  SELECT * INTO q FROM public.agency_dispatch_quotes WHERE ticket_id=t.id AND version=s.quote_version;
  SELECT * INTO a FROM public.agency_dispatch_assignments WHERE ticket_id=t.id AND revoked_at IS NULL;
  SELECT m.org_role INTO v_role FROM public.organization_memberships m JOIN public.profiles pr ON pr.id=m.user_id
    WHERE m.org_id=t.org_id AND m.user_id=p_actor_id AND m.status='active' AND pr.deleted_at IS NULL
      AND m.org_role IN ('owner','manager','maintenance_coordinator');
  SELECT l.id,i.user_id,l.approval_limit_pence,i.approval_context,al.approval_context
    INTO v_landlord,v_landlord_user,v_limit,v_identity_context,v_property_context
    FROM public.agency_landlord_property_allocations al
    JOIN public.agency_landlords l ON l.id=al.landlord_id AND l.org_id=al.org_id
    LEFT JOIN public.agency_landlord_identities i ON i.landlord_id=l.id
    WHERE al.org_id=t.org_id AND al.property_id=t.property_id;
  IF agency_private.confirmed_user(v_landlord_user,NULL,'homeowner') IS NULL OR EXISTS (
    SELECT 1 FROM public.organization_memberships m WHERE m.org_id=t.org_id
      AND m.user_id=v_landlord_user AND m.status='active'
      AND m.org_role IN ('owner','manager','maintenance_coordinator')
  ) THEN v_landlord_user := NULL; END IF;
  IF v_role IS NOT NULL THEN
    v_viewer := 'staff';
  ELSIF q.version IS NOT NULL AND v_landlord_user=p_actor_id THEN
    v_viewer := 'landlord';
  ELSIF a.contractor_id=p_actor_id AND agency_private.confirmed_user(p_actor_id,NULL,'contractor') IS NOT NULL THEN
    v_viewer := 'contractor';
  ELSE RETURN NULL;
  END IF;
  SELECT d.decision INTO v_decision FROM public.agency_dispatch_decisions d
    WHERE d.ticket_id=t.id AND d.version=q.version AND d.landlord_id=v_landlord AND d.landlord_user_id=v_landlord_user
      AND d.identity_context=v_identity_context AND d.property_context=v_property_context;
  v_auth := CASE
    WHEN q.version IS NULL THEN 'no_quote'
    WHEN v_landlord_user IS NULL THEN 'no_landlord'
    WHEN v_decision='approved' THEN 'landlord_approved'
    WHEN v_decision='rejected' THEN 'approval_required'
    WHEN q.amount_pence<=v_limit THEN 'within_limit'
    ELSE 'approval_required' END;
  RETURN jsonb_build_object(
    'viewer',v_viewer,'ticketId',t.id,
    'title',CASE WHEN v_viewer='staff' THEN t.title ELSE 'Private work order' END,
    'revision',coalesce(s.revision,0),'ticketStatus',t.status,
    'quoteVersion',q.version,'quotePence',q.amount_pence,'quoteScope',q.scope,
    'approvalLimitPence',CASE WHEN v_viewer<>'contractor' THEN v_limit ELSE NULL END,
    'decision',CASE WHEN v_viewer<>'contractor' THEN v_decision ELSE NULL END,
    'authorization',CASE WHEN v_viewer<>'contractor' THEN v_auth ELSE NULL END,
    'contractorId',CASE WHEN v_viewer<>'landlord' THEN a.contractor_id ELSE NULL END,
    'dispatchedAt',a.dispatched_at,'acceptedAt',a.accepted_at
  );
END;
$$;
REVOKE ALL ON FUNCTION agency_private.dispatch_view(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION agency_private.dispatch_view(uuid,uuid) TO service_role;

CREATE FUNCTION public.agency_private_dispatch(p_ticket_id uuid,p_actor_id uuid,p_command jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  t public.maintenance_tickets%ROWTYPE;
  s public.agency_dispatch_state%ROWTYPE;
  v_view jsonb; v_viewer text; v_action text; v_revision integer; v_version integer;
  v_candidate uuid; v_audit jsonb; v_landlord_id uuid; v_identity_context uuid; v_property_context uuid;
BEGIN
  IF p_command IS NOT NULL THEN
    -- Match CRM mutation lock order so a concurrent limit/identity/property change
    -- and a private dispatch cannot authorise each other using stale information.
    PERFORM o.id FROM public.organizations o
      JOIN public.maintenance_tickets mt ON mt.org_id=o.id
      WHERE mt.id=p_ticket_id FOR UPDATE OF o;
    SELECT * INTO t FROM public.maintenance_tickets WHERE id=p_ticket_id FOR UPDATE;
    IF FOUND THEN
      PERFORM 1 FROM public.properties p WHERE p.id=t.property_id AND p.org_id=t.org_id FOR SHARE;
      PERFORM 1 FROM public.organization_memberships m WHERE m.org_id=t.org_id AND m.user_id=p_actor_id FOR SHARE;
    END IF;
  END IF;
  v_view := agency_private.dispatch_view(p_ticket_id,p_actor_id);
  IF v_view IS NULL THEN RAISE EXCEPTION 'Private work not found' USING ERRCODE='P0002'; END IF;
  IF p_command IS NULL THEN RETURN v_view; END IF;

  v_viewer := v_view->>'viewer';
  v_action := p_command->>'action';
  v_revision := (p_command->>'revision')::integer;
  v_version := (p_command->>'quoteVersion')::integer;
  IF v_action IS NULL OR v_revision IS NULL OR v_revision<0 OR v_action NOT IN ('quote','dispatch','revoke','approve','reject','accept') THEN
    RAISE EXCEPTION 'Invalid private work action' USING ERRCODE='22023';
  END IF;
  IF (v_action IN ('quote','dispatch','revoke') AND v_viewer<>'staff')
    OR (v_action IN ('approve','reject') AND v_viewer<>'landlord')
    OR (v_action='accept' AND v_viewer<>'contractor') THEN
    RAISE EXCEPTION 'Private work action unavailable' USING ERRCODE='42501';
  END IF;

  -- Payloads stored in history do not contain an entered contractor email.
  v_audit := jsonb_build_object('action',v_action,'quoteVersion',v_version);
  IF v_action IN ('approve','reject') THEN
    SELECT al.landlord_id,i.approval_context,al.approval_context INTO STRICT v_landlord_id,v_identity_context,v_property_context
    FROM public.agency_landlord_property_allocations al JOIN public.agency_landlord_identities i ON i.landlord_id=al.landlord_id
      WHERE al.org_id=t.org_id AND al.property_id=t.property_id AND i.user_id=p_actor_id;
    v_audit := v_audit || jsonb_build_object('identityContext',v_identity_context,'propertyContext',v_property_context);
  ELSIF v_action='dispatch' THEN
    -- Do not check account eligibility for stale, unauthorised, or otherwise
    -- unusable quotes. The sole exception is retrying the last assignment.
    IF v_version IS NULL OR v_version IS DISTINCT FROM (v_view->>'quoteVersion')::integer
      OR (v_revision IS DISTINCT FROM (v_view->>'revision')::integer AND NOT EXISTS (
        SELECT 1 FROM public.agency_dispatch_events e WHERE e.ticket_id=p_ticket_id
          AND e.revision=(v_view->>'revision')::integer AND e.revision=v_revision+1
          AND e.actor_id=p_actor_id AND e.command->>'action'='dispatch'
      )) THEN RAISE EXCEPTION 'Private work changed' USING ERRCODE='40001'; END IF;
    IF v_revision=(v_view->>'revision')::integer THEN
      IF t.status IN ('resolved','closed') THEN
        RAISE EXCEPTION 'Reopen the repair before changing private work' USING ERRCODE='55000';
      END IF;
      IF v_view->>'dispatchedAt' IS NOT NULL THEN
        RAISE EXCEPTION 'This work is already assigned' USING ERRCODE='55000';
      END IF;
      IF coalesce(v_view->>'authorization','') NOT IN ('within_limit','landlord_approved') THEN
        RAISE EXCEPTION 'Current quote needs valid spending authority' USING ERRCODE='55000';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.portfolio_ticket_work_orders w
        WHERE w.ticket_id=t.id AND w.arrangement='agency_contractor'
      ) THEN RAISE EXCEPTION 'This is no longer an agency contractor work order' USING ERRCODE='55000'; END IF;
    END IF;
    v_candidate := agency_private.confirmed_user(NULL,p_command->>'contractorEmail','contractor');
    IF v_candidate IS NULL THEN RAISE EXCEPTION 'Unable to assign this account' USING ERRCODE='22023'; END IF;
    v_audit := v_audit || jsonb_build_object('contractorId',v_candidate);
  ELSIF v_action='quote' THEN
    v_audit := v_audit || jsonb_build_object('quotePence',(p_command->>'quotePence')::integer,'quoteScope',btrim(p_command->>'quoteScope'));
  END IF;
  IF v_revision+1=(v_view->>'revision')::integer AND EXISTS (
    SELECT 1 FROM public.agency_dispatch_events e WHERE e.ticket_id=p_ticket_id
      AND e.revision=v_revision+1 AND e.actor_id=p_actor_id AND e.command=v_audit
  ) THEN RETURN v_view; END IF;
  IF v_revision IS DISTINCT FROM (v_view->>'revision')::integer
    OR (v_action<>'quote' AND (v_version IS NULL OR v_version IS DISTINCT FROM (v_view->>'quoteVersion')::integer)) THEN
    RAISE EXCEPTION 'Private work changed' USING ERRCODE='40001';
  END IF;

  IF v_action<>'revoke' AND t.status IN ('resolved','closed') THEN
    RAISE EXCEPTION 'Reopen the repair before changing private work' USING ERRCODE='55000';
  END IF;
  IF v_action='quote' THEN
    IF v_view->>'dispatchedAt' IS NOT NULL THEN
      RAISE EXCEPTION 'Revoke the current assignment before revising the quote' USING ERRCODE='55000';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.portfolio_ticket_work_orders w WHERE w.ticket_id=t.id AND w.arrangement='agency_contractor') THEN
      RAISE EXCEPTION 'Save an agency contractor work order before preparing a quote' USING ERRCODE='55000';
    END IF;
    INSERT INTO public.agency_dispatch_state(ticket_id,org_id,property_id) VALUES(t.id,t.org_id,t.property_id)
    ON CONFLICT(ticket_id) DO NOTHING;
    INSERT INTO public.agency_dispatch_quotes(ticket_id,version,amount_pence,scope)
    VALUES (t.id,coalesce((v_view->>'quoteVersion')::integer,0)+1,(p_command->>'quotePence')::integer,btrim(p_command->>'quoteScope'));
    UPDATE public.agency_dispatch_state SET quote_version=quote_version+1 WHERE ticket_id=t.id;
  ELSIF v_action IN ('approve','reject') THEN
    IF v_view->>'decision' IS NOT NULL OR v_view->>'dispatchedAt' IS NOT NULL THEN
      RAISE EXCEPTION 'This quote can no longer be decided' USING ERRCODE='55000';
    END IF;
    INSERT INTO public.agency_dispatch_decisions(ticket_id,version,landlord_id,landlord_user_id,identity_context,property_context,decision)
    VALUES (t.id,v_version,v_landlord_id,p_actor_id,v_identity_context,v_property_context,CASE WHEN v_action='approve' THEN 'approved' ELSE 'rejected' END);
  ELSIF v_action='dispatch' THEN
    INSERT INTO public.agency_dispatch_assignments(ticket_id,version,contractor_id)
    VALUES (t.id,v_version,v_candidate);
  ELSIF v_action='revoke' THEN
    UPDATE public.agency_dispatch_assignments SET revoked_at=now()
    WHERE ticket_id=t.id AND version=v_version AND revoked_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'No current assignment to revoke' USING ERRCODE='55000'; END IF;
  ELSE
    UPDATE public.agency_dispatch_assignments SET accepted_at=now()
    WHERE ticket_id=t.id AND version=v_version AND contractor_id=p_actor_id AND revoked_at IS NULL AND accepted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'This assignment cannot be accepted' USING ERRCODE='55000'; END IF;
  END IF;
  UPDATE public.agency_dispatch_state SET revision=revision+1 WHERE ticket_id=t.id RETURNING * INTO s;
  INSERT INTO public.agency_dispatch_events(ticket_id,revision,actor_id,command)
    VALUES(t.id,s.revision,p_actor_id,v_audit);
  RETURN agency_private.dispatch_view(t.id,p_actor_id);
END;
$$;
REVOKE ALL ON FUNCTION public.agency_private_dispatch(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agency_private_dispatch(uuid,uuid,jsonb) TO service_role;

CREATE FUNCTION public.agency_private_work_inbox(p_actor_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(v.item ORDER BY v.item->>'title',v.item->>'ticketId'),'[]'::jsonb)
  FROM (
    SELECT agency_private.dispatch_view(c.ticket_id,p_actor_id) AS item
    FROM (
      SELECT s.ticket_id FROM public.agency_landlord_identities i
      JOIN public.agency_landlord_property_allocations a ON a.landlord_id=i.landlord_id
      JOIN public.agency_dispatch_state s ON s.property_id=a.property_id AND s.org_id=a.org_id
      WHERE i.user_id=p_actor_id AND s.quote_version>0
      UNION
      SELECT a.ticket_id FROM public.agency_dispatch_assignments a
      WHERE a.contractor_id=p_actor_id AND a.revoked_at IS NULL
    ) c
  ) v WHERE v.item->>'viewer' IN ('landlord','contractor');
$$;
REVOKE ALL ON FUNCTION public.agency_private_work_inbox(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agency_private_work_inbox(uuid) TO service_role;
