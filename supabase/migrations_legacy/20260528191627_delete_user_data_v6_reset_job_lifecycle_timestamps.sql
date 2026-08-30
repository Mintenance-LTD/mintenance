CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
  rec RECORD;
  v_owner_tables TEXT[] := ARRAY[
    'contracts',
    'contractor_payout_transfers',
    'job_tips',
    'leases',
    'maintenance_tickets',
    'organizations',
    'ticket_updates',
    'property_team_members',
    'property_tenants'
  ];
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;

  BEGIN
    PERFORM public.log_gdpr_activity(p_user_id, 'data_deletion', 'profiles', p_user_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  DELETE FROM public.messages
    WHERE sender_id = p_user_id OR receiver_id = p_user_id;
  DELETE FROM public.refresh_tokens WHERE user_id = p_user_id;
  DELETE FROM public.dsr_requests WHERE user_id = p_user_id;

  IF v_role = 'contractor' THEN
    DELETE FROM public.bids WHERE contractor_id = p_user_id;
    UPDATE public.jobs
       SET contractor_id = NULL,
           status = CASE
             WHEN status IN ('assigned', 'in_progress') THEN 'posted'
             ELSE status
           END,
           assigned_at = NULL,
           started_at = NULL,
           updated_at = NOW()
     WHERE contractor_id = p_user_id;
    DELETE FROM public.contractor_payout_transfers WHERE contractor_id = p_user_id;
    DELETE FROM public.contracts WHERE contractor_id = p_user_id;
  ELSE
    DELETE FROM public.contracts
      WHERE job_id IN (SELECT id FROM public.jobs WHERE homeowner_id = p_user_id);
    DELETE FROM public.refunds
      WHERE job_id IN (SELECT id FROM public.jobs WHERE homeowner_id = p_user_id);
    DELETE FROM public.bids
      WHERE job_id IN (SELECT id FROM public.jobs WHERE homeowner_id = p_user_id);
    DELETE FROM public.jobs WHERE homeowner_id = p_user_id;
    DELETE FROM public.properties WHERE owner_id = p_user_id;

    DELETE FROM public.contracts WHERE homeowner_id = p_user_id;
    DELETE FROM public.leases WHERE tenant_user_id = p_user_id;
    DELETE FROM public.maintenance_tickets WHERE reported_by = p_user_id;
    DELETE FROM public.ticket_updates WHERE author_id = p_user_id;
    DELETE FROM public.organizations WHERE created_by = p_user_id;
    DELETE FROM public.property_team_members WHERE user_id = p_user_id;
    DELETE FROM public.property_tenants WHERE user_id = p_user_id;
    DELETE FROM public.job_tips WHERE payer_id = p_user_id OR payee_id = p_user_id;
  END IF;

  DELETE FROM public.contractor_profiles WHERE id = p_user_id;

  FOR rec IN
    SELECT
      n.nspname || '.' || c.relname AS qualified_table,
      c.relname AS table_name,
      a.attname AS column_name
    FROM pg_constraint con
    JOIN pg_class c     ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class refc  ON refc.oid = con.confrelid
    JOIN pg_namespace refn ON refn.oid = refc.relnamespace
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
    WHERE con.contype = 'f'
      AND refn.nspname = 'public'
      AND refc.relname = 'profiles'
      AND n.nspname = 'public'
      AND con.confdeltype IN ('a', 'r')
      AND a.attnotnull = false
      AND NOT (c.relname = ANY (v_owner_tables))
  LOOP
    EXECUTE format(
      'UPDATE %s SET %I = NULL WHERE %I = $1',
      rec.qualified_table, rec.column_name, rec.column_name
    ) USING p_user_id;
  END LOOP;

  DELETE FROM public.profiles WHERE id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.delete_user_data IS
  'GDPR right-to-erasure. Role-aware. v6 (audit-76 follow-up): contractor branch also resets jobs.assigned_at + jobs.started_at when recycling assigned/in_progress jobs back to ''posted'', so the next contractor to accept does not inherit stale lifecycle timestamps via accept_bid_atomic''s COALESCE. auth.users removal is the caller''s responsibility.';;
