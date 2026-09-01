# Mintenance Beta Stabilisation — Phase 3.5 Controlled-Beta Report

Date: 2026-09-01  
Scope: security and payments gate from the Phase 3.5 specification  
Environment labels: LOCAL = isolated local Supabase stack; STAGING = no separate hosted staging
project identified; LIVE = Supabase project `ukrjudtlvapiajkjbcrd`.

## A. Status

**PARTIAL — CONTROLLED BETA GATE NOT PROVEN.** The local isolated stack has separate-user RLS
evidence and the repository contains narrowly scoped jobs/payment hardening migrations. The required
hosted staging run, real Stripe test-mode lifecycle, and independent production-user JWT execution
are not available. No live schema or data was changed.

## B. Jobs RLS

Before: LIVE policy inventory re-confirmed PHASE3-001: the merged SELECT predicate includes
`status <> 'draft'`, so any authenticated user can read any non-draft job. This exposes jobs to
unrelated homeowners and contractors. LOCAL evidence covers separate-user
job/property/message/document/tenant-report journeys, but does not change LIVE.

After: LOCAL migration `20260831224315_fix_jobs_select_rls_isolation.sql` now narrows private/draft
reads to the homeowner, assigned contractor, or admin and limits marketplace discovery to
authenticated contractors viewing unassigned `open`/`posted` jobs. This correction was made after
the first assigned-job test exposed that a broad non-draft predicate would still leak assigned jobs.
It has not been applied to LIVE or a hosted STAGING database.

Required identity matrix: HOMEOWNER_A, HOMEOWNER_B, CONTRACTOR_A, CONTRACTOR_B, and ADMIN_A. The
local real-DB harness creates separate real Auth users and JWT-backed clients dynamically. Before
the predicate correction, the focused cross-user suite passed 1 file / 4 tests and the jobs-RLS
suite passed 1 file / 6 tests; after the correction, the clean local rebuild could not complete
because the Supabase CLI left only Postgres running and `public.profiles` absent. The assigned-job
assertions therefore remain **LOCAL TEST ADDED / POST-FIX EXECUTION BLOCKED / STAGING-LIVE NOT
PROVEN**. The exact Phase 3.5 matrix has not been executed against a hosted STAGING project or LIVE
with independently provisioned named identities.

## C. Payment RLS

Before: LIVE policy inventory re-confirmed PHASE3-002: `payments_insert_policy` permits an
authenticated payer/admin to INSERT and `payments_update_policy` permits an authenticated
payer/admin to UPDATE payment ledger rows.

After: LOCAL migration `20260831231341_harden_payments_write_rls.sql` drops client INSERT/UPDATE
policies and revokes `INSERT, UPDATE, DELETE` from `anon` and `authenticated`. Client reads remain
policy-controlled. Server-side payment services must use an authorized server client. The migration
has not been applied to LIVE or hosted STAGING.

Direct client attack variants are covered by local policy/test evidence only. The real local
payment-flow suite passed 1 file / 16 tests, including payer/payee/admin reads, third-party and
anonymous denial, authenticated insert/update/delete denial, and service-role state transitions.
Server-side PaymentIntent/payment-row creation, webhook updates, refunds, and transfer/release paths
still require execution in Stripe test mode with the application’s authorized server credentials;
that proof is not available here.

## D. Cross-user table

| Resource                   | Homeowner B against A                                                                                                    | Contractor B against A                                                                                      | Environment result                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Jobs                       | Denied for private/draft and owner-only mutations under LOCAL hardening; marketplace visibility remains policy-dependent | Denied for private/assigned reads and updates under LOCAL hardening; legitimate discovery remains preserved | LOCAL evidence; STAGING/LIVE JWT proof missing  |
| Properties                 | Owner-scoped policy path                                                                                                 | Not an owner path; participant/admin rules require separate identity execution                              | LOCAL coverage; STAGING/LIVE not proven         |
| Messages                   | Unrelated sender/receiver access denied in local real-DB tests                                                           | Unrelated sender/receiver access denied in local real-DB tests                                              | LOCAL only                                      |
| Quotes/contracts/documents | Participant predicates and lifecycle tests pass locally where covered                                                    | Participant predicates and lifecycle tests pass locally where covered                                       | LOCAL only                                      |
| Payments                   | Arbitrary ledger mutation denied by LOCAL hardening                                                                      | Arbitrary ledger mutation denied by LOCAL hardening                                                         | LIVE remains exposed until authorized promotion |
| Tenant reports             | Token/property isolation covered locally                                                                                 | Unrelated access not proven against hosted environments                                                     | LOCAL only                                      |

## E. Stripe test mode

| Check                                             | Result                                                        |
| ------------------------------------------------- | ------------------------------------------------------------- |
| PaymentIntent creation and fee calculation        | LOCAL mocked/unit pass; real Stripe not run                   |
| Manipulated amount rejection                      | LOCAL mocked/unit pass; real Stripe not run                   |
| Idempotency and duplicate requests                | LOCAL mocked/unit pass, including concurrent/sequential paths |
| Webhook signature, replay, and duplicate delivery | LOCAL mocked/unit pass; real webhook delivery not run         |
| Refund                                            | LOCAL control coverage; Stripe test-mode execution not run    |
| Transfer/release                                  | LOCAL control coverage; Stripe test-mode execution not run    |
| Production money                                  | None used                                                     |

