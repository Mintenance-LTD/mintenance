# Current acceptance review — 15 September 2026

**Completion is not yet established.** This ledger preserves the F1–F15 scope and separates current
executable proof from earlier evidence that still needs a completion review. It does not replace the
original audit or withdraw the hosted environment corrections. Baseline source:
`6d1e4767d42646a9df236e78275a59866dc44e01`, branch `codex/migrate-next-proxy`.

All database executions below used `supabase_db_mintenance-audit-20260906`; synthetic fixtures were
rolled back or explicitly cleaned, and injected triggers rolled back. No hosted data, live payment,
deployment or real-user contact occurred.

| Finding | Concrete acceptance requirement                                                                                                          | Current acceptance evidence                                                                                                                                                                                                                                                                                                  | Still needed before closing the finding                                                                                                                                                                                           |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1      | Effective client/default privileges deny escalation and private RPCs; safe owner updates remain usable; fresh and upgraded schemas agree | Current RPC/default-grant and profile-operation SQL probes passed; earlier hosted corrections remain applicable                                                                                                                                                                                                              | Finish broader effective-grant/function inventory and upgrade-evidence review; distinguish owner-controlled extension permissions from application fixes                                                                          |
| F2      | Clients cannot fabricate funded escrow, signatures or accepted bids; trusted transitions still work                                      | Current trusted-insert SQL rerun passed; expanded bid SQL proves pending edit persisted and accepted amount/status/identity survived denied client withdrawal/deletion and trusted amount mutation                                                                                                                           | Local authority controls and active bid callers reviewed at 7705c9b26; authenticated browser/device bid-to-contract journey remains separate                                                                                      |
| F3      | Keys bind actor, operation, resource and payload; changed payload is rejected; authorization precedes replay                             | Current bound-idempotency SQL passed pending/completed replay and foreign-actor/payload rejection                                                                                                                                                                                                                            | Complete caller-by-caller authorization/fencing evidence review; SQL binding alone does not prove route ordering                                                                                                                  |
| F4      | Persisted pending payment resumes after response loss/reload/new key; terminal/canceled attempts recover deliberately                    | Current funding SQL proved different request keys reuse the reservation and attachment, and canceled requests cannot revive                                                                                                                                                                                                  | Verify route/UI recovery matrix for provider statuses and interrupted responses against persisted state                                                                                                                           |
| F5      | Gross principal, cash, subsidy and remaining settlement remain distinct; debit/restoration are exactly once                              | Current funding SQL proved 50000 gross = 45000 cash + 5000 credit, one debit/restore and full rollback on ledger failure                                                                                                                                                                                                     | Consolidate payout/refund evidence for the same funded principal and web/mobile displayed quote contracts                                                                                                                         |
| F6      | Success webhook cannot overwrite release/refund/dispute; failed lookup remains retryable                                                 | c8f318686: atomic escrow/job writes, protected review states, lookup retries, funding lock order and schema state alignment; real rollback, ordered connection races and credit tests pass; 3646 web tests; empty migration diff; normal hooks passed                                                                        | Local transition invariants verified; actual provider webhook delivery/retry and deployed migration parity remain external verification                                                                                           |
| F7      | Rework, approval and release serialize the current completion decision and persist evidence atomically                                   | Awaiting-approval rework rollback/race tests pass. New approval SQL proves payer access, strict current-cycle photos, history/notification rollback, replay, automatic gates and release prerequisites; five real approval/rework/release races pass. Full web 3650/337 plus final focused 55/5, mobile 3/1, types/lint pass | Isolated migration replay has empty diff. Still required: restart recovery, other review-state writers (request/reject/inspection/photo verification) and final countdown/client behavior review; device verification unavailable |
| F8      | Mobile bearer identity is consistently verified through proxy and route, including expiry/revocation                                     | Earlier real Auth and session-revocation diagnostics exist; not rerun in this pass                                                                                                                                                                                                                                           | Review final proxy/route/mobile contracts and current executable Auth evidence; device limitations must remain explicit                                                                                                           |
| F9      | Partial refunds preserve accurate remaining principal and job state; conflicting refund/release cannot double spend                      | Durable refund/release/job-exit changes and real SQL diagnostics are recorded in progress history                                                                                                                                                                                                                            | Consolidate original partial-refund acceptance with final worker, admin and user callers; provider test mode remains separate                                                                                                     |
| F10     | Signature/version evidence and acceptance are atomic; failed evidence never leaves a signed contract                                     | Current signing SQL passed injected evidence failure rollback, two-party acceptance and signed-field immutability                                                                                                                                                                                                            | Review version/snapshot binding and access consumers, including retained evidence, against the final implementation                                                                                                               |
| F11     | Same-job recovery bypasses new capacity consumption; concurrent assignments respect cap; contract creation is durable                    | Implemented in d4e792995: atomic contract/history, real job-exit replacement, signed snapshot retention, negotiated-term retry, actor/capacity/rollback checks passed; final migration diff empty; 3633 full web tests, 81 final focused tests and normal hooks passed                                                       | Local invariants verified. Browser/device journey verification remains distinct from these API/SQL checks; overall F1-F15 completion is not established                                                                           |
| F12     | Same-origin geolocation works with consent; denial/unavailability retain manual fallback and input                                       | Actual Next header + Chromium grant/deny passed; six component tests cover protected geocoding, manual fallback, zero coordinates and save failure                                                                                                                                                                           | Record split-test limitation: authenticated UI-to-provider location setup was not executed; inspect remaining location consumers before broad journey sign-off                                                                    |
| F13     | Owner can upload/view; unrelated users cannot attach/re-sign/read another object's URL; origin validation is exact                       | Earlier private-photo SQL/Auth/storage diagnostics exist; not rerun in this pass                                                                                                                                                                                                                                             | Recheck final upload/signing consumers and legacy binding/backfill evidence                                                                                                                                                       |
| F14     | Interleaved logins never replace privileged client authorization/session                                                                 | Current source traces login/register to fresh clients; real SDK reverse-order login and OTP sessions preserved privileged headers; 27 combined tests passed                                                                                                                                                                  | Local traced paths verified. Real Auth/SMS delivery and the broader phone-verification journey remain separate from this client-isolation proof                                                                                   |
| F15     | Isolation tests use valid fixtures and actual returned/persisted mutation state, not null counts                                         | Earlier real integration and REST repairs are recorded; not rerun in this pass                                                                                                                                                                                                                                               | Review the final assertions and rerun the relevant real-database suites, recording skips individually                                                                                                                             |

