# Phase 3 Live Authorization Audit

Date: 2026-09-01  
Source: read-only Supabase MCP `pg_policies` inventory for project `ukrjudtlvapiajkjbcrd`.

The live profile population at audit time was 1 admin, 3 contractors, and 6 homeowners (aggregate
counts only; no identities are recorded here).

This is an authorization-policy inventory, not a substitute for tests with separate authenticated
identities. No live data or schema was changed.

## Current policy observations

The repository's current authorization model treats every non-draft job as marketplace-visible to
authenticated contractors; the local regression suite therefore tests homeowner isolation from
private/draft jobs while preserving contractor marketplace reads. This is an intentional
product-policy boundary, not evidence that contractor-to-contractor job confidentiality has been
proven. Any narrower visibility rule would require an explicit product and policy decision outside
this audit.

| Resource                          | Live policy observation                                                                                                                                                                                             | Phase 3 interpretation                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `properties`                      | Insert/update/delete are owner-scoped; SELECT also permits organization members and admins.                                                                                                                         | Promising but requires homeowner A/B, contractor, org-member, admin, document, and private-photo tests.                                                       |
| `jobs`                            | Insert/delete are homeowner-scoped; update permits homeowner or assigned contractor. SELECT currently permits any `authenticated` caller to read any non-draft job through `status <> 'draft'`, regardless of role. | **P1 security defect PHASE3-001.** This is the live version of the Phase 2 blocker. The local `20260831224315_fix_jobs_select_rls_isolation.sql` is not live. |
| `bids`                            | Insert is contractor-id scoped; SELECT/update allow bid contractor, job homeowner, or admin.                                                                                                                        | Requires quote ownership, cross-contractor mutation, status/acceptance, duplicate/race, and client-side amount tests.                                         |
| `contracts`                       | SELECT exposes rows to homeowner/contractor/admin; INSERT and UPDATE have broad participant predicates, with update checks for pending/signed states.                                                               | Requires immutable-field and cross-user contract tests; inspect whether participant updates permit protected ID reassignment.                                 |
| `messages`                        | SELECT/update are sender/receiver/admin scoped; insert requires sender identity or admin; delete is sender/admin scoped.                                                                                            | Requires guessed conversation/message IDs, realtime subscription, attachment, and direct API tests.                                                           |
| `payments`                        | Live INSERT permits authenticated payer/admin; UPDATE permits payer/admin; SELECT permits payer/payee/admin.                                                                                                        | **P1 security defect PHASE3-002.** The local payment lockdown migration is not live. Payment mutation must be server-only and proven with Stripe test mode.   |
| `profiles`                        | SELECT is authenticated and allows any non-deleted profile, self, or admin; update is self-scoped; delete is admin-scoped.                                                                                          | Review whether profile fields expose sensitive payment/compliance data; run field-level/API tests.                                                            |
| `compliance_certificates`         | ALL is owner/admin qualified; with-check is owner-only.                                                                                                                                                             | Requires landlord/org model test, certificate storage access, expiry boundaries, reminders, and renewal job flow.                                             |
| `recurring_maintenance_schedules` | ALL is qualified through ownership of the referenced property.                                                                                                                                                      | Requires ownership, duplicate scheduler execution, frequency, timezone, and next-due tests.                                                                   |
| `recurring_schedules`             | ALL is owner/admin qualified; with-check is owner-only.                                                                                                                                                             | Requires distinction from the other recurring table and scheduler behavior verification.                                                                      |

The live table-grant snapshot narrows the direct-client mutation surface for `contracts`:
`authenticated` has `INSERT` and `SELECT`, but no `UPDATE` or `DELETE` grant. The broad UPDATE
policy therefore remains a policy-design review item, not a confirmed direct-client exploit.
`reviews`, compliance, recurring, and notification tables retain broad table grants but rely on
their RLS predicates; the local suite provides ownership read-isolation evidence for the latter
groups, while live/staging execution remains pending.

## Defects

### PHASE3-001 — Live jobs marketplace policy is too broad

- Severity: P1 — blocks controlled beta authorization sign-off.
- Affected systems: Supabase `jobs` SELECT, web discovery, job detail/API reads, and any consumer of
  authenticated job queries.
- Affected roles: any authenticated homeowner, tenant-like account, or other non-contractor can
  query non-draft jobs.
- Evidence: live `pg_policies` policy `rls_merged_select_49214f8cf3e9df480f55df7fd5ba0ed1` has
  qualification `status <> 'draft' OR homeowner_id = auth.uid() OR contractor_id = auth.uid()` and
  is scoped to `{authenticated}` without a contractor-role predicate.
- Expected: only the owner, assigned contractor, admin, or an explicitly authorized marketplace
  contractor can see the corresponding job data.
- Actual: any authenticated caller can see every non-draft job.
- Required fix: stage and apply the already-authored local hardening migration only after
  separate-user tests and migration approval; do not modify live in this audit without explicit
  authorization.
- Tests required: homeowner A/B, contractor A/B, admin, draft/posted/assigned/ completed/cancelled
  states, direct API and Supabase queries.

### PHASE3-002 — Live payments still allow client mutation

- Severity: P1 — blocks controlled beta payment authorization sign-off.
- Affected systems: live `payments` INSERT/UPDATE policies and payment lifecycle routes.
- Affected roles: authenticated clients, including non-admin payers.
- Evidence: live `payments_insert_policy` allows `is_admin()` or `auth.uid() = payer_id`; live
  `payments_update_policy` allows the same.
- Expected: client identities read only their payer/payee records; server-side payment/webhook
  services create and mutate payment rows.
- Actual: an authenticated client can attempt direct payment insert/update, subject to payer/admin
  predicates and any table constraints.
- Required fix: stage and apply the already-authored local payment lockdown migration after Stripe
  test-mode route verification; do not modify live here.
- Tests required: forged amount/currency/job/contractor/payment ID, repeated requests, webhook
  replay/out-of-order events, refund authorization, and server-role success paths.

## Test status

The repository contains real-DB integration suites for jobs, escrow, and broad cross-user isolation.
The isolated local Supabase run passed 10 files / 66 tests after aligning the bid fixture with the
required `description` column and making the escrow precision assertion reuse the
single-active-escrow fixture. The live MCP inventory above is evidence of live policy state only; it
does not prove row-level behavior under separate live JWTs. The available read-only SQL connector
did not provide a user-JWT/session impersonation harness, so no claim is made that these policies
were exercised as HOMEOWNER_A/B or CONTRACTOR_A/B. No live writes were performed.
