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

### Signed-in operator reset verification and conflict defect — 7 November 2026

Owner completed normal admin sign-in, resolving the preceding session blocker.
Verified the deployed operator UI using only the existing designated admin and
homeowner test fixture. Reopened withdrawal email event 2 for amendment
`65e6e1af-842b-4bd0-82e8-b6d324ed3726` twice with exact row/status/version/recipient
guards, changing only its reviewed_unknown status to needs_review. It was never
queued for dispatch. Each normal operator close_unknown save preserved attempts=0
and sent_at=NULL and added an immutable review by the designated admin:

- Review version 2: `95437fbc-48f3-4431-b1a8-ba19b3ee8e05`, 21:25:12.409071 UTC.
  The success message appeared, then disappeared on Refresh email reviews.
- Review version 3: `195d8652-589a-48d1-a59e-f16459e0391c`, 21:29:40.415290 UTC.
  The success message appeared, then disappeared on changing to Reviewed events
  and retries. Reopening history showed all three reviews and no recovery controls.

Both deployed success-reset branches now pass for this controlled fixture. A
second tab holding the older review version exposed a separate production defect:
the stale save returned HTTP 500/uncertain outcome instead of HTTP 409. Inputs
froze, no success was claimed, and Retry same review also added no review or send.
Vercel logged the 500 for the designated admin on the existing production build;
Postgres logs showed repeated `Email changed; refresh review` / SQLSTATE 40001.
Production identifies PostgREST 14.18, which retries serialization failures.

The test request continued retrying after the caller timed out. A narrowly guarded
pg_cancel_backend on PID 734810 did not stop that loop; pg_terminate_backend on the
same PID, exact backend start, application/user and review-query signature ended
the test connection. Subsequent inspection found that backend absent and no active
or idle-in-transaction review RPCs. No service restart, account/security change or
financial write was used for cleanup.

Prepared, but DID NOT APPLY, migration
`20261107213241_quote_amendment_email_conflict_code.sql`: replace only the review
function's three deterministic conflict codes with PT409. API handling now maps
PT409 to HTTP 409 while retaining legacy mappings. Existing privileges, checks,
idempotent replay, row locks and all pricing/financial behavior are unchanged.
The deployed conflict defect remains open until this migration and API change are
released and the hosted stale-tab case is repeated. Release the compatible API
mapping before applying the function migration; the old API does not map PT409.

Fresh local validation: 41 targeted web tests passed; 51 disposable PGlite SQL
scenarios plus role/RLS checks passed with explicit PT409 assertions for competing
reviews, request-ID reuse, closed states and stale eligibility. Full web TypeScript
and targeted ESLint passed. Aikido scan tooling is unavailable. PGlite does not
run PostgREST and these results do not establish the hosted fix.

Final fixture: reviewed_unknown/review_version 3, exactly three reviews including
the original, zero attempts, sent_at NULL, zero open test emails. Both proposals
remain withdrawn/version 2 and unapplied. All other controlled email attempts and
sent timestamps are unchanged. Five job/quote/bid/contract/signatory fingerprints
and eight financial-table zero counts still match the prior audit. No new message,
proposal, approval, application or financial record change. Beta gate stays enabled.
Evidence: `output/operator-reset-success-20261107.jpg`,
`output/operator-reset-history-20261107.jpg`, `output/operator-uncertain-save-20261107.jpg`
and `output/operator-conflict-{web,sql,types,lint}-20261107.log` (local ignored files).

Unverified acceptance still includes a successful hosted conflict response,
committed-save/lost-response replay, revoked-admin denial, genuine provider-incident
recovery, physical-device visuals, deployed native MFA/relay and native sign-in
challenge enforcement, and historical financial reconciliation. Full release
acceptance remains incomplete. Feature-branch publication only; no merge or deploy.

### API-first conflict release verified — 8 November 2026

The owner authorized production deployment, then the function migration. The first
build of 606e0dea8844265533cf6899b3a45a99de95f350
(`dpl_EaPh7BCCrf3tpCmBHLtLQRhXXjuV`) correctly stopped at the missing-migration
prerequisite. No guard was bypassed and no migration was applied ahead of the API.
Created and pushed `release/quote-amendment-conflict-api` from prior production
050123d60747c97376b52dad02ae24af320e8045, carrying only the compatible API mapping
and its regression test. Release commit 53ce6f65f225e24d703b83d541837991dde86b27
has the same complete apps/web tree as 606e0dea. Production deployment
`dpl_3ttbd7jjcqoDMPn5tikXXCUZw9SF` passed migration prerequisites, TypeScript,
lint and build, reached READY at 2026-11-08T00:05:04.056Z, and was verified as the
deployment serving www.mintenance.co.uk before applying SQL. Main was not merged.

Applied `quote_amendment_email_conflict_code` to production project
`ukrjudtlvapiajkjbcrd`; hosted ledger version `20261108000533` corresponds to local
`20261107213241_quote_amendment_email_conflict_code.sql`. Verified the function
body matches the reviewed three 40001-to-PT409 substitutions exactly. Existing
postgres/service_role-only execution grants, security-definer/search-path settings
and both outbox/review RLS settings are unchanged. Migration itself left the test
event at reviewed_unknown/version 3, attempts 0, sent_at NULL.

After normal owner admin sign-in, exercised two production tabs using only the
designated admin and existing homeowner fixture. Exactly guarded status-only
staging reopened amendment `65e6e1af-842b-4bd0-82e8-b6d324ed3726`, event 2, at
review_version 3; it never entered pending/sending. The first close_unknown save
created review `b1d5f03c-6d8c-4dd3-8c5c-0f802cec1201` at
2026-11-08T00:06:56.948781Z, advancing to review_version 4. The stale second tab
displayed the refresh-required conflict, disabled Retry same review and retained
Refresh. Refresh cleared the conflict/selection and showed no emails in the queue;
Reviewed events displayed all four immutable reviews with no recovery controls.

