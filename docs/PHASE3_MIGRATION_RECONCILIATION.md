# Phase 3 Supabase Migration Reconciliation

Date: 2026-09-01  
Environment: **LOCAL ANALYSIS ONLY** — no live or staging schema was changed.

## State comparison

- Live Supabase project: `ukrjudtlvapiajkjbcrd`
- Live migration head verified through Supabase MCP:
  `20260805194939_uk_earnings_statement_bookkeeping`
- Local migration head: `20260831231341_harden_payments_write_rls`
- Local migrations after the live head: 7

The local head cannot be applied blindly. Several migrations contain data backfills,
security-definer changes, privilege changes, or non-transactional index operations. The plan below
is an operator review plan, not an approval to apply anything to production.

## Post-audit live safety re-check

A subsequent read-only Supabase MCP check confirmed that the live migration head remains
`20260805194939_uk_earnings_statement_bookkeeping`. Representative live counts were `profiles=10`,
`jobs=18`, and `payments=0`; no Phase 3 local test record was written to the live project.

## Reconciliation matrix

| Migration                                               | Purpose and affected objects                                                                                                                                                                                                      | Application dependency                                                                                                            | Data / RLS / payment-security impact                                                                                                                                                               | Classification and action                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `20260830085723_secure_unsubscribe_and_rls_helpers.sql` | Adds `newsletter_subscriptions.unsubscribe_token` and a unique index; replaces `is_admin`, `is_org_member`, `has_org_management_access`, `is_company_admin`, `is_active_group_member`, and `is_group_admin`; changes grants.      | **Yes.** Newsletter unsubscribe routes use `unsubscribe_token`; RLS policies and authorization helpers use the functions.         | **Data:** backfills one UUID per existing subscription. **RLS/security:** critical; binds helper arguments to `auth.uid()` and revokes default PUBLIC execution. **Payments:** no direct effect.   | **SECURITY CRITICAL / DATA MIGRATION / REQUIRES MANUAL REVIEW.** Preflight existing function signatures, policy callers, null/duplicate tokens, and anonymous unsubscribe behavior. Rollback is possible for grants/functions, but token column/backfill requires a deliberate reverse migration and may invalidate links.                                               |
| `20260830090000_move_vector_to_extensions.sql`          | Creates a protected embedding archive; moves the `vector` extension from `public` to `extensions`.                                                                                                                                | **Indirect.** ML and search code depends on vector columns/operators and the `extensions` search path.                            | **Data:** copies non-null embeddings and creates an archive table; no source-row rewrite intended. **RLS/security:** archive is service-role-only. **Payments:** none.                             | **DATA MIGRATION / REQUIRES MANUAL REVIEW.** Verify PostGIS/vector extension ownership, search path, column OIDs, HNSW indexes, row counts, and archive storage. **Not safe to apply without preflight.** Rollback is documented as `ALTER EXTENSION vector SET SCHEMA public`, but archive cleanup is irreversible unless retained.                                     |
| `20260830090100_message_bid_hot_path_indexes.sql`       | Adds `idx_messages_job_created_desc_id` and `idx_bids_job_status_created_desc`.                                                                                                                                                   | **No schema dependency.** Improves existing message and bid list queries only.                                                    | **Data:** no row changes. **RLS/security:** none. **Payments:** none. Uses `CREATE INDEX CONCURRENTLY`, so it must run outside a transaction.                                                      | **SAFE TO APPLY AFTER PERFORMANCE PREFLIGHT.** Confirm indexes do not already exist under conflicting definitions and schedule resource usage. Rollback is `DROP INDEX CONCURRENTLY` for each index.                                                                                                                                                                     |
| `20260830090200_matching_postgis_cutover.sql`           | Adds `profiles.location_point` and `jobs.location_point`; adds sync triggers/backfills; repairs `service_areas.center`; creates `find_contractors_for_job` and `find_jobs_near_point`; restricts RPC execution to `service_role`. | **Yes.** Matching/discover routes call the RPCs and retain a fallback when unavailable.                                           | **Data:** backfills derived geography columns and service-area centers. **RLS/security:** RPC privilege changes are security-sensitive; the RPCs query user/job data. **Payments:** none.          | **SECURITY CRITICAL / DATA MIGRATION / REQUIRES MANUAL REVIEW.** Verify PostGIS availability, geography types, coordinates/ranges, trigger behavior, RPC search paths, service-role call path, and client fallback. Rollback requires dropping triggers/indexes/columns/functions or restoring prior matching behavior; derived backfills are not inherently reversible. |
| `20260831120000_harden_vlm_training_lifecycle.sql`      | Adds reservation/model-version columns and indexes to `vlm_training_buffer`, `vlm_student_calibration`, and `vlm_routing_decisions`; invalidates unattributed historical measurements; replaces a uniqueness constraint.          | **Yes for AI training/admin services** that read reservations and model versions; not part of homeowner/contractor core journeys. | **Data:** updates existing calibration/routing rows and changes uniqueness semantics. **RLS/security:** no policy change in this file, but model selection behavior changes. **Payments:** none.   | **DATA MIGRATION / REQUIRES MANUAL REVIEW.** Check existing nulls, duplicate `(category, model_version)` values, worker compatibility, and rollback of invalidation timestamps/constraint. Do not apply as part of controlled-beta authorization work without ML-owner review.                                                                                           |
| `20260831224315_fix_jobs_select_rls_isolation.sql`      | Replaces the consolidated `jobs` SELECT policy; permits owner/assigned contractor/admin access and marketplace visibility only to contractors.                                                                                    | **Yes.** Direct Supabase job reads, discovery, and assigned-job flows depend on the policy.                                       | **Data:** none. **RLS/security:** **critical**; fixes cross-homeowner job visibility and is the primary Phase 3 authorization prerequisite. **Payments:** indirectly protects job/payment context. | **SECURITY CRITICAL / REQUIRES MANUAL REVIEW.** Must be tested with separate homeowner, contractor, and admin identities against draft/private/marketplace/assigned states before staging/live application. Rollback is policy replacement, but rollback would restore the security exposure.                                                                            |
| `20260831231341_harden_payments_write_rls.sql`          | Drops client insert/update policies and revokes `INSERT, UPDATE, DELETE` on `public.payments` from `anon` and `authenticated`.                                                                                                    | **Yes.** Server payment/webhook services must use an authorized server client; clients remain read-only by policy.                | **Data:** none. **RLS/security:** **critical**; prevents client payment mutation. **Payments:** direct, high impact.                                                                               | **SECURITY CRITICAL / REQUIRES MANUAL REVIEW.** Prove server-role payment creation, webhook updates, refunds, and authorized reads in Stripe test mode before applying. Rollback is grant/policy restoration, but must not be used to unblock clients.                                                                                                                   |

