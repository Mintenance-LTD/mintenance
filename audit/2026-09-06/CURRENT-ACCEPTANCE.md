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
