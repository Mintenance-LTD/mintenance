-- Complete RLS coverage and admin overrides
-- This migration replaces ad-hoc policies with explicit tenant-aware rules and
-- introduces lightweight helper functions for maintainable row security.

-- Helper to detect admin users (supports audit/support overrides)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Returns true when the current auth context belongs to a Mintenance admin.';

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Helper to verify job participation (homeowner/contractor or admin override)
CREATE OR REPLACE FUNCTION public.is_job_participant(job_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
         OR EXISTS (
           SELECT 1
           FROM public.jobs j
           WHERE j.id = job_id
             AND auth.uid() IN (j.homeowner_id, j.contractor_id)
         );
$$;

COMMENT ON FUNCTION public.is_job_participant(uuid) IS 'Checks whether auth.uid() is a participant on the given job (homeowner, contractor, or admin).';

REVOKE ALL ON FUNCTION public.is_job_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_job_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_job_participant(uuid) TO service_role;

-- Users table policies -------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.users FORCE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own profile" ON public.users';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own profile" ON public.users';
    EXECUTE 'DROP POLICY IF EXISTS admin_full_access_users ON public.users';
    EXECUTE 'DROP POLICY IF EXISTS users_select_self ON public.users';
    EXECUTE 'DROP POLICY IF EXISTS users_update_self ON public.users';

    EXECUTE $policy$
      CREATE POLICY users_select_self
      ON public.users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id OR public.is_admin());
    $policy$;

    EXECUTE $policy$
      CREATE POLICY users_update_self
      ON public.users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id OR public.is_admin())
      WITH CHECK (auth.uid() = id OR public.is_admin());
    $policy$;
  END IF;
END $$;

-- Jobs table policies --------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.jobs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.jobs FORCE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view posted jobs" ON public.jobs';
    EXECUTE 'DROP POLICY IF EXISTS "Homeowners can create jobs" ON public.jobs';
    EXECUTE 'DROP POLICY IF EXISTS "Homeowners can update their jobs" ON public.jobs';
    EXECUTE 'DROP POLICY IF EXISTS "Contractors can update assigned jobs" ON public.jobs';
    EXECUTE 'DROP POLICY IF EXISTS admin_full_access_jobs ON public.jobs';
    EXECUTE 'DROP POLICY IF EXISTS jobs_select_policy ON public.jobs';
    EXECUTE 'DROP POLICY IF EXISTS jobs_insert_policy ON public.jobs';
    EXECUTE 'DROP POLICY IF EXISTS jobs_update_policy ON public.jobs';
    EXECUTE 'DROP POLICY IF EXISTS jobs_delete_policy ON public.jobs';

    EXECUTE $policy$
      CREATE POLICY jobs_select_policy
      ON public.jobs
      FOR SELECT
      TO authenticated
      USING (
        public.is_admin()
        OR auth.uid() = homeowner_id
        OR auth.uid() = contractor_id
        OR status = 'posted'
      );
    $policy$;

    EXECUTE $policy$
      CREATE POLICY jobs_insert_policy
      ON public.jobs
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin() OR auth.uid() = homeowner_id);
    $policy$;

    EXECUTE $policy$
      CREATE POLICY jobs_update_policy
      ON public.jobs
      FOR UPDATE
      TO authenticated
      USING (public.is_admin() OR auth.uid() = homeowner_id OR auth.uid() = contractor_id)
      WITH CHECK (public.is_admin() OR auth.uid() = homeowner_id OR auth.uid() = contractor_id);
    $policy$;

    EXECUTE $policy$
      CREATE POLICY jobs_delete_policy
      ON public.jobs
      FOR DELETE
      TO authenticated
      USING (public.is_admin() OR auth.uid() = homeowner_id);
    $policy$;
  END IF;
END $$;

-- Bids table policies --------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.bids') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.bids FORCE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Job owners and bid creators can view bids" ON public.bids';
    EXECUTE 'DROP POLICY IF EXISTS "Contractors can create bids" ON public.bids';
    EXECUTE 'DROP POLICY IF EXISTS "Bid creators can update their bids" ON public.bids';
    EXECUTE 'DROP POLICY IF EXISTS admin_full_access_bids ON public.bids';
    EXECUTE 'DROP POLICY IF EXISTS bids_select_policy ON public.bids';
    EXECUTE 'DROP POLICY IF EXISTS bids_insert_policy ON public.bids';
    EXECUTE 'DROP POLICY IF EXISTS bids_update_policy ON public.bids';
    EXECUTE 'DROP POLICY IF EXISTS bids_delete_policy ON public.bids';

    EXECUTE $policy$
      CREATE POLICY bids_select_policy
      ON public.bids
      FOR SELECT
      TO authenticated
      USING (
        public.is_admin()
        OR auth.uid() = contractor_id
        OR EXISTS (
          SELECT 1
          FROM public.jobs j
          WHERE j.id = job_id
            AND auth.uid() = j.homeowner_id
        )
      );
    $policy$;

    EXECUTE $policy$
      CREATE POLICY bids_insert_policy
      ON public.bids
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin() OR auth.uid() = contractor_id);
    $policy$;

    EXECUTE $policy$
      CREATE POLICY bids_update_policy
      ON public.bids
      FOR UPDATE
      TO authenticated
      USING (public.is_admin() OR auth.uid() = contractor_id)
      WITH CHECK (public.is_admin() OR auth.uid() = contractor_id);
    $policy$;

    EXECUTE $policy$
      CREATE POLICY bids_delete_policy
      ON public.bids
      FOR DELETE
      TO authenticated
      USING (public.is_admin() OR auth.uid() = contractor_id);
    $policy$;
  END IF;
