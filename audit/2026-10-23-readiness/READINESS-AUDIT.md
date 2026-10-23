# Mintenance readiness audit

**Audit date:** 23 October 2026. **Verdict: not ready for an unrestricted public launch; conditional readiness for a controlled beta.**

**Remediation follow-up:** Local fixes and their verification are tracked in [REMEDIATION.md](REMEDIATION.md). The user chose to retain restricted-beta access. The findings below preserve the original production audit; local fixes are not yet deployed.

Production is deployed and the database is healthy. There is substantial working application logic and useful automated coverage. However, public access is currently protected by Vercel login, production admin notifications are failing, financial monitoring has a currency-unit error, and payment/push exceptions remain unresolved. Mobile and several newer user journeys still lack current end-to-end evidence.

This is a code, configuration, production-data and logs audit, supplemented by local automated tests. It is **not a complete functional certification** of every route, screen or device. Production was inspected read-only. No payments, refunds, messages, account changes, deployments or production data changes were performed. No application fixes were made.

## Follow-up: approved deployment access

After explicit user approval on 23 October, a temporary Vercel share link was created successfully. Vercel reports expiry at 24 October 2026, 09:44:28 (the returned display did not specify its timezone). The token is intentionally omitted from these audit files. The deployment's protection settings were not changed.

The protected deployment was then checked in a browser:

- The homepage rendered successfully.
- “Post your first job” redirected an anonymous visitor to `/login?redirect=%2Fjobs%2Fcreate`, preserving the intended destination.
- The sign-in form, registration form and homeowner/contractor registration selector rendered and responded to navigation.
- Password recovery and tenant report recovery forms rendered. Neither email form was submitted.
- `/api/version` returned HTTP 200 and production build ID `629538241d10f533f9cb1f5720070803b548bf4c`, matching the audited release.
- `/api/jobs` and `/api/payments/methods` displayed application JSON with `AUTH_REQUIRED` when accessed without an application session. The connector initially labelled their 401 responses as deployment-authentication failures; direct browser inspection established that these were application responses.

This removes the deployment-access blocker for this audit session. It does not resolve F1 for ordinary visitors, change the launch verdict, or establish that account creation, sign-in, email delivery, payments or role-specific journeys work end to end. No application account was signed into and no account or business record was created.

## Scope and release identity

| Area | Evidence inspected |
|---|---|
| Web | Next.js 16.4.1; 486 API route files; authentication, authorization, payment, property, tenant-report, notification and cron implementations |
| Mobile | Expo 54 / React Native 0.81.5; navigation, auth, API client, endpoint references, Android build metadata and selected Jest suites |
| Database | Production Supabase schema, 384 public base tables, grants, RLS, storage policies, migrations, advisors and aggregate business records |
| Operations | Vercel deployment/build/runtime logs; Supabase log sources and relevant Postgres errors; cron history, reconciliation and delivery queues |
| Local checks | Both application type checks; 1,265 unique web tests and 1,023 mobile tests in the selected suites; dependency audit |