## Duplicate and conflict analysis

- No exact duplicate was found among these seven local filenames.
- The two security migrations intentionally modify objects created or consolidated by earlier
  migrations; they must be evaluated against the live definitions, not treated as additive-only
  changes.
- The PostGIS cutover may overlap older matching RPC/index migrations and must be compared by
  function signature and index definition before execution.
- The vector migration depends on an extension schema and search-path state that were not verified
  locally because Docker is unavailable.
- The VLM migration is logically separate from the core beta journey but has non-reversible
  data-state semantics and should not be bundled into a beta security rollout without owner
  approval.

## Ordered application plan

1. Capture a schema/function/policy/index snapshot from the live project.
2. Reconcile the six security/data-sensitive migrations with live definitions and application
   deployment versions.
3. Apply and verify the jobs SELECT isolation migration in staging with separate identities.
4. Apply and verify payment write lockdown in staging with Stripe test mode.
5. Apply the unsubscribe/helper hardening after testing all policy callers.
6. Apply PostGIS/vector/VLM migrations only after their domain-specific preflights and rollback
   plans are approved.
7. Apply the two concurrent indexes separately and verify with `EXPLAIN`.
8. Re-run Supabase advisors and the Phase 3 cross-user authorization suite.

Until those steps are approved and executed in the appropriate environment, the current
classification is **PENDING AUTHORIZATION — DO NOT APPLY LIVE**.

## Local diff verification

The repository-required `npx supabase db diff --local` was run successfully against the shadow
database after retrying with the existing project npm cache. All migrations through
`20260831231341_harden_payments_write_rls.sql` applied to the shadow database. The resulting diff
contained no migration file and one drop statement:

```sql
drop extension if exists "pg_net";
```

This is classified as **PHASE3-004 / P2 — local schema reconciliation item**. It must be explained
against the intended local configuration and the live extension inventory before any migration
promotion. It was not applied to live.

The read-only live extension snapshot contained `postgis 3.3.7` and `vector 0.8.0`, and did not
contain `pg_net`. That reduces the likelihood that the diff represents a production-only dependency,
but does not replace the required local configuration review.