Vercel recorded HTTP 409 at 00:07:23.697Z for request
`499hg-1794096443041-2c76aad1b02a` on the new deployment. Postgres recorded exactly
one PT409 / Email changed; refresh review occurrence in the 00:07–00:09 UTC window.
No stale duplicate review, dispatch attempt or lingering executing/idle-in-transaction
review RPC remained. Final event: reviewed_unknown/version 4, attempts 0, sent_at
NULL; open test emails 0. Both controlled amendments remain withdrawn/version 2
and unapplied. Other controlled email attempts and original send timestamps are
unchanged. Five job/quote/bid/contract/signatory hashes and all eight job-related
financial-table zero counts match the preflight and preceding audit. No financial
records, prices, account permissions or beta configuration were changed.

Fresh evidence is the hosted production build, migration comparison, authenticated
UI and database/log checks. The preceding 41 web tests, 51 disposable SQL scenarios,
web TypeScript and targeted ESLint apply to the same code bytes; they were not
rerun in this release-only continuation. Exact-606 GitHub check-runs/statuses were
empty, not passing CI evidence. Supabase advisors remain unchanged: 136 findings
across seven categories, including two pre-existing ERROR findings; no clean
security scan is claimed. Aikido tooling remains unavailable.

Local screenshots: `output/operator-conflict-released-20261108.jpg` and
`output/operator-conflict-release-history-20261108.jpg`. The hosted stale-review
conflict gap is closed for this controlled fixture. Committed-save/lost-response
replay, revoked-admin denial and genuine provider-incident recovery remain open.
Android/iOS deployed MFA status/enrolment/verification/disable/retry need devices;
settings tests do not establish native sign-in challenge enforcement across the
custom MFA service and Supabase sessions. Jest does not replace fresh-build device
visual checks; escrow presentation does not establish historical reconciliation.
Beta remains enabled. Full release acceptance remains incomplete. This audit is
published on the existing feature branch; no merge into main is performed.

### Lost-response replay and revoked-admin checks — 8 November 2026

Continued from clean feature commit 904b63e082ad183ff2c99492bb2c3bcf36e89236.
Added client regressions for a committed response lost at transport or body-read
time: inputs freeze, no premature success, Retry same review sends identical JSON,
and one saved result is recovered without a second write. Added 401/403-after-loss
cases: exact retry becomes blocked, Refresh clears the selected form, and denied
queue loading cannot appear as an empty successful queue. These use a stateful
server stand-in; they do not simulate network loss on the deployed browser.
Expanded disposable SQL tests for demoted/deleted admins rejecting both new reviews
and replay, exact replay after access restoration, and replay of an older review
without overwriting a later review. No application behavior change was necessary.

At 2026-11-08T00:21:19.788615Z, production database verification reused committed
request b1d5f03c-6d8c-4dd3-8c5c-0f802cec1201 for the designated admin/homeowner
fixture. Replay returned the original full review JSON unchanged. Separate nested
transactions temporarily demoted and soft-deleted the designated admin profile;
both calls returned SQLSTATE 42501 before replay. Each test unconditionally raised
a caught rollback sentinel, restoring the entire profile including updated_at.
Exact replay succeeded after each rollback. No revocation was committed or visible
to other sessions; no account/session security configuration was changed.

Before running this check, inspected profile triggers: the relevant update only
sets updated_at, with no external call. Exact actor/email/job/amendment guards and
3-second lock/15-second statement limits bounded the check. Full profile, outbox
and review JSON equality assertions passed. Separate postcheck confirmed both
designated profile hashes unchanged. The amendment has five total historical
reviews across its two email events: one original publish retry and four withdrawal
reviews. Withdrawal event 2 remains reviewed_unknown/review_version 4/attempts 0/
sent_at NULL. No new review or send occurred. All four controlled email rows retain
their original state/attempts/timestamps. Five financial/source fingerprints and
eight financial-table zero counts match preflight and the preceding audit.

Fresh operator browser reload remained authenticated; the recovery queue loaded
No emails in this queue after the database checks. This proves normal operator
access remained available, not a revoked-session HTTP denial. Hosted database
replay and transactional revoked-actor checks pass. Full browser-to-API replay
after a genuinely lost committed response, and HTTP/UI behavior with a committed
revocation, remain open: supported browser tooling does not provide targeted
response interception, and this verification deliberately kept revocation local
to a rolled-back transaction. Do not combine local UI and direct SQL evidence
into a claim of end-to-end hosted verification.

Fresh validation: 45 web tests in quote-email-review-ui/API and 54 disposable SQL
scenarios plus role/RLS assertions passed. The initial sandbox web run failed
before tests with temporary-file rename EPERM; the unrestricted rerun passed.
Full web TypeScript and targeted test-file ESLint passed.
Logs: output/operator-replay-{web,sql,types,lint}-20261108.log.
Supabase security advisors are unchanged at 136 findings/seven categories; prior
security findings remain open. Aikido scan tooling is unavailable; no clean scan
is claimed. Only tests and audit documentation changed; no migration, deployment
or main merge. Beta remains enabled, with no live financial changes.

Genuine provider-incident recovery, Android/iOS deployed MFA status/enrolment/
verification/disable/retry, native sign-in challenge enforcement across custom MFA
and Supabase sessions, fresh-build physical-device visuals, and historical
financial reconciliation remain unverified. Full release acceptance is incomplete.

### Property-management follow-up recovery — 8 November 2026

Continued from clean feature commit 93216ae871cc328866fa49a641976ff7cb442b38.
Inspected the existing portfolio queue, property follow-up API/RPC, role checks,
assignment/update history and web/mobile editors. Responsibility assignment,
waiting-for state, due dates and internal updates already exist; this batch fixes
their editing/recovery rather than claiming a new end-to-end case-management system.

