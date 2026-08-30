-- Scope ML-ops / telemetry tables to admin-only SELECT.
-- Drops broad authenticated-role SELECT policies on 11 ML-internal tables;
-- adds admin-gated equivalents where the existing admin policy doesn't
-- already cover the read path. Service-role access is preserved
-- throughout. See supabase/migrations/20260421000004_scope_ml_ops_tables_to_admin.sql.

-- continuous_learning_metrics
drop policy if exists "Public can read learning metrics" on public.continuous_learning_metrics;
create policy "Admin reads continuous_learning_metrics"
  on public.continuous_learning_metrics
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- hybrid_routing_decisions — keep existing "Admins can view all routing decisions" (public role);
-- drop the broad authenticated SELECT.
drop policy if exists "Authenticated users can read routing decisions" on public.hybrid_routing_decisions;

-- maintenance_performance_metrics — keep existing "admins_select_all_metrics";
-- drop the broad authenticated SELECT.
drop policy if exists "authenticated_read_metrics" on public.maintenance_performance_metrics;

-- model_ab_tests
drop policy if exists "Authenticated users can read A/B tests" on public.model_ab_tests;
create policy "Admin reads model_ab_tests"
  on public.model_ab_tests
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- model_comparisons — keep existing "Admins can view comparisons";
-- drop the broad authenticated SELECT.
drop policy if exists "Authenticated users can read comparisons" on public.model_comparisons;

-- model_deployments — keep existing "Admins can view deployments";
-- drop the broad authenticated SELECT.
drop policy if exists "Authenticated users can read deployments" on public.model_deployments;

-- model_lineage — keep existing "Admins can view model lineage";
-- drop the broad authenticated SELECT.
drop policy if exists "Authenticated users can read model lineage" on public.model_lineage;

-- model_performance_baseline
drop policy if exists "Authenticated users can read baseline" on public.model_performance_baseline;
create policy "Admin reads model_performance_baseline"
  on public.model_performance_baseline
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- model_performance_snapshots
drop policy if exists "Authenticated users can read snapshots" on public.model_performance_snapshots;
create policy "Admin reads model_performance_snapshots"
  on public.model_performance_snapshots
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- model_predictions_log
drop policy if exists "Authenticated users can read predictions log" on public.model_predictions_log;
create policy "Admin reads model_predictions_log"
  on public.model_predictions_log
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- model_retraining_jobs — keep existing "Admins can view retraining jobs";
-- drop the broad authenticated SELECT.
drop policy if exists "Authenticated users can read retraining jobs" on public.model_retraining_jobs;
;