The focused payment/webhook run passed 5 files / 109 tests. This is not a substitute for a real
Stripe test-mode account, test PaymentIntent, test webhook delivery, and test Connect
transfer/refund lifecycle.

## F. Stripe secret hygiene (PHASE3-007)

The prior audit identified a live Stripe secret in a local non-production environment. The
application failed closed and no secret was copied or logged. The secret’s storage and exposure
history require owner confirmation. Replace/remove any non-test local or CI value, keep production
secrets only in the production secret store, and rotate the exposed value if the owner confirms it
was disclosed. No automatic rotation was performed.

## G. Database changes

| Environment | Change                                                                                                                            | Result                                                                                                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LOCAL       | Reviewed seven migrations after live head; retained only jobs RLS and payment-write hardening as this phase’s security candidates | Local hardening files present; pre-correction cross-user 1/4, jobs RLS 1/6, payment flow 1/16, quote/contract/compliance/tenant suites 3/15 passed; post-correction assigned-job rerun blocked by incomplete local rebuild |
| STAGING     | No separate hosted staging project identified; `.env.staging` contains the placeholder host `your-staging-project.supabase.co`    | No migrations applied; gate remains open                                                                                                                                                                                   |
| LIVE        | Read-only Supabase MCP checks only                                                                                                | Migration head remains `20260805194939`; counts are profiles 10, jobs 18, payments 0; no writes                                                                                                                            |

The local head is `20260831231341`, seven migrations ahead of LIVE. The required shadow diff
completed with only an unassociated local `pg_net` drop for review. Unrelated ML, schema,
bookkeeping, and platform migrations are not part of this controlled-beta promotion set.

## H. Remaining P1 items

- PHASE3-001: promote and verify jobs SELECT isolation after hosted staging proof.
- PHASE3-002: promote and verify payment-write lockdown after hosted staging and server/Stripe
  proof.
- PHASE3-007: replace/remove the non-production live Stripe secret and complete the
  exposure/rotation assessment.
- PHASE3-010: Supabase security advisor reports outstanding PostgreSQL security patches;
  platform-owner maintenance action remains outstanding.
- Real independent JWT execution for HOMEOWNER_A/B, CONTRACTOR_A/B, and ADMIN_A is missing outside
  LOCAL.
- The corrected assigned-job predicate has not yet been executed because the clean local Supabase
  rebuild is incomplete; only the migration and test assertions are currently verified statically.
- Real Stripe test-mode PaymentIntent, amount manipulation, idempotency, webhook/replay, refund, and
  transfer/release evidence is missing.

## I. Production promotion plan

1. Create or identify a separate hosted STAGING Supabase project or branch and use non-production
   data and credentials; do not clone production secrets.
2. Reconcile the hosted staging migration baseline to LIVE head `20260805194939`. Apply/test only
   the jobs RLS and payment-write hardening after reviewing dependency and migration-history
   results.
3. Seed five separate test identities and run the full matrix in B–D. Run the web server payment
   paths using Stripe test keys and test Connect accounts; capture denial, success, replay,
   idempotency, refund, and transfer evidence without production money.
4. Before LIVE promotion, take a verified database backup, record exact migration checksums and
   order, confirm lock/downtime expectations, and obtain explicit production authorization.
5. Promote the two security migrations in dependency order, independently of any platform PostgreSQL
   patch. Verify policies, grants, representative row visibility, payment server writes, webhook
   idempotency, and application smoke journeys immediately afterward.
6. Monitor authorization denials, payment/webhook failures, database errors, and Stripe events. Roll
   back only through an approved compensating migration after preserving evidence; never restore
   client payment-write access as a routine fallback.

## J. Decision

**NO — CONTROLLED BETA BLOCKED**

The controlled-beta gate is blocked because hosted staging, independent non-production JWT
execution, real Stripe test-mode lifecycle evidence, and the two live P1 fixes are not all available
and verified.

## K. Next step

**REMAINING SECURITY FIXES** — provision/identify hosted staging, obtain separate test identities
and Stripe test credentials, run the required matrix, then request explicit authorization for a
reviewed production promotion.

## Evidence references

- [Phase 3 readiness report](PHASE3_BETA_READINESS_REPORT.md)
- [Phase 3 migration reconciliation](PHASE3_MIGRATION_RECONCILIATION.md)
- [Phase 3 live authorization audit](PHASE3_AUTHORIZATION_LIVE_AUDIT.md)
- [Phase 3 escrow terminology audit](PHASE3_ESCROW_TERMINOLOGY_AUDIT.md)
- `apps/web/__tests__/integration-real/`
- `supabase/migrations/20260831224315_fix_jobs_select_rls_isolation.sql`
- `supabase/migrations/20260831231341_harden_payments_write_rls.sql`
