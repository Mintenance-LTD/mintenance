# Mintenance Beta Stabilisation — Phase 3 Readiness Report

Date: 2026-09-01  
Status: **PARTIAL**

## A. Phase 3 Status

**PARTIAL.** Migration, type, static authorization, dependency, terminology, and mobile async audits
are complete. Real-user Supabase journey tests and Stripe test-mode lifecycle tests are not proven
in this environment.

## B. Executive Summary

Mintenance cannot safely enter a controlled beta on the current evidence. Two live P1 authorization
defects remain: any authenticated user can read every non-draft job, and authenticated clients can
insert/update payment rows. The corresponding local hardening migrations exist but are not live. A
controlled beta requires staging verification and authorized deployment of those fixes, plus the
missing real-identity and Stripe journey evidence.

## C. Migration Reconciliation

Live Supabase head is `20260805194939`; local head is `20260831231341`. Seven local migrations are
ahead. The detailed matrix and ordered, non-live application plan are in
[PHASE3_MIGRATION_RECONCILIATION.md](PHASE3_MIGRATION_RECONCILIATION.md).

The required local diff completed against the shadow database and reported only an unassociated
`pg_net` drop for review. No live or staging schema was changed.

Post-audit live re-check: migration head remains `20260805194939`; representative counts remain
profiles 10, jobs 18, payments 0. This is read-only evidence.

## D. Authorization Results

| Resource       | Owner                                    | Other homeowner                         | Assigned contractor        | Other contractor             | Admin               | Result                        |
| -------------- | ---------------------------------------- | --------------------------------------- | -------------------------- | ---------------------------- | ------------------- | ----------------------------- |
| Properties     | Policy present                           | Policy denies by owner unless org/admin | Not proven                 | Not proven                   | Policy allows       | NOT TESTED with separate JWTs |
| Jobs           | Owner read/write policy present          | Non-draft live read exposure            | Update policy present      | Non-draft live read exposure | Helper-based access | FAIL — PHASE3-001             |
| Quotes/bids    | Contractor/job-homeowner predicates      | Not proven                              | Contractor predicate       | Not proven                   | Admin predicate     | NOT TESTED live               |
| Contracts      | Participant predicates                   | Not proven                              | Participant predicates     | Not proven                   | Admin predicate     | NOT TESTED live               |
| Messages       | Sender/receiver predicates               | Policy denies unrelated                 | Sender/receiver predicates | Policy denies unrelated      | Admin predicate     | NOT TESTED realtime/API       |
| Documents      | Existing owner/contractor policy paths   | Not proven                              | Owner policy paths         | Not proven                   | Not proven          | NOT TESTED                    |
| Payments       | Payer/payee read; payer write live       | Not proven                              | Payee read                 | Not proven                   | Admin               | FAIL — PHASE3-002             |
| Tenant reports | Token/property policies present in tests | Not proven                              | Not proven                 | Not proven                   | Admin path in tests | NOT TESTED live               |

The live policy inventory and defect evidence are in
[PHASE3_AUTHORIZATION_LIVE_AUDIT.md](PHASE3_AUTHORIZATION_LIVE_AUDIT.md). The passing local suite
provides separate-user evidence for the rows marked LOCAL in its test scope; it does not change the
live-project results above.

## E. Core Journey Results

| Step                                 | Result                       | Evidence                                                                                               |
| ------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| Homeowner register/login             | PARTIAL                      | Unit/UI coverage exists; real identity journey not run                                                 |
| Create property                      | NOT TESTED                   | Requires real Supabase identity                                                                        |
| Create maintenance job               | NOT TESTED                   | Requires real Supabase identity                                                                        |
| Contractor discovery                 | NOT TESTED                   | Live matching/RLS and local PostGIS drift remain                                                       |
| Contractor quote                     | LOCAL PASS                   | Continuous homeowner/contractor quote handoff passes in real local Supabase; live/staging not tested   |
| Quote acceptance/contract            | LOCAL PARTIAL                | Local contract participant and review lifecycle passes; live API/race/Stripe path not tested           |
| Payment and webhook                  | LOCAL PASS / LIVE NOT TESTED | 5 focused mocked/unit files pass 109 tests; real Stripe test-mode transaction and delivery unavailable |
| Messaging                            | NOT TESTED                   | Realtime cross-user test unavailable                                                                   |
| Completion evidence/review/history   | NOT TESTED                   | Real journey unavailable                                                                               |
| Homeowner B / Contractor B isolation | FAIL at policy inventory     | PHASE3-001 requires staging/live hardening                                                             |

## F. Payments

- PaymentIntent creation, fee calculation, authorization, refund/release controls, and retry
  behavior: focused mocked/unit coverage passes 109 tests across 5 files; Stripe test-mode execution
  NOT TESTED.