## Fresh database executions

Reviewed source before running each diagnostic with `psql -X -q -v ON_ERROR_STOP=1`:

- `remediation-rpc-grants.sql` — passed (previous continuation, current schema).
- `remediation-profile-operations.sql` — passed (previous continuation, current schema).
- `remediation-trusted-inserts-tests.sql` — passed (previous continuation, current schema).
- `remediation-bound-idempotency.sql` — passed, exit 0.
- `remediation-payment-funding.sql` — passed, exit 0.
- `remediation-rework-tests.sql` — passed, exit 0.
- `remediation-contract-signing-tests.sql` — passed, exit 0.

Outputs are retained locally as `current-<diagnostic filename>.log`. The committed SQL
implementations are the reproducible checks; logs are not a substitute for reviewing their
assertions.

## Completion gates beyond individual probes

The final review must reconcile this ledger with `REMEDIATION-PROGRESS.md`, rather than treating its
historical “still open” or “passed” entries as current proof. Required local work still includes the
earnings-report final integration review (row-cap and metadata-failure repairs now have unit and
real REST evidence) and any incomplete caller/recovery checks discovered in that review. Final
checks must cover relevant web/mobile types, tests, build/lint and isolated migration replay, with
exact failures/skips recorded. Current green subsets do not waive these gates.

External verification remains explicitly bounded: no hosted mutation is authorized, no real money
may be moved, and no real users may be contacted. Missing hosted parity, provider test credentials,
physical-device checks or model evaluation evidence must be named, not replaced by mocks or inferred
from confidence scores. These limitations do not justify abandoning available local work.

## Hosted authorization and parity update — 22 September 2026

The user has superseded this document's earlier prohibition on hosted migrations. All 53 pending
application migrations were applied to production and a fresh dry-run found zero remaining. See
HOSTED-ROLLOUT-2026-09-22.md for sampled effective-permission checks and unresolved platform/advisor
items. This does not close the unverified journeys or the additional property operations scope.

## Screenshot continuation — 6 November 2026

Local screenshot corrections and their exact verification are recorded in
[SCREENSHOT-FIXES-2026-11-05.txt](SCREENSHOT-FIXES-2026-11-05.txt), including the
preserved earlier batch. This does not close F1–F15 or full release acceptance.
The beta gate remains enabled; no push, deployment, migration or live financial
mutation occurred. Physical Android/iOS MFA and fresh-build visual/keyboard/
scroll checks remain outstanding, and settings tests do not prove native
sign-in MFA enforcement. Escrow/finance display corrections do not establish
historical reconciliation or bank-arrival dates. Local Android export was
blocked by missing release environment configuration before bundling.

### Draft quote pricing follow-up — 6 November 2026

The screenshot audit now records locally tested draft price/line-item replacement,
server-calculated totals, version-conflict recovery, and send/edit race protection.
New checks passed 97 mobile tests and 50 web tests; these are separate from the
previous batch. Accepted-quote amendments, legacy web total-only editing, deployed
concurrency/delivery, and fresh-build device checks remain open. No historical
financial data was changed; the beta gate remains enabled and nothing was deployed.

### Legacy web quote editing follow-up — 6 November 2026

The screenshot audit records draft-only web pricing, version-checked editing and
both deletion routes, optional-field clearing, ownership filtering, and working
review/edit/send navigation. The unsafe legacy total/status update contract now
returns 400; web/API rollout must be coordinated. Verification passed 122 tests
and the full web type check. Accepted-quote amendments, historical reconciliation,
real deployed concurrency/delivery and fresh browser/device acceptance remain open.
The beta gate remains enabled; no deployment or live mutation was performed.

### Accepted quote proposals and recorded history — 6 November 2026

The screenshot audit records separate internal pricing proposals, immutable
prospective quote history, accepted-quote mutation protection, guarded bid
resubmission/linking and corrected accepted/rejected status synchronization.
The mobile revision stub no longer invents a saved revision. The new local
migration has not been applied to any hosted database; a later rollout must
apply it before exposing the API/UI.

