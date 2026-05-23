-- 2026-05-23: delete_user_data() (GDPR right-to-erasure) was deleting
-- jobs both as homeowner AND as contractor. For a contractor account,
-- that meant nuking the homeowner-owned jobs the contractor happened
-- to be assigned to — wiping legitimate homeowner records, escrow
-- context, and any related history that the homeowner did not consent
-- to erase.
--
-- Fix: branch on the deleted user's role.
--   * Contractor → unassign their jobs (contractor_id = NULL) and
--     revert active assignments (assigned / in_progress) to 'posted'
--     so the homeowner can re-source. Drop the contractor's bids.
--   * Homeowner → hard-delete their jobs + the bids on them + their
--     properties (their own data, fine to erase).
--   * Both branches still drop messages / refresh_tokens / dsr_requests
--     scoped to the deleted user, log the GDPR action, and finally
--     remove the profile row.

CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;

  -- Audit-log the deletion if the helper exists. Don't fail the whole
  -- erasure if logging blows up — the GDPR contract is to erase the
  -- data, not to refuse on a logging hiccup.
  BEGIN
    PERFORM public.log_gdpr_activity(p_user_id, 'data_deletion', 'profiles', p_user_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Common cross-party data (sender/receiver, refresh tokens, DSR rows).
  DELETE FROM public.messages
    WHERE sender_id = p_user_id OR receiver_id = p_user_id;
  DELETE FROM public.refresh_tokens WHERE user_id = p_user_id;
  DELETE FROM public.dsr_requests WHERE user_id = p_user_id;

  IF v_role = 'contractor' THEN
    -- Drop bids the contractor authored — these are the contractor's
    -- offers and belong to them, so erasure is appropriate.
    DELETE FROM public.bids WHERE contractor_id = p_user_id;

    -- Unassign — DO NOT delete — jobs the contractor was assigned to.
    -- Those rows belong to a homeowner and erasing them would damage
    -- the homeowner's record without their consent. Active assignments
    -- revert to 'posted' so the homeowner can find another contractor.
    UPDATE public.jobs
       SET contractor_id = NULL,
           status = CASE
             WHEN status IN ('assigned', 'in_progress') THEN 'posted'
             ELSE status
           END,
           updated_at = NOW()
     WHERE contractor_id = p_user_id;
  ELSE
    -- Homeowner (or any unknown role): hard-delete their jobs and the
    -- bids placed on them, plus their properties. Bid deletion is
    -- explicit because some bid tables FK to jobs ON DELETE RESTRICT
    -- (legacy escrow refs); doing the bids first is the safest order.
    DELETE FROM public.bids
      WHERE job_id IN (SELECT id FROM public.jobs WHERE homeowner_id = p_user_id);
    DELETE FROM public.jobs WHERE homeowner_id = p_user_id;
    DELETE FROM public.properties WHERE owner_id = p_user_id;
  END IF;

  -- Finally drop the profile row. The auth.users row is removed by the
  -- caller (api/user/delete-account) via supabase.auth.admin.deleteUser.
  DELETE FROM public.profiles WHERE id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.delete_user_data IS
  'GDPR right-to-erasure. Role-aware: for contractor accounts, unassigns jobs instead of deleting them, so homeowner records survive contractor erasure. Auth.users is removed separately by the API route via the admin client.';
