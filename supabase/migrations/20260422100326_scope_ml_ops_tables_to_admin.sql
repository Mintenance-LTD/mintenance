-- Scope ML-ops / telemetry tables to admin-only SELECT.
--
-- Problem (2026-04-21 security audit, live-DB verified):
--   Eleven ML-internal tables grant `SELECT` to any authenticated user
--   via `USING (true)`. These tables contain competitive/strategic data:
--   per-request model routing decisions, drift events, prediction
--   confidence distributions, retraining schedules, performance
--   baselines, A/B test outcomes, model lineage, deployment history.
--
--   An authenticated attacker (any signed-in homeowner or contractor)
--   can enumerate Mintenance's ML infrastructure, learn which models
--   are active, track when they were retrained, and read per-user
--   prediction logs that may contain assessment identifiers.
--
-- Fix:
--   Replace every broad `authenticated`-role SELECT with an admin-gated
--   SELECT. Service-role access is untouched (background jobs, API
--   routes using serverSupabase, edge functions continue to work).
--
-- Compatibility:
--   - Server-side code using `serverSupabase` (service role) — unaffected.
--   - Admin dashboards calling admin-only API routes — unaffected
--     (those routes use service role to fetch, return pre-scoped JSON).
--   - Direct anon/user queries against these tables from the web/mobile
--     client — intentionally broken. Any such call should be migrated
--     to use an API route that fetches via service role.
--
--   Known non-admin reads that will return empty after this migration:
--     - apps/web/lib/services/building-surveyor/routing/analytics.ts
--       (imports `@/lib/supabase` anon client; SELECTs already returned
--       empty because the previous `authenticated` policy required a
--       session — anon has no session, so this was already a no-op in
--       production).
--     - apps/web/lib/services/ai/ModelDriftDetectionService.ts (same).
--   Both files should be migrated to `serverSupabase`. Filed as P2
--   hardening follow-up, not blocking this migration.

-- continuous_learning_metrics
drop policy if exists "Public can read learning metrics" on public.continuous_learning_metrics;
create policy "Admin reads continuous_learning_metrics"
  on public.continuous_learning_metrics
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- hybrid_routing_decisions
drop policy if exists "Authenticated users can read routing decisions" on public.hybrid_routing_decisions;
-- Keep the existing "Admins can view all routing decisions" policy (public role).
-- It already covers the admin case via its qual.

-- maintenance_performance_metrics
drop policy if exists "authenticated_read_metrics" on public.maintenance_performance_metrics;
-- Keep the existing "admins_select_all_metrics" — it's already the right shape
-- once the broad authenticated one is removed.

-- model_ab_tests
drop policy if exists "Authenticated users can read A/B tests" on public.model_ab_tests;
create policy "Admin reads model_ab_tests"
  on public.model_ab_tests
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- model_comparisons
drop policy if exists "Authenticated users can read comparisons" on public.model_comparisons;
-- Keep existing "Admins can view comparisons".

-- model_deployments
drop policy if exists "Authenticated users can read deployments" on public.model_deployments;
-- Keep existing "Admins can view deployments".

-- model_lineage
drop policy if exists "Authenticated users can read model lineage" on public.model_lineage;
-- Keep existing "Admins can view model lineage".

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

-- model_retraining_jobs
drop policy if exists "Authenticated users can read retraining jobs" on public.model_retraining_jobs;
-- Keep existing "Admins can view retraining jobs".