Verification passed 196 web tests (12 files), 66 mobile quote-service tests,
both full TypeScript checks, and disposable Postgres migration/permission/
snapshot/idempotency checks. This is not full-schema replay or simultaneous
multi-session acceptance evidence. Customer approval and applying amendments
to contracts/bids/payments remain unimplemented; proposals do not change an
accepted price. Historical reconciliation, atomic bid/quote acceptance,
deployed relay MFA/native sign-in enforcement, fresh-build browser/device
visual checks and full release acceptance remain open. The beta gate remains
enabled; nothing was pushed, deployed or changed in live customer records.

### Customer review and pre-signature application — 6 November 2026

The latest screenshot audit records publication, authorized customer approval/
rejection, contractor withdrawal and atomic application to an unsigned contract
before any consent or financial footprint. The original quote remains immutable;
a new quote supplies the revised bid/contract price, the contract returns to
draft, and superseded quotes are excluded from current-value summaries. Signed,
funded or invoiced variations remain blocked and are not implemented here.

Final local checks passed 266 web tests / 16 files, full web TypeScript, clean
changed-file lint, the existing history SQL checks and 27 new disposable Postgres
approval/application scenarios plus permission checks. No mobile tests were
rerun. Local rendering and SQL fixtures do not establish physical-device or
multi-session/deployed journey acceptance.

The user explicitly authorized production schema-only rollout as an exception
to no deployment. This supersedes the preceding checkpoint's unapplied-schema
status. Only quote_amendment_history (20261106163935) and quote_amendment_approval
(20261106163946) were applied to production ukrjudtlvapiajkjbcrd. Read-only catalog,
grant/RLS and advisor checks verified the rollout. No live approval/application
operation or financial mutation was performed; no git push or app deployment
occurred. The beta gate remains enabled. Full release acceptance, device MFA/
native challenge enforcement, fresh-build visuals, signed/funded variations,
notification delivery and historical reconciliation remain open.

### Amendment notifications and native review — 6–7 November 2026

Implemented locally: transactional amendment-event queueing, recipient/version
checks before delivery, quiet-hours and notification preference handling, and
native review with full pricing/history, approval/rejection, withdrawal and
guarded application. Inbox/push and URL routes open the native review; exact
retries, load recovery and refreshed job/contract caches have regression tests.
Native proposal preparation/editing and amendment email delivery remain open.

Fresh verification: 183 mobile tests / 6 suites, 120 web tests / 11 files,
31 disposable SQL scenarios plus role/RLS checks, 22 relay tests, and full
mobile/web TypeScript checks passed. Web changed-file lint is clean; mobile
lint has no errors and three inspected pre-existing warnings. Aikido scanning
remains unavailable. Earlier test counts are historical, not additional fresh
coverage for this batch.

New migration `20261106202654_quote_amendment_notifications.sql` is **unapplied**.
This batch made no hosted changes and sent no real notification. A future
authorized rollout must coordinate the migration, guarded queue processor,
API/UI and native builds. The preceding two production amendment migrations
remain the only hosted schema rollout recorded here. No push, deployment,
live financial mutation or beta-gate change occurred in this batch.

Fresh-device notification delivery/taps, linking, native review/signing, larger
text/keyboard/scroll, deployed-relay MFA, native challenge enforcement and
multi-session/deployed database journeys remain unaccepted. Signed/funded
variations and historical reconciliation remain out of scope. Full release
acceptance remains incomplete; the beta gate remains enabled.

### Native amendment preparation and price editing — 7 November 2026

The native preparation gap in the preceding checkpoint is implemented locally.
Accepted quote details open owner-scoped source/history, replacement line-item
editing with explicit tax and shared rounding, immutable proposal save and a
separate confirmed publication step. Saved proposals can be resumed from history;
ambiguous saves retain their request id/body, conflicts require reload, historical
quotes are read-only, and navigation guards protect in-memory edits. Accepted
prices, terms and financial records remain unchanged by proposal preparation.

Fresh checks passed 142 mobile tests / 6 suites, 101 web tests / 6 files,
31 existing SQL scenarios plus role/RLS checks, 22 relay tests and full mobile/
web TypeScript. Web changed-file lint is clean; mobile lint has no errors and
one inspected pre-existing unused import warning. Aikido scanning is unavailable.

No schema change, hosted mutation, deployment, Git push or real notification
occurred. The previous notification migration is still unapplied; native builds
and API/processor rollout require separate authorization and device acceptance.
Unsaved edits are not persisted across forced termination. Native price editing,
publication, keyboard/scroll/large-text behavior and two-party review still need
fresh-build Android/iOS verification. Contract-term amendments, amendment email,
signed/funded variations, deployed-relay MFA/native challenge enforcement,
historical reconciliation and full release acceptance remain open. The beta
gate remains enabled.

### Quote amendment email notifications — 7 November 2026

The preceding amendment email implementation gap is closed locally. A prospective,
transactional outbox queues each publish/approve/reject/withdraw/apply event once.
The existing cron processes email independently of inbox/push, rechecks participants,
version, current and legacy preferences, quiet hours and verified account email,
and uses durable leases. Safe failures retry within a bounded budget; uncertain
provider acceptance or a lost acknowledgement requires review without auto-resend.
Web/native publication copy and generic review-link templates reflect this behavior.

