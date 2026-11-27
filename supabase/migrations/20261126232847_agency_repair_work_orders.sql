-- Private, payment-free records for work arranged outside the marketplace.
-- These records do not send instructions, place jobs, approve quotes on behalf
-- of landlords, charge anyone, or represent an accounting ledger.
CREATE TABLE public.portfolio_ticket_work_orders (
  ticket_id uuid PRIMARY KEY REFERENCES public.maintenance_tickets (id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  arrangement text NOT NULL CHECK (arrangement IN ('agency_contractor', 'arranged_outside')),
  contractor_name text NOT NULL CHECK (length(btrim(contractor_name)) BETWEEN 1 AND 160),
  quoted_pence integer CHECK (quoted_pence BETWEEN 0 AND 100000000),
  approved_pence integer CHECK (approved_pence BETWEEN 0 AND 100000000),
  approval_reference text CHECK (length(btrim(approval_reference)) BETWEEN 1 AND 120),
  invoiced_pence integer CHECK (invoiced_pence BETWEEN 0 AND 100000000),
  invoice_reference text CHECK (length(btrim(invoice_reference)) BETWEEN 1 AND 120),
  paid_pence integer CHECK (paid_pence BETWEEN 0 AND 100000000),
  payment_reference text CHECK (length(btrim(payment_reference)) BETWEEN 1 AND 120),
  completion_note text CHECK (length(btrim(completion_note)) BETWEEN 1 AND 3000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_order_recorded_approval CHECK (
    (approved_pence IS NULL) = (approval_reference IS NULL)
    AND (approved_pence IS NULL OR (quoted_pence IS NOT NULL AND approved_pence <= quoted_pence))
  ),
  CONSTRAINT work_order_recorded_invoice CHECK (
    (invoiced_pence IS NULL) = (invoice_reference IS NULL)
  ),
  CONSTRAINT work_order_recorded_payment CHECK (
    (paid_pence IS NULL) = (payment_reference IS NULL)
    AND (paid_pence IS NULL OR (invoiced_pence IS NOT NULL AND paid_pence <= invoiced_pence))
  )
);

CREATE TABLE public.portfolio_ticket_work_order_revisions (
  ticket_id uuid NOT NULL REFERENCES public.portfolio_ticket_work_orders (ticket_id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  actor_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  PRIMARY KEY (ticket_id, revision)
);

-- Only the server API can invoke the function or touch the private tables.
ALTER TABLE public.portfolio_ticket_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_ticket_work_order_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portfolio_ticket_work_orders, public.portfolio_ticket_work_order_revisions
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.portfolio_ticket_work_orders TO service_role;
GRANT INSERT ON public.portfolio_ticket_work_order_revisions TO service_role;

CREATE FUNCTION public.agency_repair_work_order(
  p_ticket_id uuid,
  p_actor_id uuid,
  p_changes jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_order public.portfolio_ticket_work_orders%ROWTYPE;
  v_org_id uuid;
  v_property_id uuid;
  v_previous integer;
  v_result jsonb;
BEGIN
  IF p_changes IS NULL THEN
    SELECT t.org_id, t.property_id INTO v_org_id, v_property_id
    FROM public.maintenance_tickets AS t WHERE t.id = p_ticket_id;
  ELSE
    -- Serialise competing first writes as well as edits to existing records.
    SELECT t.org_id, t.property_id INTO v_org_id, v_property_id
    FROM public.maintenance_tickets AS t WHERE t.id = p_ticket_id FOR UPDATE;
  END IF;
  -- Ensure the property still belongs to this ticket's workspace. Neither a
  -- property-sharing grant, reporter status nor global admin is staff access.
  PERFORM 1 FROM public.organization_memberships AS m
    JOIN public.properties AS p ON p.org_id = m.org_id
    WHERE m.org_id = v_org_id AND p.id = v_property_id
      AND m.user_id = p_actor_id AND m.status = 'active'
      AND m.org_role IN ('owner', 'manager', 'maintenance_coordinator')
    FOR SHARE OF m, p;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_order FROM public.portfolio_ticket_work_orders AS w
    WHERE w.ticket_id = p_ticket_id;
  v_previous := coalesce(v_order.revision, 0);

  IF p_changes IS NOT NULL THEN
    IF jsonb_typeof(p_changes) <> 'object'
      OR jsonb_typeof(p_changes -> 'revision') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'Missing work order revision' USING ERRCODE = '22023';
    END IF;
    IF (p_changes ->> 'revision')::integer <> v_previous THEN
      RAISE EXCEPTION 'Work order revision has changed' USING ERRCODE = '40001';
    END IF;
    INSERT INTO public.portfolio_ticket_work_orders AS w (
      ticket_id, revision, arrangement, contractor_name,
      quoted_pence, approved_pence, approval_reference, invoiced_pence,
      invoice_reference, paid_pence, payment_reference, completion_note
    )
    VALUES (
      p_ticket_id,
      v_previous + 1,
      p_changes ->> 'arrangement',
      btrim(p_changes ->> 'contractorName'),
      (p_changes ->> 'quotedPence')::integer,
      (p_changes ->> 'approvedPence')::integer,
      btrim(p_changes ->> 'approvalReference'),
      (p_changes ->> 'invoicedPence')::integer,
      btrim(p_changes ->> 'invoiceReference'),
      (p_changes ->> 'paidPence')::integer,
      btrim(p_changes ->> 'paymentReference'),
      btrim(p_changes ->> 'completionNote')
    )
    ON CONFLICT (ticket_id) DO UPDATE SET
      revision = EXCLUDED.revision,
      arrangement = EXCLUDED.arrangement,
      contractor_name = EXCLUDED.contractor_name,
      quoted_pence = EXCLUDED.quoted_pence,
      approved_pence = EXCLUDED.approved_pence,
      approval_reference = EXCLUDED.approval_reference,
      invoiced_pence = EXCLUDED.invoiced_pence,
      invoice_reference = EXCLUDED.invoice_reference,
      paid_pence = EXCLUDED.paid_pence,
      payment_reference = EXCLUDED.payment_reference,
      completion_note = EXCLUDED.completion_note,
      updated_at = now()
    RETURNING w.* INTO v_order;
  END IF;

  IF v_order.ticket_id IS NULL THEN RETURN NULL; END IF;
  v_result := jsonb_build_object(
    'ticketId', v_order.ticket_id, 'revision', v_order.revision,
    'arrangement', v_order.arrangement, 'contractorName', v_order.contractor_name,
    'quotedPence', v_order.quoted_pence, 'approvedPence', v_order.approved_pence,
    'approvalReference', v_order.approval_reference,
    'invoicedPence', v_order.invoiced_pence, 'invoiceReference', v_order.invoice_reference,
    'paidPence', v_order.paid_pence, 'paymentReference', v_order.payment_reference,
    'completionNote', v_order.completion_note, 'updatedAt', v_order.updated_at
  );
  IF p_changes IS NOT NULL THEN
    INSERT INTO public.portfolio_ticket_work_order_revisions (ticket_id, revision, actor_id, snapshot)
      VALUES (p_ticket_id, v_order.revision, p_actor_id, v_result);
  END IF;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.agency_repair_work_order(uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agency_repair_work_order(uuid, uuid, jsonb) TO service_role;
