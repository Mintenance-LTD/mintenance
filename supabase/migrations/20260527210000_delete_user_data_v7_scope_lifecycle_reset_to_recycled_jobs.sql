-- audit-76 follow-up self-review: delete_user_data v7 — scope the
-- assigned_at / started_at NULL to recycled jobs only.
--
-- v6 (20260527200000) added `assigned_at = NULL, started_at = NULL`
-- to the contractor-branch UPDATE. The intent was to clear stale
-- lifecycle timestamps before recycling a job back to 'posted' so the
-- next contractor's accept_bid_atomic wouldn't inherit them via
-- COALESCE(assigned_at, NOW()).
--
-- Bug: the NULLs were applied unconditionally, ignoring the CASE on
-- status. For a `completed` job (which is left at status='completed'
-- by the CASE), the timestamps were ALSO wiped — losing the
-- historical analytics signal of "when did this completed job get
-- assigned / started?" for every completed job the deleted contractor
-- had ever worked on. CLAUDE.md shows 4 completed jobs live today; if
-- their contractor deletes their account post-v6, those rows lose
-- analytics ground truth without any GDPR justification (the
-- timestamps are job-facts, not personal data — the personal-data
-- pointer is contractor_id, which is correctly nulled).
--
-- Fix: scope the NULL with a parallel CASE that matches the status
-- recycle condition. Same row, same UPDATE, same OLD status reading
-- (Postgres evaluates all SET expressions against the pre-UPDATE row).
--
-- No backfill: v6 has not yet been triggered against any contractor
-- in production (deletion is rare + 0 in_progress jobs per audit-P0-3
-- means recycled cases are also nil); the bug is forward-looking.

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
    -- audit-76 follow-up Critical #1 (v6) + v7 scoping fix:
    --   * status is recycled assigned/in_progress → 'posted'
    --   * assigned_at + started_at are ONLY nulled for the recycled
    --     case so the next contractor's accept_bid_atomic stamps
    --     fresh values. Completed jobs keep their historical
    --     timestamps — those are job-facts (when work happened), not
    --     personal data about the deleted contractor. The personal-
    --     data pointer (contractor_id) is nulled regardless.
    UPDATE public.jobs
       SET contractor_id = NULL,
           status = CASE
             WHEN status IN ('assigned', 'in_progress') THEN 'posted'
             ELSE status
           END,
           assigned_at = CASE
             WHEN status IN ('assigned', 'in_progress') THEN NULL
             ELSE assigned_at
           END,
           started_at = CASE
             WHEN status IN ('assigned', 'in_progress') THEN NULL
             ELSE started_at
           END,
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

  -- Dynamic NULL-out of remaining audit-style FK references to profiles.
  -- audit-68 P1 guard: a.attnotnull = false ensures we only attempt to
  -- NULL nullable columns. Combined with the DROP NOT NULL migrations
  -- shipped in v5, the live schema has no NOT NULL FKs to profiles
  -- outside the v_owner_tables list — but if a future migration
  -- re-introduces one, this filter skips it (the next deletion may
  -- fail, but it'll surface as a clear FK error from the profile
  -- DELETE below rather than a mid-loop "null value in column" raise
  -- that's harder to diagnose).
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
      AND con.confdeltype IN ('a', 'r')  -- NO ACTION ('a') or RESTRICT ('r')
      AND a.attnotnull = false           -- audit-68: skip NOT NULL columns
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
  'GDPR right-to-erasure. Role-aware. v7 (audit-76 self-review): contractor branch resets jobs.assigned_at + jobs.started_at ONLY when the job is being recycled from assigned/in_progress back to ''posted''. Completed jobs keep their historical timestamps — they''re job-facts, not personal data; the personal-data pointer (contractor_id) is nulled regardless. auth.users removal is the caller''s responsibility.';