- Idempotency, duplicate requests, and webhook replay: mocked/unit coverage passes, including
  concurrent and sequential PaymentIntent deduplication and duplicate webhook detection; real Stripe
  delivery NOT TESTED end-to-end.
- Webhook signature/raw-body/event handling: mocked/unit coverage passes; live Stripe test-mode
  delivery NOT TESTED.
- Refund and transfer/payout: NOT TESTED with Stripe test mode.
- Payment authorization: FAIL at live policy inventory (PHASE3-002).
- No production money was used.

## G. Landlord / Tenant

- Compliance certificate schema, services, and policy paths exist, but the expiry/reminder/scheduler
  workflow is NOT TESTED end-to-end.
- Anonymous tenant token/report isolation is covered by the passing local real-DB suite
  (separate-user and admin checks); live/staging execution is still NOT TESTED.
- Recurring maintenance policy and service code exist; duplicate cron, frequency, timezone, and
  next-due behavior are NOT TESTED.
- Notification unit/static coverage exists; recipient/delivery behavior across all core events is
  NOT TESTED live.

## H. Security Defects

1. **PHASE3-001 — P1:** live `jobs` SELECT policy exposes all non-draft jobs to any authenticated
   caller. Fix is staged locally in `20260831224315_fix_jobs_select_rls_isolation.sql`; do not apply
   live without authorization.
2. **PHASE3-002 — P1:** live `payments` INSERT/UPDATE policies allow authenticated client mutation.
   Fix is staged locally in `20260831231341_harden_payments_write_rls.sql`; do not apply live
   without authorization.
3. **PHASE3-003 — P2:** mobile test suites create import-time intervals and late callbacks,
   producing 84 open handles. Details are in
   [PHASE3_MOBILE_ASYNC_TEST_AUDIT.md](PHASE3_MOBILE_ASYNC_TEST_AUDIT.md).
4. **PHASE3-004 — P2:** local shadow diff reports an unassociated
   `drop extension if exists "pg_net"`; live lacks `pg_net`, but local config ownership still
   requires review before promotion. No live change made.
5. **PHASE3-005 — P2 resolved:** real-DB bid fixture omitted the required `description` column;
   fixture and direct constraint inserts were aligned.
6. **PHASE3-006 — P2 resolved:** escrow precision test inserted a second active escrow against the
   one-active-per-job invariant; it now updates the existing fixture row.
7. **PHASE3-007 — P1:** the local non-production web environment contains a live Stripe secret;
   runtime correctly fails closed. Replace it with a test key or remove it before local/CI
   execution. No secret was copied or logged.
8. **PHASE3-008 — P2:** the optional YOLO class metadata file is absent from the worktree; the
   service falls back to defaults and logs a warning.
9. **PHASE3-009 — P2:** Playwright login smoke logs a hydration mismatch and poor FCP/TTFB; the
   smoke assertion still passes. Investigate before public beta.
10. **PHASE3-010 — P1 platform action:** the live Supabase security advisor reports that
    `supabase-postgres-17.4.1.074` has outstanding security patches. Upgrade requires a
    managed-platform maintenance window and was not performed by this audit.
11. **PHASE3-011 — P2 hygiene:** live Supabase advisors report 73 security lints (47 INFO
    RLS-without-policy notices, 25 WARNs involving public extensions/SECURITY DEFINER execution/auth
    configuration, and 1 ERROR for extension-owned `spatial_ref_sys`) plus 840 performance lints
    (mostly unused-index INFO notices). These require owner review; no live changes were made.

## I. Dependency Security

The full tree reported 76 findings in Phase 2; production-only audit reports 61 (2 low, 31 moderate,
28 high, 0 critical). Findings were classified by reachability and upgrade risk in
[PHASE3_DEPENDENCY_SECURITY_TRIAGE.md](PHASE3_DEPENDENCY_SECURITY_TRIAGE.md). No force or mass
upgrade was run.

## J. Test Results

- Unit: mobile Jest 452 suites passed, 12,250 tests passed, 5 skipped; 87 snapshots passed. Web
  type-check passes after forcing regeneration of stale shared-package declarations; web Vitest
  passes 275 files / 3,053 tests.
- Integration: local real Supabase suite now passes 10 files / 66 tests, including separate-user
  properties, jobs, messages, documents, tenant reports, compliance certificates, recurring
  schedules, notifications, contracts/reviews and continuous quote handoff, payment controls, escrow
  lifecycle/CAS, bid invariants, and auth triggers. This is LOCAL evidence only, not live-project
  evidence.
- E2E: standalone Chromium login smoke passes 1/1 in 2.4 minutes; server logs include
  PHASE3-007/008/009 warnings and require CI rerun with test secrets.