Fresh checks passed 140 web tests / 13 files, 21 native tests / 1 suite,
36 local SQL scenarios plus role/RLS checks, 22 relay tests, full web/mobile TypeScript
and changed-file web/mobile lint. Aikido scanning remains unavailable. Details,
logs and recovery constraints are in SCREENSHOT-FIXES-2026-11-05.txt.

The prior notification migration and new
`20261107143626_quote_amendment_email_outbox.sql` are UNAPPLIED. No hosted
mutation, real notice, deployment, Git push or live financial change occurred.
Provider acceptance is not delivery; actual email delivery/rendering, authenticated
links, opt-outs and recovery need separately authorized end-to-end verification.
Failed/uncertain rows require operator/provider evidence before manual resolution;
no receipt reconciliation or recovery UI is implemented. Existing physical-device,
deployed-relay MFA, native MFA challenge enforcement, signed/funded variation and
historical reconciliation limitations remain. Full release acceptance remains
incomplete, and the beta gate remains enabled.

### Amendment email operator recovery — 7 November 2026

Operator review/recovery is implemented locally in the admin Recovery jobs card.
The paginated queue distinguishes open failures from reviewed events and retry
progress; event history shows the latest 20 immutable reviews. Active database
admin checks, CSRF, explicit evidence/confirmation, request idempotency and a
locked review version protect close-unknown, record-provider-acceptance and retry
actions. Uncertain requests retain their exact body; conflicts require refresh.
Only failed/needs_review rows can change. Retry needs evidence of non-acceptance
and a current amendment/recipient; the normal worker rechecks preferences and
eligibility. Review cannot send email, approve quotes or alter financial records.

Fresh validation: 136 web tests / 10 files, 51 local SQL scenarios plus role/RLS
checks, full web TypeScript and changed-file ESLint passed. No native code changed;
earlier mobile/relay results remain historical. Aikido scanning is unavailable.

The new `20261107150444_quote_amendment_email_review.sql`, email outbox and prior
notification migrations remain UNAPPLIED. Hosted workflow, real concurrency,
provider evidence/recovery and browser/device visual acceptance remain open.
Recorded provider acceptance is an operator assertion, not receipt reconciliation
or proof of inbox delivery. Existing MFA, signing/funding, historical financial
reconciliation and full-release limitations remain; beta enforcement is unchanged.

The user now authorizes GitHub pushing. The target is the existing feature branch
`feat/launch-terms-support-nov2`, including eight previously committed screenshot/
quote checkpoints since remote d58fef7ff. A branch-specific Vercel auto-deployment
exclusion was added before publication; main/develop deployment settings are
unchanged. No deployment or live financial change is authorized or performed.

Publication verified: recovery commit `1adc292fe` and the eight earlier checkpoints
were pushed to that GitHub branch. `git ls-remote` matched the full local commit
`1adc292feb19a2a7c5db58a2ddacc84a0f977f82`. The post-push Vercel branch query
returned no new deployments. This publication receipt is a documentation follow-up;
all deployment/migration/device acceptance limitations above remain unchanged.

### Main conflict resolution — 7 November 2026

Merged main `c49f936af27cac9eaf3c8e39b074e1f4240ff300` into the feature branch
after fetching both remote heads. Resolved both conflicts by retaining the shared
quote-pricing export and the two MFA relay tests (approved bearer forwarding and
strict route/method rejection). The resolved code tree is identical to feature
head `5f6b638a1`; this merge records main as an ancestor without losing existing
feature work. Beta enforcement and the branch-specific Vercel deployment exclusion
are unchanged. No merge into main, deployment or hosted mutation was performed.

Fresh checks passed the shared-package build, compiled quote-pricing export check,
54 mobile tests / 4 suites, 30 web tests / 4 files, 22 relay tests and full web/mobile
TypeScript. Logs are under output/merge-main-*. Previous audit/device/MFA,
historical financial reconciliation, unapplied migration and incomplete release
acceptance limitations remain in force.

### Merge/readiness inspection — 7 November 2026