The inspected production deployment is `dpl_3SJRMMTYCskVyft2DDGk9Bqm4CwT`, commit `629538241d10f533f9cb1f5720070803b548bf4c` on `main`, created 22 October at 20:01:57 UTC and marked READY around 20:09:58 UTC. The canonical alias is [www.mintenance.co.uk](https://www.mintenance.co.uk).

Three local source copies were present. The audit used `security-audit-oct22`, branch `fix/tenant-report-experience`, HEAD `9cac086673fd67a0fd4f74982ce0c910244ba730`. Comparison with production found a local tenant-link recovery change in two components and its test that is not deployed. Results involving that recovery UX therefore describe local code, not verified production behavior. Existing uncommitted work was preserved.

The active production Supabase project is `ukrjudtlvapiajkjbcrd` in `eu-west-2`, status ACTIVE_HEALTHY. The named staging project is inactive. The two deployed Edge Functions inspected are intentional HTTP 410 retirement stubs; active business APIs are mainly Next.js routes.

## Prioritized findings

Priority P1 means resolve before broad public use; P2 means address during beta hardening. Evidence labels distinguish observed failures from source-level risks and untested behavior.

### F1 — P1: Public production access requires Vercel authentication

**Observed configuration and browser behavior.** Opening the public domain redirected to Vercel login. Project SSO protection is enabled for all deployments and password protection is configured. This blocks ordinary anonymous access in the inspected browser, including the intended starting point for signup and public tenant reports.

Mobile production EAS configuration points to the same domain. Deployment protection is consequently a likely API availability blocker for ordinary mobile clients, but that consequence was not tested on a device.

If this is an intentionally restricted beta, document that restriction. Before public launch, configure access for the intended public audience and verify anonymous landing, signup, tenant links and mobile API requests. Keep the application's own authentication and authorization protections intact.

**Acceptance:** an unauthenticated ordinary browser can reach public pages; restricted application data still requires app authentication; a release mobile build can call its intended API without a Vercel session.

### F2 — P1: Admin alerts fail to persist while the cron reports success

**Confirmed production failure with matching source cause.** Vercel and Postgres logs on 23 October around 08:00 UTC record two notification insert failures: `value too long for type character varying(50)`. The live `notifications.type` column allows 50 characters.

[AdminAlertService.ts:101](C:/Users/gloir/Downloads/mintenance-main/security-audit-oct22/apps/web/lib/services/admin/AdminAlertService.ts:101) generates `overdue_escrow_` plus a UUID: 51 characters. The high-value-payment and failed-payment variants at lines 225 and 357 are also over the limit. Two admin recipients encountered the error during the latest run.

[NotificationService.ts:67](C:/Users/gloir/Downloads/mintenance-main/security-audit-oct22/apps/web/lib/services/notifications/NotificationService.ts:67) returns null after an insert error. The alert dispatcher does not treat a fulfilled null result as failure, and its summary counts candidate alerts rather than successful persistence. The cron therefore recorded success with `created: 2` despite the errors.

Use stable short notification types and store entity/deduplication identifiers separately. Distinguish preference suppression from persistence failure and propagate real failures to cron monitoring.

**Acceptance:** all alert types fit the live schema; overdue-escrow and high-value alerts reach the intended admins; an injected database failure produces a failed/degraded cron result; reported creation counts match persisted notifications.

### F3 — P1: Financial alert thresholds and displayed amounts use the wrong units

**Confirmed source defect; affects monitoring, not proven fund movement.** [AdminAlertService.ts:207](C:/Users/gloir/Downloads/mintenance-main/security-audit-oct22/apps/web/lib/services/admin/AdminAlertService.ts:207) treats `escrow_transactions.amount` as pence. The funding implementation and SQL invariants establish that this column stores pounds and is multiplied by 100 when converted to minor units.

The intended £5,000 high-value threshold is set to `500_000`, so it actually selects transactions at £500,000. Escrow/payment text divides already-pound amounts by 100, understating them by a factor of 100.

Unify monetary-unit conventions and use a shared formatter. Audit every alert calculation using this column. The relevant conversion is in [PaymentFundingService.ts](C:/Users/gloir/Downloads/mintenance-main/security-audit-oct22/apps/web/lib/services/payment/PaymentFundingService.ts).

**Acceptance:** boundary tests around £5,000 select the correct transactions; a £120 escrow displays £120.00; minor-unit conversions occur only at provider/integer boundaries.

### F4 — P1 investigation: Four payment reconciliation exceptions remain

**Observed persisted reconciliation evidence; not a direct Stripe-account audit.** Nine escrow records have reconciliation results: five matched, two identity mismatches and two missing provider resources. The exceptions were last checked on 22 October and scheduled for recheck on 23 October evening UTC.

One mismatch records a £1.46 succeeded provider payment with a status discrepancy; another records £120 with provider status `requires_payment_method`. Both report matching amounts but mismatching identity. The other two are classified as missing resources.

These records do not establish lost funds or an active exploit. Check the correct Stripe account and test/live mode, payment metadata, payer/payee/job identity, and webhook history. Resolve each case with recorded evidence before treating the ledger as reconciled. Do not blindly retry a charge, release or refund to clear the warning.

**Acceptance:** every exception has an explained and reconciled disposition; successful money operations remain idempotent; the operational UI distinguishes unresolved exceptions from successful cron execution.

### F5 — P2: Notification delivery remains unresolved and noisy

**Observed production data and logs.** Four push attempts have remained `needs_review` since 5 October. Current-deployment runtime logs repeatedly report these same four attempts. Three queue records are terminally failed with `no_push_tokens`, each after six retries: two win-back messages and one payment message.

Seventeen receipts are `provider_accepted`. That proves provider acceptance, not display or receipt on a device. Investigate token registration/refresh, expired tokens, permission denial, foreground/background behavior and fallback channels for transactional messages. Repeated review-required logs need a durable incident/acknowledgment path.

**Acceptance:** reconcile the four attempts; handle missing tokens without futile retry loops; verify payment notifications on Android and iOS with permissions both enabled and denied.

### F6 — P2: An authenticated assessment endpoint can bypass its stated quota

**Source-level risk; no live abuse test performed.** [maintenance/assess/route.ts:29](C:/Users/gloir/Downloads/mintenance-main/security-audit-oct22/apps/web/app/api/maintenance/assess/route.ts:29) disables the shared route limiter and implements a 20/hour quota by counting saved assessment rows. The caller can set `saveAssessment: false`, so requests can consume inference work without incrementing that counter. Concurrent requests also race the count. No-detection/fallback paths can return before saving.

[MaintenanceAssessmentService.ts:436](C:/Users/gloir/Downloads/mintenance-main/security-audit-oct22/apps/web/lib/services/maintenance/MaintenanceAssessmentService.ts:436) also ignores the Supabase insert result's `error` field and can log a successful save when the database rejected it. POST accepts an optional job ID without a route-level ownership check before passing it to the privileged persistence service.

No current UI caller was found in the searched web/mobile component and app sources, and this endpoint's `maintenance_assessments` table contained zero records. This is an exposed-code hardening issue, not evidence that the main building-surveyor journey is failing.

**Acceptance:** either retire this endpoint or use an atomic request-based quota independent of persistence, validate job access, and propagate persistence errors. Test with mocked inference; avoid unnecessary paid production calls.

### F7 — P2: Dependency security updates are outstanding

The fresh npm audit reports 78 dependency entries: 2 critical, 52 high, 20 moderate and 4 low. These include development/transitive dependencies and are not 78 independently exploitable production issues.

The critical entries include `@sentry/nextjs` 10.42.0 and DOMPurify 3.4.16. The [Sentry advisory](https://github.com/advisories/GHSA-mchm-gjx6-7h55) identifies 10.75.2 as patched. The [DOMPurify advisory](https://github.com/advisories/GHSA-cg2g-xh64-v4q7) identifies 3.4.17 as patched. Inspection found Sentry's `tunnelRoute` disabled and did not find the DOMPurify option combination required by the specific critical advisory in the reviewed sanitizer configurations. These particular exploit prerequisites therefore were not established in this application.

Patch supported versions and run affected build/sanitization/monitoring checks. Triage the remaining high entries by production reachability and dependency chain. Avoid an unreviewed forced dependency upgrade.

### F8 — P2: Release and verification gaps prevent mobile/all-role sign-off

The available local Android build metadata describes a successful 1.2.4 build 36 from 11 October, commit `718be11428fd38ebd942baa7357e32113830b45f`. It is older than the audited web deployment. This is the latest artifact inspected, not proof that no newer build exists. No current iOS distribution evidence was available.

Mobile home routing explicitly supports homeowner and contractor views; other roles fall back to the homeowner dashboard in [HomeScreen.tsx](C:/Users/gloir/Downloads/mintenance-main/security-audit-oct22/apps/mobile/src/screens/home/HomeScreen.tsx). A dedicated mobile admin workflow was not established. This is a product-support gap, not proof of an authorization bypass.

The named staging database is inactive. Vercel runs Node 24.x while local/CI/EAS configuration uses Node 20.19.4. Both can build successfully, but this mismatch reduces reproduction fidelity. Align or explicitly test supported runtime versions. Sentry upload/crash-reporting build flags also need release-artifact verification; source configuration alone does not establish working crash symbolication.

**Acceptance:** test current signed Android and iOS builds against a representative staging backend; explicitly define mobile role support; verify production crash reports and symbols; reconcile runtime and release versions.

## User-journey assessment

| User / journey | Evidence obtained | Remaining release gate |
|---|---|---|
| Visitor / new user | Public browser check, auth middleware and API review | Resolve intended production access; signup, verification, reset and login in a real browser/device |
| Homeowner | Job/bid/contract/payment code and tests; 6 profiles, 5 onboarded; historical completed jobs | Fresh job → bid acceptance → contract → funding → completion → review, including cancellation and refund |
| Contractor | Discovery/bid/job/payout code and tests; 7 profiles, 3 onboarded; 2 payment-ready | Verification, Connect onboarding, assignment, evidence uploads, payout and failure recovery on both clients |
| Admin | Both admin accounts have MFA; sensitive route checks reviewed | Fix alert persistence/amounts; test MFA step-up, verification, disputes, releases and recovery UI |
| Tenant / anonymous reporter | Two new reports, one verified email-access record; current migrations applied; local recovery tests | Public report link, photo upload, email delivery, reply, expired/replaced link and revoked access in deployed build |
| Property owner / manager / organization member | Property/team API and role tests reviewed | No organizations, memberships or maintenance tickets in the observed data; seed realistic multi-member fixtures and run access/assignment flows |
| Recurring maintenance | Two active auto-create schedules; none overdue at snapshot | Both have no last-job link; demonstrate one scheduled creation, idempotent retry and correct next-run advancement |
| Messaging | 75 persisted messages; authorization paths reviewed | Two-user delivery, unread state, attachments, push/deep links and offline reconnect |
| AI assessment | Main assessment statuses and service code inspected | Current provider/model availability, upload handling, timeout/fallback UX, costs and output quality with controlled images |
| Subscriptions / disputes / refunds | One active contractor subscription, two resolved disputes, two succeeded refund operations, one completed payout operation | Provider-backed lifecycle and retry tests; these small historical samples do not prove every branch |

The user population and historical records are too small to infer broad adoption, device coverage or production-scale reliability. Test-like values were present, but records were not definitively classified as synthetic versus real.

## What is working, with limits

The latest Vercel deployment completed successfully in approximately eight minutes. The three most recent production deployments inspected were READY; an earlier install failure was followed by a lockfile correction and successful deployments. Supabase is healthy and the recent tenant-report/storage migrations are present.

The API inventory found 436 route files referencing `withApiHandler` and 43 referencing `withCronHandler`, with one overlap. The eight remaining route files were inspected as aliases, retired responses or manually guarded endpoints, including Stripe signature/idempotency handling. Counts are static inventory signals, not individual endpoint certifications.

Shared authentication handles web cookies and mobile bearer tokens. Invalid bearer tokens do not silently fall back to cookies. Cookie-based mutation CSRF checks, role checks, admin/MFA mechanisms and stricter financial rate-limit behavior are present in reviewed paths. Payment funding uses server-authoritative calculations and shared validation rather than trusting a client amount.

The mobile endpoint scan identified 296 explicit API-client calls: 290 matched directly to route patterns; five apparent misses were query-template parsing artifacts with routes present; one unused similar-jobs helper references an absent endpoint. This establishes broad route alignment, not HTTP method, payload or response compatibility for all calls.

Read-only RLS probes used an unrelated synthetic authenticated identity inside rolled-back transactions. It saw zero rows in profiles, jobs, bids, messages, escrows and properties. Anonymous probes saw zero bids/properties. These are useful negative-access checks, not a complete owner/contractor/organization cross-account matrix.

Authenticated users cannot directly update sensitive profile columns such as role, admin verification, MFA state or payout-enabled state. Direct authenticated writes to payments/escrows are denied by the inspected grants. No auth/profile orphans, duplicate payment-intent IDs, assigned jobs without contractors, or completed jobs without completion timestamps were found in the queried populations.

Of 14 storage buckets, the public ones were avatars, profile images and contractor portfolio assets. Job, assessment, property-document, contractor-document and tenant-photo buckets are private. Signed URL lifetime and cross-user file access still need browser/device lifecycle tests.

## Database and operational interpretation

The database contains 15 active profiles: 6 homeowners, 7 contractors and 2 admins. Four auth users had signed in during the preceding seven days. Undeleted jobs comprised 11 assigned, 7 completed and 240 cancelled. There were 18 accepted bids and 2 rejected bids; 16 accepted contracts and two awaiting a party. This distribution is descriptive, not proof of a cancellation defect.

Nine escrows totalled: held £1.32, completed £3.70, failed £120, pending £122.66 and refunded £1.90 across their respective status groups. Values are stored in pounds. These aggregates do not establish the external Stripe balance.

The main assessment records had 608 pending validations, 129 validated, 11 `ai_analysis_failed` and 4 needing review. Their most recent records are historical. A pending validation status is not necessarily an active inference job stuck in processing; establish lifecycle meaning and current provider health before remediating the backlog.

The tenant email outbox had zero rows. That establishes no observed queued backlog, not successful delivery. There were no report conversation messages. End-to-end tenant email/reply behavior is consequently unproven by the current production records.

There were 3,049 cron records across 41 job names in the sampled 24-hour window, all marked success. The configuration has 43 cron routes, some not due within that window. Two old records remained `running` from 15 and 21 October despite later successful runs. These are stale tracking records, not proof of processes still executing. F2 demonstrates why cron status alone cannot serve as a delivery-health indicator.

The Vercel project-level 24-hour sample contained 12,370 info, 2,383 error and 730 warning log entries. These are log records, not requests or affected users; older code also logged some routine output to stderr. Filtering to the current deployment localized the observed error entries to push receipts and admin alerts: 334 and 4 entries respectively at the sample time. Repeated/duplicated push logging refers to four unresolved attempts, not 334 different failures. Older YOLO errors must not be attributed to the current release without fresh evidence.

Supabase security advisors flagged disabled leaked-password protection and pending Postgres security updates. Both deserve a planned hardening action. The only public base table without RLS was the PostGIS reference table `spatial_ref_sys`; that is not a discovered application-data exposure.

The flagged definer view `profile_directory` was investigated: its owner is neither superuser nor BYPASSRLS, a dedicated policy limits records, the projection omits email/phone/address, and contractor location is coarsened. Anonymous SELECT is not granted. It is not classified here as a confirmed leak. Likewise, the 89 RLS-enabled tables without policies are often intentionally service-only, not automatically broken user flows.

Performance advisors reported 29 unindexed foreign keys, 815 unused indexes and four backup tables without primary keys. Measure query plans and representative load before altering indexes. Low observed use does not justify dropping them blindly. No load, soak, backup-restore or disaster-recovery exercise was performed.

## Automated verification

| Check | Result |
|---|---|
| Web TypeScript | Passed |
| Mobile TypeScript | Passed |
| Web audit suite | 1,065 unique tests; 1,064 passed after correcting one test runner working-directory issue; 1 assertion remains failing |
| Additional web payment/webhook/security suites | 200 / 200 passed across 14 files |
| Combined selected web tests | 1,264 / 1,265 passed across 191 files; reruns not double-counted |
| Selected mobile suites | 1,020 / 1,023 passed across 55 files |
| Dependency audit | 78 dependency entries flagged; details in saved JSON |

The remaining web assertion expects category `general`, while current normalization returns `handyman`. The three mobile failures expect older signup/login error wording and three default API retries, while the implementation uses updated error mapping and zero client retries to avoid compounded retries. Inspection suggests test/contract drift rather than proof that real authentication is broken. Confirm intended behavior and update implementation or tests accordingly; the selected suite is not fully green.

Initial sandbox/temp-path and runner failures occurred before useful execution and were not counted as application failures. Local reruns used isolated dummy credentials. The mobile run completed its assertions but left open handles and was stopped after results were saved; investigate test cleanup separately.

These selected suites do not encompass every repository test, browser E2E suite or mobile screen. Mocked provider tests cannot certify current payment-provider, email, push, AI or app-store integrations.

## Recommended completion order

1. Fix admin alert persistence, truthful cron outcomes and money units. Add focused regression tests for the observed failures.
2. Reconcile the four payment exceptions and four push attempts with provider evidence. Establish actionable ownership and alerting for exceptions.
3. Decide public versus restricted-beta deployment access; verify the intended entry points without changing application security controls.
4. Patch security dependencies and plan Supabase password/engine hardening. Retire or harden the legacy assessment endpoint.
5. Bring staging online or provision an equivalent test environment with homeowner, contractor, admin, tenant and multi-member property fixtures. Align tested release/runtime versions.
6. Run web, Android and iOS end-to-end journeys from the matrix, including cross-user denial, retries, cancellation/refund, offline behavior and delivery evidence. Verify crash reporting and symbolication.
7. Clear or explain remaining test failures, test representative load and recovery, then record a release decision against the exact deployed web commit and signed mobile builds.

## Evidence and access limitation

The adjacent [evidence.json](evidence.json) preserves sanitized deployment, log and aggregate database evidence. [api-inventory.json](api-inventory.json), [mobile-api-calls.json](mobile-api-calls.json), test-result JSON and logs, and [dependency-audit.json](dependency-audit.json) preserve the local checks. All observations are point-in-time samples on 23 October 2026.

Authenticated browser journeys, live payment-provider account comparison, real email receipt, device push delivery, current Android/iOS execution, accessibility, responsive layout, app-store release status, load capacity and backup restoration remain unverified.

Automatic approval review initially rejected the temporary Vercel access link because the audit request did not explicitly authorize that access-control bypass. The user subsequently approved it, and the link was created and verified as described in the follow-up above. Application-role sign-in or a prepared staging fixture is still needed for role-specific flows.
