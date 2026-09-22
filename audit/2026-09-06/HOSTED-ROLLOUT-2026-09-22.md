# Hosted migration rollout — 22 September 2026

## Authorization and target

The user explicitly authorized applying pending SQL to hosted Supabase in this task. This supersedes
the earlier no-hosted-mutation restriction for reviewed application migrations. It does not
authorize live payments, contacting users, destructive resets, unrelated data edits, or application
deployment. Future SQL changes must be locally validated, committed, reviewed for deployed-caller
compatibility, applied with migration history, and verified on the connected target.

Supabase MCP identified MintEnance production (`ukrjudtlvapiajkjbcrd`, eu-west-2) as healthy and
matching the repository link. Mintenance Staging was inactive and was not changed.

## Execution and verification

- Initial CLI dry-run identified exactly 53 unapplied files, from `20260907220020` through
  `20260922135151`. Earlier local replay of this complete chain produced an empty schema diff.
- Applied the first RPC/default-permission migration separately, preserving its original version.
  Before it, anonymous/authenticated roles could execute both contribution reward writers. After it,
  both roles were denied while service-role execution remained enabled.
- Vercel metadata identified production `015c1b0d0a5e117346e0e0b1be740ac3d0bd3892`, a main merge of
  the remediation branch, with alias `www.mintenance.co.uk`. Fetching that commit and comparing API
  routes, services, idempotency helper and migrations against `9c7e910af` returned no differences.
  Its callers already use fenced idempotency. Newer branch previews existed; they must not be
  confused with production. The latest administrator MFA and dispute worker source checkpoint still
  requires separate production deployment verification; no deployment was performed here.
- Read-only aggregate preconditions found zero invalid escrow/payment statuses, duplicate current
  contract jobs, and previously rewarded contribution accounts. No customer record contents were
  retrieved or printed. The legacy reward-boundary migration therefore had no qualifying accounts.
- Applied the remaining 52 files using Supabase CLI 2.116.0 `db push --linked --skip-vault --yes`.
  Exit 0. No seed, role-file, vault or environment changes were included. No payment, settlement,
  deletion or notification business RPC was invoked as a test.
- Hosted migration history now contains all 53 audit versions, first `20260907220020`, last
  `20260922135151`. A fresh `db push --linked --dry-run --skip-vault` returned `upToDate: true` and
  an empty migrations list. Existing migration files were not rewritten or history repaired.
- Effective privileges: authenticated profile role UPDATE false; first_name UPDATE true; direct
  contract and escrow INSERT false; service-role old claim execution false and replacement fenced
  claim execution true.
- Twelve sampled internal tables (contract evidence, retained contracts, account deletion, dispute
  links/resolutions, refunds/releases, funding, job exit, reconciliation, photo bindings) all had
  RLS enabled and no anon/authenticated SELECT/INSERT/UPDATE/DELETE table privileges.

CLI output is retained locally in `hosted-migration-rollout-20260922.log`. This establishes applied
migration parity and sampled metadata controls, not complete schema equivalence or verified customer
journeys. No hosted synthetic users or provider payment attempts were created.

## Advisor results still requiring disposition

The post-rollout Supabase security advisor reported:

- One ERROR for extension-owned public.spatial_ref_sys lacking RLS, and a WARN for PostGIS in
  public. These were also present in the isolated local review; do not move the extension blindly.
- Ten anonymous and eleven authenticated SECURITY DEFINER callable-function warnings, covering
  retained RLS access helpers and PostGIS routines. Review predicates and dependencies before
  changing execution grants; these counts alone do not establish exploitable escalation.
- Leaked-password protection disabled and PostgreSQL security patches available. These are platform
  configuration/upgrade work, not solved by the application migrations.
- 67 informational RLS-without-policy notices, including intentionally server-only internal tables.
  No policy was added merely to silence an informational warning.