Both follow-up editors now use a shared London-calendar helper. New/edited dates
save at the end of the selected UK day with GMT/BST adjustment; impossible dates
are rejected. Existing exact timestamps are preserved when their displayed date
is unchanged, so editing a note does not silently shift a previously stored
deadline. Web history explicitly uses UK time. No historical timestamps were
rewritten. Mobile controls now have 48-point minimum touch targets, visible
selection styling, multiline note space and explicit disabled accessibility state.

Record-keyed editors clear drafts when switching property/source and ignore late
load/save callbacks from the previous record. Loads have explicit pending/error
recovery, cancellation and bounded HTTP waits; malformed response collections are
rejected instead of rendering an unusable form. Ref-based save locks prevent
duplicate submission. Save success requires the returned next revision. Conflicts,
access failures and unconfirmed saves preserve the note and block another save
until a successful reload. Reload obtains current responsibility/date/revision
while retaining the note for review against recorded updates. This is deliberate
reload recovery, not automatic idempotent replay or persistence across app exit.

Fresh local checks: 39 web tests across follow-up recovery, property work queue,
portfolio queue API and property-team admin checks; 27 mobile tests across follow-up,
portfolio queue and property-management parity, all passed. Shared package build,
full web/mobile TypeScript checks and changed-file lint passed.
The first sandbox mobile run failed before
tests on transform-cache rename EPERM; rerun outside that restriction passed.
An intermediate web fixture exposed a malformed-load rendering exception, fixed
before the final clean run. Mobile logs retain existing react-test-renderer
deprecation warnings. Evidence: output/property-followup-{web,mobile}-20261108.log
and output/property-followup-{web,mobile}-{types,lint}-20261108.log.

No API authorization, SQL/RLS, beta configuration or financial code changed; no
hosted reads/writes, notification sends, migration, deployment or main merge.
Feature-branch code/audit publication only. Aikido tools remain unavailable.
Fresh browser/device visuals, large text, keyboard/scroll and real multi-manager
conflict/response-loss acceptance remain open. The existing follow-up RPC still
uses 40001 for revision conflicts; this batch does not establish terminal HTTP 409
behavior through deployed PostgREST. Either 409 or an uncertain failure blocks
another client save pending reload; a coordinated backend fix remains to review.

Next property priorities: surface responsible person and permission-aware actions
in the portfolio queue; implement correctly scoped Mine/Unassigned/Team filtering;
continue tenant case-history/navigation and approval-control acceptance. Existing
schema capabilities must be verified before claiming those features are absent
or adding new ones. All prior deployed-relay/native MFA, native sign-in enforcement,
fresh-build physical-device, provider-recovery and financial-reconciliation gaps
remain. Beta enabled; full release acceptance remains incomplete.

### Property follow-up backend conflicts and team queues — 8 November 2026

Continued from clean feature commit ecb1dc51ed6e5ef4613b3e74524c26a6079256b1.
Inspected the existing follow-up transaction, property roles, queue inclusion,
pagination, web/native clients and prior acceptance evidence. Existing work and
the beta gate are preserved. This batch has no hosted database or financial work.

