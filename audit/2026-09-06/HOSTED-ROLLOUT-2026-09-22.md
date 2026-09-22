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