GitHub PR [#1464](https://github.com/Mintenance-LTD/mintenance/pull/1464) was
already merged at 17:23:22 UTC before this inspection. Main is
`0fd5fba133a3134a89bcd21f80ad26cbfe0d7296`, containing feature head `1b9ca3d9a`
(the existing CodeQL regex fix). Their source trees match. No merge was performed
in this inspection; the local feature branch was fast-forwarded to its remote.

The final head's documented Code Quality & Testing, PR Quality Gate, Performance
& Security Monitoring and both web E2E shards passed. CodeQL passed and its sole
review thread is resolved. Native Android/iOS E2E and the Detox smoke step were
skipped; successful wrapper jobs do not establish device acceptance. Classic
branch-protection settings returned 403 to the GitHub integration, so the exact
enforced required-check list could not be independently verified. The readable
active ruleset covers deletion, force pushes and Copilot review, not status checks.

Deployment is blocked: production migration metadata, compared against all 15
local release prerequisites, is missing `quote_amendment_notifications`,
`quote_amendment_email_outbox` and `quote_amendment_email_review`. The automatic
main deployment `dpl_65ZoTAKA3atAMEzh2JLkTaYvfGBm` failed at the migration guard
with exactly those names. No guard was weakened and no migration/redeploy was run.
Fresh local checks passed 51 SQL scenarios plus role/RLS checks and 18 release-
guard/build-wrapper tests. No additional source fix is indicated by this evidence.
Beta enforcement and all prior provider/device/MFA/reconciliation acceptance
limitations remain. This documentation update is pushed only to the feature branch.

### Production amendment schema applied — 7 November 2026

With explicit schema-only production authorization, applied the three previously
missing migrations to MintEnance (`ukrjudtlvapiajkjbcrd`) in dependency order:

| Migration | Production ledger version |
| --- | --- |
| quote_amendment_notifications | 20261107173440 |
| quote_amendment_email_outbox | 20261107173448 |
| quote_amendment_email_review | 20261107173456 |

All applications succeeded. Read-only catalog verification confirmed RLS on both
email tables, no direct client-role access, service-only review RPC, restricted
delivery-status column updates, empty function search paths, enabled event and
immutable-review triggers, and valid constraints/indexes. No financial DML,
backfill, customer workflow, review RPC or provider delivery was invoked.

Fresh local tests passed 51 SQL scenarios plus role/RLS checks and 18 release-
guard/build-wrapper tests. The repository's actual migration verifier now accepts
all 15 release prerequisites against the fresh production ledger. This supersedes
the missing-schema blocker above. The failed Vercel deployment has not been
retried, and no build or deployment success is claimed.

Security advisors added only the two expected informational
[RLS-without-policy notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
for service-only email tables. Existing errors/warnings are unchanged; no overall
security clearance is claimed. Detailed verification is recorded in the screenshot
audit. Beta enforcement and the feature branch deployment exclusion are unchanged.
This audit is published only to `feat/launch-terms-support-nov2`.

Full release acceptance remains incomplete: deployed-relay Android/iOS MFA status,
enrolment, verification, disable and retry need device checks; settings tests do not
establish native sign-in challenge enforcement across custom MFA/Supabase sessions.
Fresh-build physical-device visuals, amendment email/push delivery and operator
recovery, and historical financial reconciliation remain unverified. No redeploy
or live financial-record change was performed.

### Production redeployment verified — 7 November 2026

With explicit user authorization, retried failed deployment
`dpl_65ZoTAKA3atAMEzh2JLkTaYvfGBm` using its original main commit
`0fd5fba133a3134a89bcd21f80ad26cbfe0d7296`, without cache or source/configuration
changes. Replacement [deployment](https://vercel.com/mintenance/mintenance-clean/21RguT8gDEyMzhVcv2mXsC13Bp4S)
`dpl_21RguT8gDEyMzhVcv2mXsC13Bp4S` reached READY in production and received
the `www.mintenance.co.uk` alias. This supersedes the pending redeploy checkpoint.

The hosted build passed the real production migration guard (15 prerequisites),
shared-package builds, web TypeScript, lint and Next.js production build. Build
logs report completion in six minutes and deployment completion. Sentry release
creation/source-map upload were skipped because no auth token was configured;
this warning was not bypassed or repaired by changing credentials.

Read-only production checks at approximately 17:49 UTC returned HTTP 200 for
`/api/version` with the exact commit above and environment `production`, and
HTTP 200 / `healthy` for `/api/health` (269 ms reported). Health probes only read
database metadata/counts, Redis PING and Stripe balance; no financial operation
was invoked. Unauthenticated direct `/api/users/profile` returned 302 to Vercel
Authentication; the connected fetch also could not establish an app-level profile
response. The mobile relay rejected a missing auth header with HTTP 401. Neither
probe establishes approved/unapproved signed-in beta-user behaviour. A scoped
15-minute error/fatal runtime-log query returned no groups at verification time;
this is a short observation window, not comprehensive runtime acceptance.

Fresh local relay tests passed 22/22, including beta access and MFA routing
(`output/production-redeploy-relay.log`). Beta gate, Supabase relay deployment,
environment settings and financial records were unchanged by this work. Only the
web deployment was retried. Audit updates are pushed to the feature branch with
its automatic deployment exclusion retained; main is unchanged. All prior device,
native MFA challenge, amendment provider delivery/operator recovery, physical
visual and historical financial reconciliation gaps remain. Full release
acceptance is incomplete.

### Production notification/recovery observation — 7 November 2026

Read-only checks between 17:52 and 17:55 UTC confirmed the production deployment
remains READY at `0fd5fba133`. There are zero quote amendments, amendment events,
amendment notification-queue rows, email-outbox rows and email-review rows. No
existing amendment delivery, failure or recovery outcome is available to reconcile.
An empty queue is not proof of provider delivery or successful recovery.

The automatically scheduled notification processor ran on the new deployment at
17:50:28 UTC and succeeded in 129 ms: queuedProcessed, queuedErrors, emailSent,
emailErrors and emailNeedsReview were all zero. Both its database run record and
deployment-scoped Vercel logs agree. The previous 24-hour run inventory contained
288 successes, but those older runs do not establish amendment-worker behaviour
on this deployment. The cron was observed, not manually invoked.

Catalog checks reconfirmed enabled enqueue/immutable-review triggers, RLS and no
client-role SELECT on recovery tables, no client-role review RPC EXECUTE, an empty
RPC search path, and service-role UPDATE limited to delivery-status columns.
An unauthenticated GET of `/api/admin/quote-amendment-emails?view=open` redirects
to Vercel Authentication (302). Connected fetch also remained authentication-
blocked; no signed-in admin UI or application-role authorization check is claimed.

Fresh local validation passed 99 tests in five notification/email/recovery API/UI
files and 51 disposable SQL scenarios plus role/RLS checks. Logs are
`output/production-amendment-recovery-web.log` and
`output/production-amendment-recovery-sql.log`. This covers mocked delivery,
uncertain outcomes, guarded retries, review evidence/idempotency/conflicts and
immutable audit rollback locally; it does not substitute for provider/device proof.

Remaining acceptance requires designated test accounts and an authorized,
controlled non-financial notification journey: receipt and deep-link verification,
preferences/quiet hours, provider acceptance versus inbox delivery, and active-admin
recovery evidence/history. Unknown provider outcomes must never be retried without
evidence of non-acceptance. No synthetic production amendment/event, send, retry,
review mutation, cron invocation, migration or redeploy was performed here. No
financial records changed. Beta enforcement stays enabled; all prior native MFA,
physical-device and reconciliation limitations remain. Audit-only publication is
to the feature branch; full release acceptance remains incomplete.

### Controlled production notification/recovery test — 7 November 2026

The owner designated `gloirenkouka380@gmail.com` and delegated test-job selection.
Verified its active, confirmed homeowner account and used "house check"
(`1b4c1563-af7f-4f07-8710-09d2f0b46a37`). Its existing contract is signed; only a
clearly labelled, same-total test proposal was published and withdrawn. No approval,
application, signature, price update or financial operation was performed.

Test amendment `4c990ddd-ef47-4b29-b3d3-318ae0067fbc` finished **withdrawn**, version 2,
with no applied quote or applied timestamp. Publish and withdrawal both addressed
only the designated homeowner. The existing scheduler submitted two email notices
and created two in-app notifications; both email rows reached `sent` with exactly
one provider attempt each (19:30:29 and 19:50:29 UTC). Brevo acceptance for the
review notice is corroborated by production logs. The owner confirmed **email
received; review link works**. The first push receipt reached `provider_accepted`;
the withdrawal push receipt was still pending its scheduled check at observation.

Controlled recovery was exercised without inventing a provider failure: the first
email was held atomically before any send, with attempts=0 and
`controlled_test_pre_send_hold`. The service-role review RPC, using the existing
dedicated QA administrator identity, recorded evidence `not_accepted` and returned
it to pending. Exact-request replay before and after delivery retained one immutable
review and did not resend or reset the sent row. These were database-driven test
calls, not authenticated browser/admin-session verification. No roles, sessions,
beta approvals or provider settings were changed.

The supplied desktop screenshot `Screenshot 2026-11-07 195131.png` confirms the
production amendment URL renders the withdrawn test, equal accepted/proposed
totals of GBP 1.30, and no visible approve/apply controls. This closes the tested
email deep link and desktop withdrawn-state observation only. Before/after full-row
fingerprints match for the job, accepted quote, bids, contract and signatories;
all eight inspected payment/escrow/invoice/funding/payout tables still have zero
rows for this job. Test history remains append-only and the proposal is closed.

An external merge/deployment advanced production to `226d9ff34` /
`dpl_8Ugbs5BR2V2UBQM1xqPepcEWdwGc` during preparation. Its source difference from
`0fd5fba133` is audit documents only; the test worker logs identify the new
deployment. This task did not merge or redeploy. No source changes or fresh local
test run were needed; prior 99 web / 51 SQL results remain historical evidence.

Beta gate remains enabled. Remaining acceptance includes actual provider rejection
or ambiguous-send recovery, signed-in operator UI/admin revocation checks,
withdrawal inbox/device receipt, native notification/deep-link visuals and all
prior device MFA/native challenge and financial reconciliation gaps. Full release
acceptance remains incomplete. This controlled result supersedes the earlier
empty-production-queue limitation, not those remaining limitations.

### Signed-in operator UI verification — 7 November 2026

The owner designated `admin@mintenance.co.uk` and completed normal browser sign-in.
Verified its active confirmed admin profile, then exercised the production admin
dashboard at commit `226d9ff34` / deployment `dpl_8Ugbs5BR2V2UBQM1xqPepcEWdwGc`.
No password, MFA code or session token was supplied in chat or extracted, and no
account role, session, beta approval or security setting was changed by the agent.

The operator UI correctly showed an empty Needs review queue, the existing sent
publish event under Reviewed events and retries, and its prior recovery history.
No recovery-action controls were present on the sent event. The withdrawal email
was also observed in the designated homeowner Gmail inbox at 19:50, closing the
previous withdrawal-email receipt gap (not device/push presentation).

To verify a real signed-in save without another send, only test amendment
`4c990ddd-ef47-4b29-b3d3-318ae0067fbc`, event 2, was deliberately staged for review.
A narrowly guarded metadata update changed its sent state to needs_review with
`controlled_test_review_of_accepted_send`; original sent_at and attempts=1 were
preserved. This was a labelled UI fixture, not a genuine provider failure.

Through the normal operator form, selected Record provider acceptance / Provider
acceptance confirmed, entered the controlled-test evidence note, and confirmed the
action. The button was disabled before confirmation; controls disabled while
saving. At 20:01:48 UTC the UI confirmed acceptance, removed the event from Needs
review, and displayed it as reviewed accepted with its saved note in history.
Refreshing and reopening retained that state with no recovery-action controls.

Read-only database checks confirmed request `d15e0822-5a4f-43b6-a0f3-b802231c8e90`,
actor `623398c7-2335-4707-90b5-8bcee7eb4d1c` (the designated signed-in admin),
action confirm_accepted, evidence accepted, review_version=1 and one review for
event 2. Both emails still have one send attempt and their original send timestamps;
the two in-app notifications are unchanged. The proposal remains withdrawn, and
job/quote/bid/contract/signatory fingerprints still match the preceding audit.
No additional email/push send, financial action, migration or deployment occurred.

Desktop visual evidence is saved locally at
`output/operator-quote-review-20261107.jpg` (SHA256
`d08298b81df5a9386faa030d8748a321e75a2651fff7e624b3920abe47c3e8e7`). No source
change or repeated local test run was needed; this is fresh hosted UI evidence.
The operator list/history and confirm-accepted save gaps are now closed for this
controlled case. Hosted revoked-admin denial, retry/close-unknown save branches,
conflict/ambiguous-save handling and actual provider-failure recovery remain open,
along with withdrawal push/device presentation and prior native MFA/visual and
financial reconciliation limitations. Beta gate remains enabled; full release
acceptance remains incomplete. Audit publication is to the feature branch only.

### Remaining recovery branches and review-page redesign — 7 November 2026

Verified retry and close-unknown through the existing signed-in designated admin
UI, with read-only database checks of the resulting reviews and delivery states.
Used a fresh, same-total, explicitly labelled test proposal on the previously
authorized house check job. All recipients were the designated homeowner account;
no contractor messages, approvals, pricing applications or financial writes.

- Test amendment `65e6e1af-842b-4bd0-82e8-b6d324ed3726`: publish email held
  atomically before dispatch (failed, attempts 0, sent_at NULL). The admin selected
  retry with evidence not_accepted and an explanatory note; confirmation was required
  and controls disabled while saving. Review `b677e86f-63c7-4111-89b8-ce04f35ce590`
  was recorded at 20:12:57 UTC; the normal worker sent once at 20:15:29.068 UTC.
  The 20:15 message was observed in the designated Gmail inbox.
- Withdrew that proposal and atomically held the withdrawal email as a labelled
  synthetic unknown-outcome fixture. The admin saved close_unknown / unknown at
  20:17:33 UTC (request `5a0d618c-2cc5-4e4d-80e4-e011192c4063`). It remains
  reviewed_unknown, attempts 0, sent_at NULL, with no resend or delivery claim.
  This tests the UI branch, not a genuine provider incident.
- Both reviews are attributed to `623398c7-2335-4707-90b5-8bcee7eb4d1c`, persist
  after refresh and have no further recovery controls. Open review count is zero.
  The proposal is withdrawn/version 2, with applied_at/applied_quote_id NULL.
  Job, accepted quote, bid, contract and signatory fingerprints match the prior
  audit. The two normal notification-queue events target only the designated
  homeowner; queue completion is not physical-device receipt evidence.

The screenshot's web review page now has a clear status badge, withdrawn/rejected
explanation, prominent totals, labelled pricing panels, aligned line-item amounts,
separate terms, readable decision history and visible keyboard focus. Panels stack
on small screens. No financial calculations, approval permissions or mutation
guards changed; missing historical amounts remain explicitly unrecorded.
Also fixed stale operator success messages persisting after queue refresh/change.

Fresh validation: 98 tests passed in five targeted web suites; full web TypeScript
check passed; targeted source/test ESLint passed with zero warnings/errors.
Local browser preview uses the real component/CSS with fixture responses and
blocked mutations, not a deployed/authenticated integration. Desktop, 390px layout,
and 320px with 32px root text/long strings were checked; the larger-text heading
overflow found during testing was fixed (305px client/scroll width, zero overflowing
elements). Refresh, keyboard disclosure and history expansion were checked.
Evidence: output/quote-recovery-branches-{web,types,lint}.log and local screenshots
output/amendment-review-{desktop,mobile,large-text}-20261107.png,
output/operator-recovery-branches-20261107.jpg. Aikido scan tooling was unavailable.

The hosted retry/close-unknown controlled UI gaps are closed. Genuine ambiguous
provider incidents, hosted revoked-admin denial and conflict/lost-response behavior,
fresh-build physical-device visuals, native MFA/relay and native sign-in challenge
enforcement, and historical financial reconciliation remain unverified as before.
No schema, role, beta gate, deployment or live financial change. UI changes require
a subsequent deployment to appear on production. Feature branch only; full release
acceptance remains incomplete.

### Merge-readiness inspection — 7 November 2026

GitHub already reports [PR #1467](https://github.com/Mintenance-LTD/mintenance/pull/1467)
merged by MAmadouthetitan24 at 21:02:07 UTC, before this inspection performed any
write. Main is `050123d60747c97376b52dad02ae24af320e8045`; feature head
`c106a2875ca3f76b2f3e640a1b5733d9d7f8c0a8` is an ancestor and their trees are
identical. There is no open PR for this feature branch and no remaining source
change to merge. This agent did not merge it.

For that exact feature SHA, GitHub returned 31 completed check runs: 20 successful,
11 conditionally skipped, none failed or pending. The latest Code Quality &
Testing, PR Quality Gate, Performance & Security Monitoring and Mobile E2E Smoke
passed in run 42413038997. Both E2E shards passed in run 42411553042, including
their web build steps. Security, CodeQL, bundle and Lighthouse checks also passed.
Review threads and submitted reviews are empty; no change-request review exists.
Lighthouse's reported performance score of 66 is a remaining performance concern,
not a failed check or amendment-specific finding.

Classic main branch-protection read returned 403 Resource not accessible by
integration. Thus actual required-check enforcement cannot be fully attested.
Readable active ruleset 8484854 has deletion/non-fast-forward protections and
Copilot review configuration, but no required-status-check rule; ruleset 19408410
is disabled. No repository protections were changed or bypassed.

No code blocker found and no source edits or repeat local tests were necessary.
The prior 98 targeted tests/type-check/lint evidence remains recorded separately;
fresh evidence this turn is the exact-SHA hosted checks. Vercel's Git integration
had already started production build dpl_8pou5eLaSsHDASXVsksMi67pXXt5 for the
external merge (BUILDING when inspected); this is not deployment success evidence
and the agent did not trigger, retry or alter it. This turn publishes only an
audit commit to the feature branch, whose automatic Vercel deployment remains
disabled. Beta gate and all live data/settings are untouched. Prior device/MFA,
provider-failure and financial-reconciliation gaps still apply; full release
acceptance remains incomplete.

### Production deployment and review UI verification — 7 November 2026

Automatic production deployment `dpl_8pou5eLaSsHDASXVsksMi67pXXt5` succeeded.
Vercel reports READY at 21:07:25.362 UTC for main merge
`050123d60747c97376b52dad02ae24af320e8045`, with `www.mintenance.co.uk` assigned
to that deployment. Build logs confirm Build Completed, Deployment completed and
cache upload completion. No retry, promotion, deployment or migration was invoked
by the agent.

After the owner completed normal sign-in for the designated homeowner account,
verified the actual production house check amendment route (not the local preview):
two withdrawn test amendments, new status badges and not-applied notices, styled
before/proposed pricing panels, unchanged GBP 1.30 totals, zero tax and missing
historical item-breakdown/terms labels. No approval/reject/apply/withdraw controls
were present. Keyboard Enter opened the application guidance and decision history;
the latest history displayed publish 20:12:30 and withdraw 20:16:42. Refresh
reloaded both records. Back to job navigated to the expected job URL and browser
Back restored the two-card review; no job action was submitted.

Desktop pricing panels aligned side by side (1528px client/scroll width). At a
390px viewport they stacked (375px client/scroll width); at 320px the client and
scroll widths were both 305px, with zero overflowing main-content elements.
Viewport overrides were reset. Saved local evidence:
`output/production-amendment-review-20261107.jpg`,
`output/production-amendment-pricing-desktop-20261107.jpg`, and
`output/production-amendment-review-mobile-20261107.jpg`.

This closes the deployed homeowner desktop/responsive visual check for the
withdrawn fixtures. No source edits or repeated automated tests were needed.
No new messages/reviews/proposals, financial operations, account changes or beta
configuration changes were made. Operator success-message reset was not exercised
through a new production review; its local regression evidence remains separate.
Physical-device/native MFA and sign-in challenge checks, actual provider incidents,
hosted conflict/revoked-admin cases and financial reconciliation remain open.
Beta gate remains enabled; full release acceptance remains incomplete.

### Operator recovery continuation — 7 November 2026, 21:18 UTC

Fresh local validation: 40 tests passed across quote-email-review-ui and
quote-email-review-api. This includes clearing success on refresh/queue change,
conflict blocking, exact-request retry after an uncertain response, CSRF failure,
confirmation, and list/history error handling. The initial sandbox run executed
no tests because Vitest's temporary-file rename failed with EPERM; rerunning the
same suites outside that restriction passed. Log:
`output/operator-recovery-verification-20261107.log`.

Production operator verification remains pending normal admin sign-in. Refreshing
the existing dashboard redirected to Admin Sign In; the owner-supplied Settings
tab likewise redirected when navigating to Dashboard. Cached admin content is not
evidence of a current authenticated session or the deployed success-reset fix.
The designated admin email was filled for owner sign-in; no credentials, tokens,
roles or security settings were read or changed.

Read-only checks confirmed the designated admin/homeowner profiles are active and
the existing controlled withdrawal event remains reviewed_unknown, review_version
1, attempts 0, sent_at NULL, with its original immutable review. Other test emails
retain their original sent timestamps and single attempts. The proposal remains
withdrawn/version 2 and unapplied. Five job/quote/bid/contract/signatory fingerprints
match the preceding audit; all eight inspected job-related financial tables still
have zero rows. No fixture was reopened and no review, retry, message, proposal or
financial operation was submitted in this continuation.

The hosted success-message reset and conflict/lost-response/revoked-admin checks
remain open; local passing tests do not close those production gaps. Earlier
controlled retry/close-unknown results remain valid within their original scope.
Beta gate remains enabled. Native/device MFA, native sign-in challenge enforcement,
physical-device visuals, genuine provider-incident recovery and historical financial
reconciliation remain unverified; full release acceptance remains incomplete.
