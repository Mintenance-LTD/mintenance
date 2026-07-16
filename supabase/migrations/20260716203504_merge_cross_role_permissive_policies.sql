-- Cross-role multiple_permissive_policies remediation, part 2: same-command merges.
-- For 11 tables, fold {authenticated}-only admin/owner policies into the same-command
-- {public} policy via OR (every folded term is auth.uid()-anchored => false for anon,
-- so anon access is unchanged), and split admin/owner ALL policies into per-command
-- policies where a broader read policy made the ALL overlap unavoidable.
-- Zero access change. Originals backed up to rls_cross_role_merge_backup_20260716.
-- Applied live via Supabase MCP on 2026-07-16 (version 20260716203504).
DO $$
DECLARE
  v_q text; v_wc text; v_q2 text;
  admin_pred constant text := 'is_admin((select auth.uid()))';
BEGIN
  CREATE TABLE public.rls_cross_role_merge_backup_20260716 AS
  SELECT now() AS backed_up_at, pl.* FROM pg_policies pl
  WHERE pl.schemaname='public' AND pl.tablename IN
    ('expenses','invoices','search_analytics','building_assessments','messages',
     'escrow_payments','license_verifications','insurance_verifications',
     'appointments','properties','job_checklist_items');
  ALTER TABLE public.rls_cross_role_merge_backup_20260716 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON public.rls_cross_role_merge_backup_20260716 FROM anon, authenticated;

  -- expenses: fold admin select into public select
  SELECT qual INTO STRICT v_q FROM pg_policies WHERE schemaname='public' AND tablename='expenses' AND policyname='expenses_select';
  EXECUTE format('ALTER POLICY expenses_select ON public.expenses USING ((%s) OR %s)', v_q, admin_pred);
  DROP POLICY "expenses_admin_select" ON public.expenses;

  -- invoices: same
  SELECT qual INTO STRICT v_q FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='invoices_select';
  EXECUTE format('ALTER POLICY invoices_select ON public.invoices USING ((%s) OR %s)', v_q, admin_pred);
  DROP POLICY "invoices_admin_select" ON public.invoices;

  -- search_analytics: same
  SELECT qual INTO STRICT v_q FROM pg_policies WHERE schemaname='public' AND tablename='search_analytics' AND policyname='Users can view their own search analytics';
  EXECUTE format('ALTER POLICY %I ON public.search_analytics USING ((%s) OR %s)', 'Users can view their own search analytics', v_q, admin_pred);
  DROP POLICY "search_analytics_admin_select" ON public.search_analytics;

  -- building_assessments: fold authenticated contractor-select into public merged select
  SELECT qual INTO STRICT v_q2 FROM pg_policies WHERE schemaname='public' AND tablename='building_assessments' AND policyname='Contractors can view assessments for assigned jobs';
  SELECT qual INTO STRICT v_q FROM pg_policies WHERE schemaname='public' AND tablename='building_assessments' AND policyname='rls_merged_select_6e7e444c3684809dcb04802bbaf1f6b2';
  EXECUTE format('ALTER POLICY %I ON public.building_assessments USING ((%s) OR (%s))', 'rls_merged_select_6e7e444c3684809dcb04802bbaf1f6b2', v_q, v_q2);
  DROP POLICY "Contractors can view assessments for assigned jobs" ON public.building_assessments;

  -- messages: dissolve admin ALL into the four per-command policies
  SELECT qual INTO STRICT v_q FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_select_policy';
  EXECUTE format('ALTER POLICY messages_select_policy ON public.messages USING ((%s) OR %s)', v_q, admin_pred);
  SELECT qual, with_check INTO STRICT v_q, v_wc FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_update_policy';
  EXECUTE format('ALTER POLICY messages_update_policy ON public.messages USING ((%s) OR %s) WITH CHECK ((%s) OR %s)', v_q, admin_pred, v_wc, admin_pred);
  SELECT with_check INTO STRICT v_wc FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_insert_policy';
  EXECUTE format('ALTER POLICY messages_insert_policy ON public.messages WITH CHECK ((%s) OR %s)', v_wc, admin_pred);
  SELECT qual INTO STRICT v_q FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_delete_own';
  EXECUTE format('ALTER POLICY messages_delete_own ON public.messages USING ((%s) OR %s)', v_q, admin_pred);
  DROP POLICY "Admin full access to messages" ON public.messages;

  -- escrow_payments: dissolve admin ALL
  SELECT qual INTO STRICT v_q FROM pg_policies WHERE schemaname='public' AND tablename='escrow_payments' AND policyname='Contractors can view own escrow payments';
  EXECUTE format('ALTER POLICY %I ON public.escrow_payments USING ((%s) OR %s)', 'Contractors can view own escrow payments', v_q, admin_pred);
  SELECT qual INTO STRICT v_q FROM pg_policies WHERE schemaname='public' AND tablename='escrow_payments' AND policyname='Authorized updates to escrow payments';
  EXECUTE format('ALTER POLICY %I ON public.escrow_payments USING ((%s) OR %s)', 'Authorized updates to escrow payments', v_q, admin_pred);
  EXECUTE format('CREATE POLICY escrow_payments_admin_insert ON public.escrow_payments FOR INSERT TO authenticated WITH CHECK (%s)', admin_pred);
  EXECUTE format('CREATE POLICY escrow_payments_admin_delete ON public.escrow_payments FOR DELETE TO authenticated USING (%s)', admin_pred);
  DROP POLICY "Admin full access to escrow payments" ON public.escrow_payments;

  -- license_verifications: dissolve admin ALL
  SELECT qual INTO STRICT v_q FROM pg_policies WHERE schemaname='public' AND tablename='license_verifications' AND policyname='Contractors can view own license verifications';
  EXECUTE format('ALTER POLICY %I ON public.license_verifications USING ((%s) OR %s)', 'Contractors can view own license verifications', v_q, admin_pred);
  SELECT with_check INTO STRICT v_wc FROM pg_policies WHERE schemaname='public' AND tablename='license_verifications' AND policyname='Contractors can insert own license verifications';
  EXECUTE format('ALTER POLICY %I ON public.license_verifications WITH CHECK ((%s) OR %s)', 'Contractors can insert own license verifications', v_wc, admin_pred);
  EXECUTE format('CREATE POLICY license_verifications_admin_update ON public.license_verifications FOR UPDATE TO authenticated USING (%s)', admin_pred);
  EXECUTE format('CREATE POLICY license_verifications_admin_delete ON public.license_verifications FOR DELETE TO authenticated USING (%s)', admin_pred);
  DROP POLICY "Admins can manage all license verifications" ON public.license_verifications;

  -- insurance_verifications: dissolve admin ALL
  SELECT qual INTO STRICT v_q FROM pg_policies WHERE schemaname='public' AND tablename='insurance_verifications' AND policyname='Contractors can view own insurance verifications';
  EXECUTE format('ALTER POLICY %I ON public.insurance_verifications USING ((%s) OR %s)', 'Contractors can view own insurance verifications', v_q, admin_pred);
  SELECT with_check INTO STRICT v_wc FROM pg_policies WHERE schemaname='public' AND tablename='insurance_verifications' AND policyname='Contractors can insert own insurance verifications';
  EXECUTE format('ALTER POLICY %I ON public.insurance_verifications WITH CHECK ((%s) OR %s)', 'Contractors can insert own insurance verifications', v_wc, admin_pred);
  EXECUTE format('CREATE POLICY insurance_verifications_admin_update ON public.insurance_verifications FOR UPDATE TO authenticated USING (%s)', admin_pred);
  EXECUTE format('CREATE POLICY insurance_verifications_admin_delete ON public.insurance_verifications FOR DELETE TO authenticated USING (%s)', admin_pred);
  DROP POLICY "Admins can manage all insurance verifications" ON public.insurance_verifications;

  -- appointments: replace contractor ALL with DELETE + fold contractor into INSERT check
  SELECT with_check INTO STRICT v_wc FROM pg_policies WHERE schemaname='public' AND tablename='appointments' AND policyname='Clients can create appointments';
  EXECUTE format('ALTER POLICY %I ON public.appointments WITH CHECK ((%s) OR (contractor_id = (select auth.uid())))', 'Clients can create appointments', v_wc);
  CREATE POLICY appointments_contractor_delete ON public.appointments FOR DELETE TO authenticated USING (contractor_id = (select auth.uid()));
  DROP POLICY "rls_merged_all_6e7e444c3684809dcb04802bbaf1f6b2" ON public.appointments;

  -- properties: fold authenticated (admin OR owner) select into public org-member select
  SELECT qual INTO STRICT v_q FROM pg_policies WHERE schemaname='public' AND tablename='properties' AND policyname='properties_select_org_member';
  EXECUTE format('ALTER POLICY properties_select_org_member ON public.properties USING ((%s) OR %s OR ((select auth.uid()) = owner_id))', v_q, admin_pred);
  DROP POLICY "rls_merged_select_49214f8cf3e9df480f55df7fd5ba0ed1" ON public.properties;

  -- job_checklist_items: dissolve homeowner ALL into per-command policies
  SELECT qual INTO STRICT v_q2 FROM pg_policies WHERE schemaname='public' AND tablename='job_checklist_items' AND policyname='job_checklist_items_homeowner_all';
  SELECT qual INTO STRICT v_q FROM pg_policies WHERE schemaname='public' AND tablename='job_checklist_items' AND policyname='rls_merged_select_49214f8cf3e9df480f55df7fd5ba0ed1';
  EXECUTE format('ALTER POLICY %I ON public.job_checklist_items USING ((%s) OR (%s))', 'rls_merged_select_49214f8cf3e9df480f55df7fd5ba0ed1', v_q, v_q2);
  SELECT qual, with_check INTO STRICT v_q, v_wc FROM pg_policies WHERE schemaname='public' AND tablename='job_checklist_items' AND policyname='job_checklist_items_contractor_update';
  EXECUTE format('ALTER POLICY job_checklist_items_contractor_update ON public.job_checklist_items USING ((%s) OR (%s)) WITH CHECK ((%s) OR (%s))', v_q, v_q2, v_wc, v_q2);
  EXECUTE format('CREATE POLICY job_checklist_items_homeowner_insert ON public.job_checklist_items FOR INSERT TO authenticated WITH CHECK (%s)', v_q2);
  EXECUTE format('CREATE POLICY job_checklist_items_homeowner_delete ON public.job_checklist_items FOR DELETE TO authenticated USING (%s)', v_q2);
  DROP POLICY "job_checklist_items_homeowner_all" ON public.job_checklist_items;

  RAISE NOTICE 'Cross-role merge migration complete';
END $$;