References:
[RLS advisor](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public),
[function advisor](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection),
[database upgrades](https://supabase.com/docs/guides/platform/upgrading).

## Remaining goal

Readiness remains unestablished. The original F1–F15 closure review still needs outstanding caller,
recovery, retention, upload/session and real journey evidence. The new property operations brief is
mostly unimplemented: P0 Inbox/command centre/work orders, then compliance/assets/planned work,
documents/history/financials and evidence-backed insights. Final web/mobile/build/browser/provider
verification and the platform items above remain distinct completion gates. No completion percentage
or finish date is supported by the evidence.

### Hosted follow-up: customer disputes and mediation

On 22 September, applied 20260922145716_atomic_customer_job_dispute and
20260922151331_authorize_atomic_mediation_transitions after local diagnostics, full migration replay
and commits 1506f414f / 886647edf. The mediation dry-run listed exactly one pending migration; no
seeds or role files. Both push operations exited 0. Supabase MCP metadata checks confirmed both
original versions are present. The customer-dispute and mediation functions deny execution to
anon/authenticated; mediation permits service_role. No synthetic records were inserted into
production. This brings this rollout to 55 application migrations. Application deployment is
separate and was not performed.

The mediation checkpoint passed 3,829 tests across 366 files (192.93 seconds), plus one
administrator exact-payment diagnostic added after suite discovery; web types, changed-source lint
and normal commit hooks passed. Local security advisors still report the existing PostGIS issues.
This is not overall launch approval.

### Recurring-cycle rollout verified

Applied migration 20260922155753_enforce_recurring_job_cycle_uniqueness from commit 750ab0f62 after
a dry-run listed only that migration (no seeds/roles). Hosted push exited 0. Supabase MCP verified
the original migration version, a valid unique cycle index, an enabled validation trigger, and
denied direct execution of the trigger function to authenticated clients. No production fixtures or
customer records were changed. The observed deployed application already supplies both required
cycle fields; the new scheduler recovery and UI copy still need the application deployment. This is
the 56th migration in the recorded rollout. Full web suite: 3,849 tests / 372 files passed; local
overlapping transactions produced one job and all synthetic fixtures were removed.

## Team administration serialization

Applied `20260922182831_serialize_property_team_management.sql` to MintEnance
(`ukrjudtlvapiajkjbcrd`) after local concurrency diagnostics, migration replay/diff, type checks,
focused native tests, and 3,929 passing web tests. Dry-run and execution listed only this migration,
with no seeds or roles; vault changes skipped.

Read-only MCP verification: migration recorded=true; property_team_capacity enabled=true;
manage_property_team EXECUTE for anon=false, authenticated=false, service_role=true. No real team
invitations, emails, or synthetic hosted records were created. The trigger protects legacy direct
inserts while the new application uses the serialized function. No application deployment or
promotion command was run.

## Dispute evidence object protection

Applied `20260922190036_protect_dispute_evidence_objects.sql` to the authorized MintEnance project
after isolated storage-role diagnostics and full migration replay/diff. Dry-run and execution listed
only this migration, no seeds/roles, with vault updates skipped. MCP confirmed restrictive INSERT,
UPDATE and DELETE policies for authenticated clients. No objects were created, changed or removed
remotely during verification. Service-role retention remains possible; archival retrieval and
retention review are still open work.

# Retention archive and review rollout — 22 September, 20:35 UTC

Applied only 20260922195828_retain_deleted_dispute_records and
20260922202042_add_evidence_retention_review after isolated replay/diff returned no changes. Linked
CLI push skipped vault changes and ran no seeds or roles. No application deployment or production
fixture/backfill was performed.

Read-only Supabase MCP verification confirmed both migration versions, all four enabled archive
triggers, RLS on all four new tables, denied authenticated execution of archive/review RPCs, allowed
service-role review execution, and denied service-role deletion of review history.

Local tests cover actual account-deletion HTTP, private evidence byte preservation and unrelated
access denial; two independent database connections racing the first review produced exactly one
success and one revision conflict. Local advisors report existing PostGIS public-schema/RLS and
duplicate service_areas index findings; none concern the new archive/review objects.

Retention disposal and legacy reconciliation remain unimplemented. Review dates do not authorize
automatic deletion. Hosted schema verification is not proof of the live web/native journey.