END $$;

-- Messages table policies ----------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.messages FORCE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS admin_full_access_messages ON public.messages';
    EXECUTE 'DROP POLICY IF EXISTS messages_select_policy ON public.messages';
    EXECUTE 'DROP POLICY IF EXISTS messages_insert_policy ON public.messages';
    EXECUTE 'DROP POLICY IF EXISTS messages_update_policy ON public.messages';

    EXECUTE $policy$
      CREATE POLICY messages_select_policy
      ON public.messages
      FOR SELECT
      TO authenticated
      USING (
        public.is_admin()
        OR auth.uid() = sender_id
        OR auth.uid() = receiver_id
        OR public.is_job_participant(job_id)
      );
    $policy$;

    EXECUTE $policy$
      CREATE POLICY messages_insert_policy
      ON public.messages
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin() OR auth.uid() = sender_id);
    $policy$;

    EXECUTE $policy$
      CREATE POLICY messages_update_policy
      ON public.messages
      FOR UPDATE
      TO authenticated
      USING (public.is_admin() OR auth.uid() = sender_id)
      WITH CHECK (public.is_admin() OR auth.uid() = sender_id);
    $policy$;
  END IF;
END $$;

-- Escrow transactions table policies ----------------------------------------
DO $$
BEGIN
  IF to_regclass('public.escrow_transactions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.escrow_transactions FORCE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Users can view their escrow transactions" ON public.escrow_transactions';
    EXECUTE 'DROP POLICY IF EXISTS "Payers can create escrow transactions" ON public.escrow_transactions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their escrow transactions" ON public.escrow_transactions';
    EXECUTE 'DROP POLICY IF EXISTS admin_full_access_escrow ON public.escrow_transactions';
    EXECUTE 'DROP POLICY IF EXISTS escrow_select_policy ON public.escrow_transactions';
    EXECUTE 'DROP POLICY IF EXISTS escrow_insert_policy ON public.escrow_transactions';
    EXECUTE 'DROP POLICY IF EXISTS escrow_update_policy ON public.escrow_transactions';

    EXECUTE $policy$
      CREATE POLICY escrow_select_policy
      ON public.escrow_transactions
      FOR SELECT
      TO authenticated
      USING (
        public.is_admin()
        OR auth.uid() = payer_id
        OR auth.uid() = payee_id
        OR public.is_job_participant(job_id)
      );
    $policy$;

    EXECUTE $policy$
      CREATE POLICY escrow_insert_policy
      ON public.escrow_transactions
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin() OR auth.uid() = payer_id);
    $policy$;

    EXECUTE $policy$
      CREATE POLICY escrow_update_policy
      ON public.escrow_transactions
      FOR UPDATE
      TO authenticated
      USING (public.is_admin() OR auth.uid() = payer_id OR auth.uid() = payee_id)
      WITH CHECK (public.is_admin() OR auth.uid() = payer_id OR auth.uid() = payee_id);
    $policy$;
  END IF;
END $$;

-- Contractor payout accounts policies ---------------------------------------
DO $$
BEGIN
  IF to_regclass('public.contractor_payout_accounts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.contractor_payout_accounts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.contractor_payout_accounts FORCE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Contractors can view their payout accounts" ON public.contractor_payout_accounts';
    EXECUTE 'DROP POLICY IF EXISTS "Contractors can create their payout accounts" ON public.contractor_payout_accounts';
    EXECUTE 'DROP POLICY IF EXISTS "Contractors can update their payout accounts" ON public.contractor_payout_accounts';
    EXECUTE 'DROP POLICY IF EXISTS "Contractors can delete their payout accounts" ON public.contractor_payout_accounts';
    EXECUTE 'DROP POLICY IF EXISTS admin_full_access_contractor_payout_accounts ON public.contractor_payout_accounts';
    EXECUTE 'DROP POLICY IF EXISTS payout_accounts_select_policy ON public.contractor_payout_accounts';
    EXECUTE 'DROP POLICY IF EXISTS payout_accounts_mutate_policy ON public.contractor_payout_accounts';

    EXECUTE $policy$
      CREATE POLICY payout_accounts_select_policy
      ON public.contractor_payout_accounts
      FOR SELECT
      TO authenticated
      USING (public.is_admin() OR auth.uid() = contractor_id);
    $policy$;

    EXECUTE $policy$
      CREATE POLICY payout_accounts_insert_policy
      ON public.contractor_payout_accounts
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin() OR auth.uid() = contractor_id);
    $policy$;

    EXECUTE $policy$
      CREATE POLICY payout_accounts_update_policy
      ON public.contractor_payout_accounts
      FOR UPDATE
      TO authenticated
      USING (public.is_admin() OR auth.uid() = contractor_id)
      WITH CHECK (public.is_admin() OR auth.uid() = contractor_id);
    $policy$;

    EXECUTE $policy$
      CREATE POLICY payout_accounts_delete_policy
      ON public.contractor_payout_accounts
      FOR DELETE
      TO authenticated
      USING (public.is_admin() OR auth.uid() = contractor_id);
    $policy$;
  END IF;
END $$;