New local migration `20261108005044_property_followup_conflicts_team_queue.sql`
is **unapplied**. It replaces stale-revision SQLSTATE 40001 with terminal PT409,
retains row locking and atomic update/history/notification writes, and rejects
null/negative revisions, invalid waiting states, deleted actors and ineligible
assignees. A follow-up cannot be overwritten after its source moves properties.
The API handles both PT409 and legacy 40001 as HTTP 409, plus permission and input
failures without leaking database messages. GET blocks former-property history
before reading updates and excludes deleted accounts from assignee choices.
PT409 semantics: [PostgREST errors](https://docs.postgrest.org/en/stable/references/errors.html).

The new service-only `portfolio_team_action_queue` RPC filters Team, Mine and
Unassigned before counts and pagination. Team means all accessible active actions;
Mine means an eligible assignment to the authenticated caller; Unassigned includes
departed/deleted assignees marked Needs reassignment, without exposing their names
or IDs. Existing job/report/maintenance/certificate inclusion rules remain. Tenant
reports remain owner-only, accepted viewers remain read-only, and a platform admin
does not gain access to unrelated properties. The old RPC signature delegates to
Team for compatibility. Existing RLS and service-role-only grants are retained.

Web/native queues show responsibility and server-derived editing permission.
Changing scope resets pagination and closes the editor. Counts, empty states and
responses must match the requested scope; an old/unfiltered response is an error,
not a false successful Mine view. Reads have cancellation and bounded waits; late
web responses are ignored. Native cache/state is scoped to account, scope and page,
and signed-out queues are hidden. Dates display in London; native scope controls
have 48-point targets and accessible selection state. Reassignment remains manual;
this does not add absence cover, spending approval or tenant case management.

Fresh local verification: 52 web tests across five files and 29 mobile tests across
three suites passed. Disposable PGlite execution of the original and new SQL passed
10 scenarios plus anon/authenticated execution-denial and RLS checks: row-preserving
migration, scope counts/pagination, membership/owner/viewer boundaries, departed
assignees, terminal stale conflicts without side effects, successful reload/save,
invalid inputs, failed-first-save rollback and moved-source rejection. No app
environment or network is used by `scripts/test-property-team-queue.mjs`.
Changed source/test ESLint passed (web tests explicitly included with --no-ignore).
Full web and mobile TypeScript checks passed.
Evidence: `output/property-team-{sql,web,mobile}-20261108.log` and
`output/property-team-{web,mobile}-{types,lint}-20261108.log`. Native logs retain the
existing react-test-renderer deprecation warnings. Aikido tooling is unavailable;
no clean security scan is claimed.

Release dependency: deploy compatible PT409 API handling first, apply the reviewed
migration, then enable the new queue RPC/client contract. This combined feature
must not be released against the old schema without staging that order. No deploy,
hosted migration, notification send, main merge or live financial mutation occurred.
Feature auto-deploy remains disabled in vercel.json; publication is branch-only.
Local SQL does not prove deployed PostgREST behavior, real simultaneous manager
saves, concurrent membership revocation, notification receipt or response-loss
recovery. Fresh browser/native-device, larger-text and keyboard/scroll acceptance
remain open. Android/iOS relay MFA status/enrolment/verification/disable/retry,
native sign-in MFA enforcement across custom MFA and Supabase sessions, provider
incident recovery and historical financial reconciliation remain unverified.
Jest rendering is not fresh-build physical-device acceptance. Beta enabled; full
release acceptance remains incomplete.

### Tenant case history and navigation — 8 November 2026

Continued from clean feature commit bd9c022650d2679767c8526b88d17453f8334f00.
Inspected the tenant inbox in both themes, queue links, shared web/native
conversations, linked-job case lists, API authorization and the existing
report_conversation/report_status_history SQL. Status changes already create
system messages; no invented timeline, history backfill or new migration was added.

Both web inbox layouts open the report targeted by notification query parameter;
sign-in and retry preserve that target. Unavailable cases and failed inbox reads
are explicit, rather than silently showing an empty inbox. Queue Review report
opens the exact case. Detail views provide property and recorded linked-job links.
Opening Create Job no longer PATCHes a report to converted before creation. Old
converted records say Marked converted; a missing job link is stated explicitly.
Unlinked converted cases offer an explicit Reopen action through the existing
status endpoint; linked converted cases do not offer duplicate job creation/reopen.
Existing status mutations reconcile the selected modal with the server response
without closing a different case opened while the request was pending.

Web/native case history now shows original category/description/submission time,
current status, dated recorded messages and distinct system status updates. Dates
use Europe/London. Latest updates resolves the final 25-message page after RPC
authorization, with another authorization check before returning that page; an
already-final page avoids the extra count/RPC. Older/newer navigation uses the
server-returned offset. Original-summary reads project only category, description
and created_at, excluding contact details, internal notes and receipt hashes.
Summary failure remains visible alongside available messages. Existing receipt,
manager/owner and assigned-contractor authorization is retained; viewers are not
newly admitted. Shared history is distinct from internal property follow-up notes.

Record-keyed web state and account/report-keyed native state isolate drafts and
late completions. Reads have bounded waits and cancellation. Malformed history
fails visibly. Writes use a ref lock and a stable message ID; only an exact API
acknowledgement clears input. Unconfirmed sends retain and lock the draft for the
same-ID retry, and confirmed sends open latest updates. Native job-case lists show
category/status, validate responses and reset when the job/account changes.
Native history controls have 48-point targets and multiline note space.

Fresh local checks: 36 web tests/6 files and 14 mobile tests/3 suites passed;
shared package build, full web/mobile TypeScript and changed-file web/mobile
ESLint passed. The final Reopen visibility conditions also passed the added
regression cases and changed-file lint. Logs:
output/tenant-case-{web,mobile}-20261108.log,
output/tenant-case-{web,mobile}-{types,lint}-20261108.log and
output/tenant-case-shared-build-20261108.log. Existing React Native renderer
deprecation warnings remain. Aikido tooling is unavailable; no clean scan claimed.

The supplied Supabase CPU-alert screenshot is operational evidence, not an
instruction to resize/deploy. Read-only system diagnostics on project
ukrjudtlvapiajkjbcrd at 01:26 UTC found ACTIVE_HEALTHY project status, 14 idle/Client
connections, one idle/Extension connection, one background/Extension connection
and zero other active queries older than 30 seconds. Cumulative statement stats
were last reset 1 November 2026 16:40:45 UTC; the top six execution-time entries
included catalog/introspection and other statements. SQL text and customer rows
were not retrieved. These are not CPU time-series measurements and do not establish
the alert's cause or recovery. CPU correlation at the alert window remains open.
Diagnostics used READ ONLY transactions with a five-second statement timeout;
no compute setting, live record, financial record or notification was changed.

No deployment, migration application or main merge. Beta stays enabled and feature
auto-deployment remains disabled. The previous team-queue migration is still
unapplied with its documented staged rollout dependency. This case-history API
must precede native release because the new client validates pageOffset/messageId.
Automatic report-to-job linking after successful creation remains unimplemented;
historical converted records were not repaired. Inbox-wide server pagination,
durable drafts/retry IDs across app exit, concurrent revocation/receipt rotation,
real message delivery and fresh browser/device visual/accessibility checks remain
open. Preserve deployed-relay MFA, native sign-in enforcement, physical-device and
historical reconciliation limitations. Full release acceptance remains incomplete.


### Supabase CPU alert investigation and local conflict prevention — 8 November 2026

Read-only production investigation of project ukrjudtlvapiajkjbcrd, approximately
10:09–10:22 UTC. The repository was clean at e556924af before this batch. No SQL
mutation, RPC invocation, deployment, compute resize, termination, notification,
account change or financial write was performed. System SQL used READ ONLY and a
five-second statement timeout; logs were bounded to explicit time windows.

Cause: strong time-correlated evidence of the previously observed operator-review
retry loop, triggered by a deterministic stale-review exception incorrectly using
serialization_failure (40001). PostgreSQL logs contain 9,570 such errors from
review_quote_amendment_email, line 23 at RAISE, across two backend sessions between
2026-11-07 21:25:40.506 and 2026-11-08 00:05:33.349 UTC. Of these, 7,510 fall in
22:00–00:30, with approximately 60 logged errors/minute. These are logged errors,
not a measured count of every internal retry. The ending timestamp matches the
previously applied email-conflict migration (hosted 20261108000533). The earlier
backend termination did NOT establish durable recovery: a second session also
contributed to the incident. The migration, rather than caller timeout, ended the
observed loop. No deliberate failing RPC was sent during this investigation.

Authenticated Supabase Database Observability, custom 21:00–01:00 UTC window,
shows CPU rising around 21:25, sustained roughly 80% combined user/system activity,
and falling near idle around 00:05. These are approximate visual chart readings,
not exported precise samples. The project overview at approximately 10:12 showed
Healthy, Nano compute, CPU 4%, RAM 61%, and 16/60 connections. No 40001 was logged
in the independently checked 00:06–10:10 window (one PT409, the previously verified
stale test). Current system checks found zero other active client queries older
than 30 seconds and zero idle-in-transaction client sessions. The chart/log timing
strongly attributes this alert to the controlled stale-review retry incident;
it does not prove absence of every concurrent contributor or future saturation.

Cumulative pg_stat_statements (reset 1 November 16:40:45 UTC) ranks Realtime
list_changes, PostgREST set_config, admin assignment RPCs and cron_job_runs writes
among the largest totals. Those totals cannot identify incident CPU by themselves;
failed work is not reliably represented by completed-statement rankings. Normal
cron activity and frequent operations-dashboard reads were observed, without
sufficient evidence to change schedules or remove indexes. No blanket index change.

Additional findings: 1,207 collation-version warnings in 22:00–00:30 (1,184 postgres,
23 template1), created version 153.120 versus OS 153.121. Another 5,498 warning
entries occur after 00:06; these ongoing warnings require separate managed-database
maintenance assessment, not a blind REFRESH COLLATION VERSION or reindex here.
The dashboard also marks memory commitment Severe (~1.45 GB); this alone does not
establish resident-memory exhaustion. Health advisors returned zero findings;
performance 1,234 (45 unindexed FK, 4 no primary key, 1,185 unused-index notices),
security 136 in seven existing categories. Advisory counts do not prove CPU cause
or justify broad schema/security changes in this task.

Local prevention prepared, NOT APPLIED:
20261108101704_quote_amendment_business_conflicts.sql changes only eight business
conflict SQLSTATE values in propose_quote_amendment and transition_quote_amendment
from 40001 to PT409. Source function bodies match production exactly before these
substitutions (MD5 42b9db4df81a790fa672c3c709f2fb0b and
93521f571cedcdd5ba37efcfb9930d5b respectively). Both APIs now map PT409 to HTTP 409
while retaining legacy 40001 handling. Function grants remain postgres/service_role
only, SECURITY DEFINER and empty search_path unchanged. No accepted pricing,
locking, authorization, idempotency, notifications or financial safeguards change.

Release sequencing remains API first, migration second, then controlled hosted
verification. The release migration guard is intact: a full feature-branch build
will refuse production while migrations are pending. Use an explicitly authorized
API-only release without pending SQL, as documented in the earlier conflict release;
do not bypass the guard or apply SQL ahead of the compatible API. No release is
authorized or attempted in this batch. Feature auto-deployment remains disabled.

Fresh local validation: shared package build passed (10 tasks); 82 web tests in
quote-revisions-api, quote-approval-api and quote-email-review-api passed; 57
embedded PostgreSQL approval/application scenarios plus role/RLS checks passed;
10 release-migration guard tests passed. SQL checks compare complete function
bodies, ACLs, security settings and arguments before/after, asserting only the eight
SQLSTATE changes. New cases cover proposal reuse/stale timestamp/non-accepted state,
changed job and changed accepted bid, with PT409 assertions for stale decisions,
closed states and changed payer. Existing replay, immutable history, notification
atomicity and financial-footprint refusal scenarios still pass. An initial new
synthetic draft fixture lacked required total_amount; it was corrected to zero and
the complete SQL suite reran successfully. Targeted production-source ESLint passed;
test files are ignored by repository ESLint configuration. Full web TypeScript (tsc --noEmit --incremental false) passed.
Aikido scan tooling is unavailable; no security-scan pass is claimed. Local logs:
output/cpu-{packages,conflicts-sql,conflicts-web,conflicts-types,conflicts-lint,release-guard}-20261108.log.

Remaining risk inventory (read-only pg_proc inspection): seven other hosted
functions still explicitly raise 40001: finish_account_cleanup_step,
respond_to_visit, review_retained_evidence, schedule_retained_evidence_disposal,
save_property_action_followup, update_property_tenancy_folder and update_support_case.
The follow-up fix is already pending in the previous unapplied team-queue migration;
others require caller mapping and behavioral tests before separate changes. No
incident-window evidence attributes this alert to those functions. The two quote
functions remain unchanged on production until authorized release of this batch.
PGlite does not run PostgREST: hosted terminal-response verification remains open
for these new cases. No load test was run against production.

Beta gate remains enabled and unchanged. No deployment, main merge, financial
mutation or hosted migration. Preserve all prior device/MFA relay, native sign-in
challenge enforcement, physical-device visual, genuine provider recovery and
historical financial reconciliation limitations. Full release acceptance is incomplete.

References: Supabase high-CPU guidance
https://supabase.com/kb/troubleshooting/high-cpu-usage and PostgREST custom SQLSTATE
HTTP status handling https://docs.postgrest.org/en/stable/references/errors.html .


### Remaining deterministic conflict codes — local completion, 8 November 2026

Continued from clean feature head 7deb90dc4. Inspected the six remaining function
bodies, their callers, the existing property-follow-up fix and historical migration
order. This batch uses local files, mocked APIs and disposable PGlite only; no
production query, failing RPC, provider call, financial write or deployment.

Prepared, NOT APPLIED, migration
20261108103023_remaining_business_conflicts.sql. Seven explicit business-conflict
40001 codes become PT409 in six functions:
- finish_account_cleanup_step: expired/replaced lease or already-completed step.
- respond_to_visit: changed date, time or visit state.
- review_retained_evidence: stale review revision.
- schedule_retained_evidence_disposal: held/unclassified/stale evidence and an
  already-existing incompatible disposal decision.
- update_property_tenancy_folder: stale revision or mismatched folder/property.
- update_support_case: missing/stale case revision.

API callers for visit, evidence review/disposal, tenancy and support now map PT409
to their existing refresh-required HTTP 409 response, retaining legacy 40001.
The account-cleanup worker already fails closed for every checkpoint error; no
worker behavior change was needed. Its PT409 regression verifies that an uncertain
checkpoint does not claim completion and a later confirmed provider cancellation
is not duplicated. All provider operations in that test are mocks.

The property follow-up function was already replaced by pending migration
20261108005044_property_followup_conflicts_team_queue.sql. It was preserved and
retested, not overwritten by this migration. The earlier quote prevention migration
20261108101704_quote_amendment_business_conflicts.sql also remains unapplied.
The effective final local definitions of all ten functions from the CPU incident
inventory now have no explicit ERRCODE='40001'. Historical migration files remain
immutable; their old codes are intentionally still present. This inventory check
covers the ten known functions, not arbitrary future functions or genuine engine
serialization/deadlock errors; genuine retry handling was not changed.

Fresh validation:
- Shared package build: 10 successful cached tasks; Node 20.19.4.
- 79 Vitest tests across six files: remaining-conflicts-api, evidence-review,
  evidence-disposal, property-inspection-api, remediation-account-deletion-recovery
  and property-followup-api.
- 26 disposable PostgreSQL scenarios in test-remaining-business-conflicts.mjs:
  valid transitions, stale/expired state, unchanged records after refusal, exact
  visit/disposal replay, no duplicate notifications/review/support events,
  administrator/deleted-admin/editor/property/assignee boundaries, and retention
  safeguards. Full function bodies (normalized checkout line endings), signatures,
  execution ACLs, SECURITY DEFINER/INVOKER and search_path compare equal before/after
  except for exactly seven SQLSTATE substitutions. All six remain non-executable
  by anon/authenticated and executable by service_role. The actual tenancy schema
  and editor helper and evidence-review/disposal schemas are loaded; other tables
  use minimal synthetic fixture schemas. This is not a full production-schema test.
- 10 existing property-team queue/follow-up SQL scenarios plus grant/RLS checks.
- 10 release-migration guard tests; the new migration is a required prerequisite.
- Full web TypeScript (tsc --noEmit --incremental false), targeted production-source
  ESLint and git diff --check passed. Aikido scan tools remain unavailable.

Initial checks caught fixture-only issues: Windows checkout line endings differed
in the body comparison (normalized both migration inputs), and the tenancy API mock
injected its error into the permission read rather than the update RPC (separated
rpcError). Both full affected suites passed after correction. Local ignored logs:
output/remaining-conflicts-{packages,web,sql,followup,types,lint,release}-20261108.log.

Release order remains compatible API first, reviewed migrations second, controlled
hosted verification third. The release guard intentionally blocks a full production
build while required migrations are pending; an authorized API-only release must
exclude pending SQL as documented previously, without bypassing the guard. No
schema application or deployment was requested or attempted. Hosted terminal HTTP
responses, concurrent requests and real worker recovery remain unverified for these
new cases: PGlite does not run PostgREST. The previous incident attribution and
collation/memory maintenance findings are unchanged; no new CPU recovery claim.

Beta remains enabled/unchanged; feature auto-deployment stays disabled. No main
merge, messages, account mutation, live records or financial changes. Retain all
prior physical-device visual, deployed MFA relay/native sign-in enforcement, genuine
provider recovery and historical financial reconciliation limitations. Full release
acceptance remains incomplete. Commit and push only this reviewed local batch.

### Business-conflict production release — 8 November 2026

Explicit user authorization superseded the preceding no-deploy checkpoint for
these business-conflict fixes only. Released the compatible API first, applied
the three reviewed migrations second, and verified controlled refusals third.
No main merge, financial changes, account/permission changes or new messages.

Release source and build:
- Verified the serving production source was main commit 57d24eb43268be013d9fe4c8ef7dbf4f509b9383.
- Created release/business-conflict-api-nov8 from that exact production source.
  Copied eight compatible API/service files and eight targeted test files from
  feature commit 84d28321d. This includes dual PT409/40001 handling and the property
  follow-up moved-source/eligible-assignee safeguards. No pending SQL, release
  guard, beta configuration, unrelated UI or scoped-queue API was included.
- Reviewed, committed and pushed eca682cf8cd71f26f7b5820a8bf5785b8461533f.
- Production deployment dpl_E22XSTTz1pp2sWogpgZHoKhnSenM reached READY at
  2026-11-08T11:48:34.947Z. Verified www.mintenance.co.uk points to this deployment.
  Build passed its unchanged production migration guard (15 prerequisites), shared
  package builds, web TypeScript, lint and Next.js production build (five minutes).
- Authenticated Vercel fetch of /api/version returned HTTP 200 and the exact release
  SHA at 11:50:35 UTC; /api/health returned HTTP 200 / healthy at 11:53:29 UTC.
  Ordinary unauthenticated access still required Vercel Authentication. Protection
  was not disabled; the connector uses its scoped temporary access mechanism.

Applied exact repository SQL using Supabase apply_migration, after API READY and
alias verification. Production ledger records the tool-assigned versions:
- 20261108114904 property_followup_conflicts_team_queue
  (source 20261108005044_property_followup_conflicts_team_queue.sql).
- 20261108114911 quote_amendment_business_conflicts
  (source 20261108101704_quote_amendment_business_conflicts.sql).
- 20261108114922 remaining_business_conflicts
  (source 20261108103023_remaining_business_conflicts.sql).

All three are function-only schema changes; there is no migration-time row update,
backfill or reconciliation. Compared production function bodies before/after:
the two quote functions and six remaining functions differ only by the intended
15 SQLSTATE substitutions. Existing signatures, ACLs, SECURITY DEFINER/INVOKER and
search_path settings match. The follow-up/queue changes match the reviewed migration;
the new queue is executable by service_role, not anon/authenticated. No public
function body remains with an explicit ERRCODE = '40001' in the checked inventory;
genuine PostgreSQL serialization handling remains unchanged. The unchanged feature
release guard's requiredMigrations/verifyApplied check passes all 19 prerequisites
against the freshly fetched production ledger. A full feature build was not deployed;
the new scoped queue UI/API and other unrelated feature work remain unreleased.

Fresh local release validation:
- Node 20.19.4; 134 Vitest tests in eight files from the isolated API release tree.
- 26 remaining-conflict, 10 property-follow-up/team-queue and 57 quote-amendment SQL
  scenarios (93 total), including body/grant/security, replay and side-effect checks.
- 10 release-guard tests and 22 relay tests, including beta/MFA routing checks.
- git diff --check; hosted full TypeScript/lint/build passed as above.
  Initial local test startup failed because this isolated worktree lacked web
  dependency links; then sandbox temporary-file renames failed. Linking the existing
  dependencies and running the same tests outside that sandbox produced the passing
  run. No application code was changed to hide either environment failure.

Controlled production verification used only designated homeowner
gloirenkouka380@gmail.com and admin@mintenance.co.uk actor IDs. Under service_role,
with bounded timeouts and an explicitly rolled-back transaction, seven calls returned
PT409 as required: stale and already-withdrawn amendment rejection; stale follow-up;
changed visit date; nonexistent tenancy folder; nonexistent support case; nonexistent
cleanup lease. Each check asserted the expected exception and would abort on success
or a different error. The noncontractor homeowner proposal attempt returned P0002.
These are database-function checks through the connector, not signed-in Next.js or
PostgREST HTTP checks. No approval/application action or successful cleanup operation
was invoked. No record was fabricated to exercise retention/disposal.

Read-only designated homeowner queue checks returned team=12, mine=0, unassigned=12,
with five overdue items; old portfolio_action_queue exactly matched team scope.
Before/after fingerprints match for the house-check job, quote, bid, contract and
signatories; all eight job-linked financial tables remain empty. Amendment state/
events, follow-up/history and the selected visit fingerprints also match. Both test
amendments remain withdrawn/version 2 and unapplied. The failed first follow-up left
no placeholder or history. No tenant/contractor notification was committed.

Post-release health advisors report zero findings. Security groups/counts are unchanged
from preflight (136 across seven groups); performance counts are unchanged (1,234).
These existing findings are not resolved by this release. A scoped ten-minute Vercel
error/fatal query returned no groups; this is a short observation, not sustained CPU
or comprehensive runtime acceptance. Ten restrictive beta database policies remain;
website protection, relay deployment/allowlist and feature auto-deploy exclusion were
unchanged.

Remaining acceptance: the admin browser session expired and the prepared tab still
shows Admin Sign In; the requested user sign-in has not completed. Signed-in operator
UI and end-to-end HTTP conflict behavior remain unverified for this release. No
designated contractor account was provided, so contractor proposal conflict branches
were checked locally and by production body equivalence only. Designated accounts
have no retention/disposal, tenancy or support fixture suitable for a real stale-edit
check; missing-record tenancy/support checks do not replace that coverage. Successful
real cleanup/provider recovery and hosted concurrent-request behavior remain open.
No evidence that this release reconciles historical finances or establishes native
MFA challenge enforcement. Preserve all Android/iOS deployed-relay device checks,
fresh-build physical-device visuals and prior acceptance limitations. Beta remains
enabled. Full release acceptance remains incomplete.

Local ignored evidence: output/conflict-release-api-tests-20261108.log,
output/conflict-release-relay-20261108.log and
output/business-conflict-production-ledger.json. The release branch is pushed; this
audit is recorded on feat/launch-terms-support-nov2 with automatic deployment excluded.

### Signed-in operator conflict verification — 8 November 2026

After the user completed sign-in, the production admin dashboard and customer
service inbox loaded. The previous expired-session blocker is cleared. Production
request logs identify the signed-in actor as the designated admin UUID ending
4d1c (admin@mintenance.co.uk), on deployment dpl_E22XSTTz1pp2sWogpgZHoKhnSenM.

Created one explicitly labelled nonfinancial support fixture, ca037228-55d8-40dc-
b3ac-4342b9531c54, owned by the designated homeowner and assigned only to the
designated admin. It has no job link. Inspected table constraints and confirmed
there are no noninternal triggers before inserting the fixture and its labelled
test-creation event. Did not invoke the general assignment routine, which can
notify other operators. The fixture waits on the customer with a seven-day due
date while being tested; no real customer issue, message or financial record was
created. Closed it through the signed-in UI immediately after verification.

Two browser tabs loaded revision 1. The first operator save succeeded and recorded
revision 2 / one update event. Saving from the stale second tab displayed
"Case changed or the assignee is unavailable. Refresh before updating." Production
logs confirm PATCH HTTP 409 / CONFLICT at 11:59:18.961 UTC for the designated admin,
request cq98t-1794139158690-63334688163a. The database stayed at revision 2 with no
duplicate event. This establishes the deployed support API's terminal conflict
mapping through an actual signed-in request, rather than only a direct SQL check.

Found a separate production UI recovery defect: Refresh inbox cleared the notice
and refreshed the list, but retained the selected editor's old revision. A retry
therefore returned the conflict again. Reopening the case loaded the current
revision and allowed closure. Final fixture state is closed, revision 3, assigned
to the designated admin, no job link, three events total (test creation and two
successful updates), zero support messages and zero matching communication-outbox
entries. No account settings/permissions or customer/contractor messages changed.
Fresh test-job source and financial fingerprints still match the pre-release check.

Local fix in AdminSupportInbox: Refresh inbox now reloads the selected case before
refreshing the list, updates the editor's revision and authoritative fields, and
preserves unsent reply text, handover notes and the reply idempotency key. It disables
refresh during an active operation and does not resubmit any mutation. Errors replace
previous success notices. Reopening a case still resets drafts as before.

Fresh checks: 10 tests passed (three support UI regression scenarios plus seven
existing remaining-conflict API scenarios). These cover stale save -> refresh ->
successful retry using the current revision, draft preservation, failed-refresh
success-message reset and refreshing with no selected case. Full web TypeScript
(tsc --noEmit --incremental false), targeted ESLint and git diff --check passed.
Local logs: output/operator-conflict-ui-20261108.log and
output/operator-conflict-types-20261108.log. Aikido scan tools are unavailable.

This UI fix is local and pushed for review, NOT deployed; production still needs
the case-reopen workaround until a subsequent UI release. No new deployment or
migration was performed in this continuation. The production support conflict
check supersedes that specific HTTP verification gap; it does not establish all
visit, tenancy, contractor-proposal, evidence/disposal or worker recovery branches.
Retain all prior physical-device, native MFA enforcement, concurrent-worker/provider
and historical financial reconciliation gaps. Beta remains enabled; feature
auto-deployment remains excluded and main was not merged. Full acceptance is open.

### Support Refresh-button production release — 8 November 2026

User explicitly authorized deployment and designated-account verification. Verified
the current production source was eca682cf8, then prepared release/support-refresh-
nov8 from that source. Only AdminSupportInbox.tsx and its regression test differ:
the two files exactly match feature fix 4d6631020. No unrelated feature UI, SQL,
release guard, deployment protection or beta configuration was included.

Release commit 5cc36721d3477c24133ce6ebf60f3cfb9f41804a is pushed. Production
deployment dpl_G7LyZwQdaVcwFZQStQfzNhJZB2nr reached READY at
2026-11-08T12:31:24.889Z. Verified www.mintenance.co.uk aliases this deployment;
authenticated /api/version returned HTTP 200 with the exact release SHA at
12:32:01 UTC. The unchanged migration guard passed all 15 prerequisites for this
production-based tree. Shared builds, full web TypeScript, lint and Next.js build
passed (four-minute hosted build). Existing missing-Sentry-token warnings mean
release creation/source-map upload remain unavailable. No credentials were changed.
Fresh tests against the exact isolated release tree: 10/10 UI/API tests in two files
passed under Node 20.19.4; git diff --check passed. No migration was needed or applied.

The admin session had expired again; the user renewed it before verification.
Loaded fresh production pages in two browser tabs as the designated admin. Reused
the existing clearly labelled support fixture ca037228-55d8-40dc-b3ac-4342b9531c54,
owned by the designated homeowner and assigned to the designated admin, with no
job link. The case stayed CLOSED throughout; no new fixture or customer message.

Observed deployed recovery sequence:
1. Both tabs loaded revision 3, low priority. First tab saved normal priority:
   revision 4, four total events, "Case updated." visible.
2. Second tab submitted its stale revision 3. The UI displayed the conflict message;
   production logs confirm HTTP 409 / CONFLICT at 12:33:04.031 UTC for designated
   admin 623398c7-2335-4707-90b5-8bcee7eb4d1c on this new deployment. Request ID:
   zw7g5-1794141183728-2ba3c1e677a3. Revision/event count remained 4/4.
3. Clicked Refresh inbox without reopening or navigating away. It cleared the
   conflict notice, loaded the authoritative normal priority into the selected
   editor, preserved the unsent reply draft and handover note, and re-enabled the
   controls. Database revision/event count remained 4/4: refresh did not mutate.
4. Restored low priority in the refreshed editor and saved. The retry succeeded,
   showing "Case updated." Final revision 5, five events total. This proves the
   selected editor used the refreshed revision; the former reopen workaround is
   no longer required for this tested path.
5. Clicked Refresh inbox again. The prior success notice cleared and the loaded
   case remained closed/low, revision 5, five events. No duplicate save occurred.

Final checks: zero fixture support messages and zero matching communication-outbox
entries; assignment/ownership unchanged and no job link. Exactly two successful
updates were added in this check; the rejected save and both refreshes added none.
No Send customer reply, notification, account-permission, financial or contract
operation was invoked. Fresh source/financial fingerprints for the designated
house-check job match the pre-deployment baseline (job, quote, bid, contract,
signatories and all eight linked financial tables).

/api/health returned HTTP 200 / healthy at 12:35:06 UTC (200 ms reported). A scoped
ten-minute error/fatal log query for this deployment returned no groups; the
deliberate 409 is a warning, not an unexpected server error. This short observation
does not establish sustained service health. An unauthenticated profile probe
returned HTTP 302; website protection, relay allowlist/deployment and beta policies
were not changed. This probe does not establish unapproved signed-in beta behavior.

Local ignored evidence: output/support-refresh-release-tests-20261108.log,
output/support-refresh-preserved-draft-20261108.jpg and
output/support-refresh-success-20261108.jpg. The prior "not deployed" and selected-
case refresh workaround limitations are superseded for this fix. Other visit,
tenancy, contractor proposal, evidence/disposal and real worker/provider branches
remain outside this verification, as do device visuals, native MFA enforcement and
historical financial reconciliation. Full release acceptance remains incomplete.
Beta remains enabled. No main merge; audit updates are pushed on the feature branch
with automatic deployment still excluded.
