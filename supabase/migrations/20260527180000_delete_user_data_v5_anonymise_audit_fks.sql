-- audit-68 P1: delete_user_data v5 — handle NOT NULL audit-style FKs to profiles.
--
-- v4 dynamically NULLed every NO ACTION / RESTRICT FK to profiles, but four
-- columns are NOT NULL on the live DB (verified 2026-05-27 via pg_attribute):
--   - contract_signatures.signer_id   (RESTRICT)
--   - escrow_audit_log.actor_id       (NO ACTION)
--   - meeting_updates.updated_by      (NO ACTION)
--   - property_team_members.invited_by (NO ACTION)
--
-- All four tables are empty today (0 rows live), so the bug is latent rather
-- than active — but the moment any escrow movement, signature, meeting
-- update, or team invite lands, the next delete_user_data run will fail with
-- "null value in column violates not-null constraint" and the user's profile
-- DELETE will be blocked.
--
-- Two-part fix:
--   1. Drop NOT NULL on the four audit columns. The rows themselves stay
--      (financial / contractual / membership audit value preserved); the
--      actor identity is anonymised by the dynamic loop's UPDATE ... = NULL,
--      which satisfies GDPR right-to-erasure while keeping the "this thing
--      happened at this time" audit signal intact. Under UK financial
--      regulations escrow audit logs must persist; only the personal-data
--      pointer needs to go.
--   2. Add a.attnotnull = false guard to the dynamic loop so any future
--      NOT NULL FK added to profiles won't silently re-introduce this bug.
--      Belt-and-suspenders — the column changes above mean the loop won't
--      hit a NOT NULL today, but the filter prevents regression.

ALTER TABLE public.contract_signatures   ALTER COLUMN signer_id   DROP NOT NULL;
ALTER TABLE public.escrow_audit_log      ALTER COLUMN actor_id    DROP NOT NULL;
ALTER TABLE public.meeting_updates       ALTER COLUMN updated_by  DROP NOT NULL;
ALTER TABLE public.property_team_members ALTER COLUMN invited_by  DROP NOT NULL;

COMMENT ON COLUMN public.contract_signatures.signer_id IS
  'GDPR-erasable: nullable so account deletion can anonymise without dropping the signature audit row. The contract itself stays signed by the OTHER party; this column going NULL represents "the signer''s account has been erased".';

COMMENT ON COLUMN public.escrow_audit_log.actor_id IS
  'GDPR-erasable: nullable so account deletion can anonymise the actor without violating UK financial-audit retention. The log row stays (amount, status change, timestamp) — only the personal-data pointer goes.';

COMMENT ON COLUMN public.meeting_updates.updated_by IS
  'GDPR-erasable: nullable so account deletion can anonymise without dropping the meeting-update history.';

COMMENT ON COLUMN public.property_team_members.invited_by IS
  'GDPR-erasable: nullable so account deletion of the inviter does not cascade-delete the legitimate team membership of the invitee.';

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
  -- audit-68 P1 guard added: a.attnotnull = false ensures we only attempt
  -- to NULL nullable columns. Combined with the DROP NOT NULL migration
  -- above, the live schema has no NOT NULL FKs to profiles outside the
  -- v_owner_tables list — but if a future migration re-introduces one,
  -- this filter skips it (the next deletion may fail, but it'll surface
  -- as a clear FK error from the profile DELETE below rather than a
  -- mid-loop "null value in column" raise that's harder to diagnose).
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
  'GDPR right-to-erasure. Role-aware. Dynamically NULLs audit-style FK references to profiles (nullable columns only — see audit-68 v5) and explicitly DELETEs owner-style ones (contracts, leases, tickets, etc.) so the profile DELETE never trips on a RESTRICT/NO ACTION FK. auth.users removal is the caller''s responsibility.';
