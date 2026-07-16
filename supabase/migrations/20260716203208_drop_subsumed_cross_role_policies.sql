-- Cross-role multiple_permissive_policies remediation, part 1: pure redundancy drops.
-- Every policy dropped here is provably subsumed by a remaining policy on the same table
-- for every (role, command, row): identical or strictly-narrower predicate under permissive-OR.
-- Zero access change. Originals backed up to rls_cross_role_dedup_backup_20260716.
-- Applied live via Supabase MCP on 2026-07-16 (version 20260716203208).
DO $$
DECLARE
  t record;
  n int := 0;
BEGIN
  CREATE TABLE public.rls_cross_role_dedup_backup_20260716 AS
  SELECT now() AS backed_up_at, pl.*
  FROM pg_policies pl
  WHERE pl.schemaname='public' AND (pl.tablename, pl.policyname) IN (
    ('email_preferences','Users can view own email preferences'),
    ('contractor_clients','contractor_clients_delete'),
    ('contractor_clients','contractor_clients_insert'),
    ('contractor_clients','contractor_clients_select'),
    ('contractor_clients','contractor_clients_update'),
    ('contractor_payout_accounts','Contractors can manage their payout accounts'),
    ('escrow_transactions','escrow_authenticated_select'),
    ('companies','companies_select_owner_or_admin'),
    ('escrow_auto_release_rules','Admins can view auto-release rules'),
    ('contracts','contracts_admin_select'),
    ('model_training_jobs','Admins can view training jobs'),
    ('notification_preferences','Users can insert their own notification preferences'),
    ('notification_preferences','rls_merged_select_6e7e444c3684809dcb04802bbaf1f6b2'),
    ('notification_preferences','Users can update their own notification preferences'),
    ('notifications','notifications_select_policy'),
    ('notifications','notifications_update_policy'),
    ('user_push_tokens','rls_merged_all_6e7e444c3684809dcb04802bbaf1f6b2'),
    ('user_devices','Users can view own devices'),
    ('saved_jobs','Contractors can delete their own saved jobs'),
    ('saved_jobs','Contractors can save jobs'),
    ('refresh_tokens','refresh_tokens_delete'),
    ('refresh_tokens','refresh_tokens_insert'),
    ('refresh_tokens','refresh_tokens_select'),
    ('refresh_tokens','refresh_tokens_update'),
    ('service_areas','sa_delete_own'),
    ('service_areas','sa_modify_own'),
    ('service_areas','sa_select_own'),
    ('service_areas','sa_update_own'),
    ('service_routes','sr_delete_own'),
    ('service_routes','sr_insert_own'),
    ('service_routes','sr_select_own'),
    ('service_routes','sr_update_own'),
    ('jobs','Homeowners can manage own jobs'),
    ('jobs','Only homeowners can confirm job completion'),
    ('job_milestones','Job participants can view milestones'),
    ('webhook_events','webhook_events_admin_select'),
    ('confidence_calibration_data','Admins can insert calibration data'),
    ('confidence_calibration_data','Admins can view all calibration data'),
    ('contractor_certifications','rls_merged_insert_6e7e444c3684809dcb04802bbaf1f6b2')
  );

  ALTER TABLE public.rls_cross_role_dedup_backup_20260716 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON public.rls_cross_role_dedup_backup_20260716 FROM anon, authenticated;

  IF (SELECT count(*) FROM public.rls_cross_role_dedup_backup_20260716) <> 39 THEN
    RAISE EXCEPTION 'Safety guard: expected 39 policies to back up, found % — a name did not match, aborting',
      (SELECT count(*) FROM public.rls_cross_role_dedup_backup_20260716);
  END IF;

  FOR t IN SELECT tablename, policyname FROM public.rls_cross_role_dedup_backup_20260716
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', t.policyname, t.tablename);
    n := n + 1;
  END LOOP;

  RAISE NOTICE 'Dropped % subsumed policies', n;
END $$;