- Mobile push configuration: Firebase/FCM files are absent from this local checkout, so native push
  is not included in a locally built binary. The required `GOOGLE_SERVICES_JSON`,
  `GOOGLE_SERVICES_PLIST`, and APNs/EAS secret setup is documented without committing secret
  material; push delivery remains an external-device/build verification item.
- Cross-user: static live policy audit FAILS jobs/payments; separate-JWT execution NOT TESTED.
- Static CI authorization/contract gates: service-role scoping scanned 447 routes with 0 new
  findings (11 baselined); API contract validation, auth coverage, notification direct-insert, and
  banned-table checks all passed.
- Stripe: focused mocked/unit payment and webhook run passes 5 files / 109 tests; NOT TESTED with
  test-mode credentials or a real Stripe webhook.
- Supabase/RLS: live read-only inventory completed; no writes performed.
- Live Supabase advisors: security 73 lints (47 INFO / 25 WARN / 1 ERROR); performance 840 lints
  (839 INFO / 1 WARN). The Postgres security-patch warning is recorded as PHASE3-010; advisor
  hygiene is PHASE3-011.
- Live profile environment evidence: 1 admin, 3 contractors, 6 homeowners; separate-user JWT
  execution remains NOT TESTED because the available read-only connector has no impersonation
  harness.

## K. Files Changed

Phase 3 files changed in this work:

- `docs/PHASE3_MIGRATION_RECONCILIATION.md`
- `docs/PHASE3_SCHEMA_CONTRACT_AUDIT.md`
- `docs/PHASE3_AUTHORIZATION_LIVE_AUDIT.md`
- `docs/PHASE3_DEPENDENCY_SECURITY_TRIAGE.md`
- `docs/PHASE3_MOBILE_ASYNC_TEST_AUDIT.md`
- `docs/PHASE3_ESCROW_TERMINOLOGY_AUDIT.md`
- `docs/PHASE3_BETA_READINESS_REPORT.md`
- `docs/PHASE3_EXTERNAL_VERIFICATION.md`
- `apps/web/test/integration/fixtures.ts`
- `apps/web/__tests__/integration-real/bid-acceptance.integration.test.ts`
- `apps/web/__tests__/integration-real/escrow-lifecycle.integration.test.ts`
- `apps/web/__tests__/integration-real/contract-review-lifecycle.integration.test.ts`
- `apps/web/__tests__/integration-real/compliance-recurring-notifications-rls.integration.test.ts`

Earlier Phase 2 files and unrelated user changes are recorded in the Phase 2 report and were
preserved.

## L. Database Changes

Phase 3 applied **no database changes**: LIVE = none, STAGING = none, LOCAL = analysis only. The
seven post-head local migrations are classified in the reconciliation report; the two local security
migrations remain staged, pending authorization and staging verification.

## M. Remaining Risks

### Blocks controlled beta

- PHASE3-001 live jobs data exposure.
- PHASE3-002 live payment mutation exposure.
- Missing real-identity cross-user authorization proof.
- Missing Stripe test-mode payment/webhook/refund/transfer proof.

### Blocks public beta

- Compliance, tenant, recurring-maintenance, notification, dependency P1/P2, and mobile lifecycle
  follow-up.
- Escrow terminology legal/product review.

### Post-beta

- Broad lint warning cleanup and test-suite timer lifecycle cleanup if not required by the
  controlled-beta CI gate.

## N. Beta Readiness Score

Scores are evidence summaries, not approvals; 0 = unproven/blocked and 5 = verified for the stated
scope.

| Area                   | Score |
| ---------------------- | ----: |
| Authentication         |   3/5 |
| Authorization/security |   0/5 |
| Database integrity     |   1/5 |
| API reliability        |   3/5 |
| Web                    |   4/5 |
| Mobile                 |   4/5 |
| Cross-platform         |   2/5 |
| Homeowner              |   2/5 |
| Contractor             |   2/5 |
| Landlord               |   1/5 |
| Payments               |   0/5 |
| AI                     |   3/5 |
| UX                     |   3/5 |
| Data/privacy           |   1/5 |
| Tests                  |   2/5 |
| Performance            |   3/5 |
| Maintainability        |   2/5 |

Overall evidence score: **2/5**.

## O. Final Decision

**NO — NOT READY**

Specific reason: live jobs and payments authorization are not safe for a controlled beta, and the
required real-user and Stripe lifecycle evidence is still missing.

## P. Phase 4 Recommendation

Not started. If authorized later, Phase 4 should focus on post-beta product hardening after the
Phase 3 P1 authorization/payment fixes, staging evidence, and controlled-beta decision are complete.
