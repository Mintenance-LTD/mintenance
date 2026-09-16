# Remediation progress — 7 September 2026

This is a progress record, not a revised launch-readiness verdict. Hosted Supabase databases have
not been changed. Existing user changes were preserved.

## Implemented locally

- **F14:** Login and registration now use a fresh anonymous Supabase client. Privileged database
  operations retain their dedicated client. Authentication tests assert that the privileged client's
  session-changing methods are never called and that simultaneous logins obtain distinct clients.
  Targeted result: 21 tests passed.
- **F6:** The payment-success webhook now conditions its update on the status read earlier. A
  concurrent release, refund, or dispute therefore cannot be overwritten by this update. A database
  lookup error throws so the webhook delivery can retry. Targeted mocked webhook suite: 3 tests
  passed, including the unchanged mobile-token audit observation. Real provider delivery is not
  verified by these tests.
- **F12:** Permissions-Policy allows same-origin geolocation, enabling the implemented location
  feature to request browser consent. Camera and microphone permissions remain unchanged.
  Device/browser permission interaction has not been repeated yet.
- **F15:** Corrected the original cross-user integration test's messaging fixture and mutation
  assertions. It now uses an assigned job for private messaging and actual returned rows instead of
  unsupported mutation select count/head options. This original suite has not yet been rerun against
  a recreated disposable database; its equivalent audit diagnostic previously passed against the
  isolated database.

## Still open

F1 database privileges/defaults/reward RPCs; F2 trusted lifecycle writes and funding invariants; F3
idempotency scope/payload matching; F4 interrupted payment recovery; F5 credit/principal accounting;
F7 atomic requested-changes transition; F8 mobile bearer authentication; F9 refund accounting; F10
atomic signatures/contracts; F11 concurrent contractor capacity; F13 private-image ownership and
signing authority.

These remaining findings prevent treating this work as complete production remediation. The audit's
readiness verdict remains in force.

## Validation

- Web TypeScript check: passed (no emit, incremental disabled).
- Complete web suite: 284 suites passed; one existing webhook test still expected swallowed lookup
  failures. That expectation was corrected to require a thrown retryable error and no
  update/notification; the affected suite passed on rerun. The full suite was not repeated after
  this test-only correction.
- Targeted ESLint: application files passed with no errors; test files are ignored by repository
  lint configuration.
- Git diff whitespace check: passed.
- No production build or live provider/device checks were repeated for this batch.

## Database remediation in progress

Created 20260907220020_restrict_privileged_rpc_and_default_grants.sql through the Supabase CLI. It
explicitly revokes PUBLIC/anon/authenticated access to the six confirmed sensitive RPC signatures
and removes unsafe defaults for future postgres-owned public tables, sequences and functions.
Service access is retained. Added rollback-only remediation-rpc-grants.sql assertions. Validation is
pending: Docker's Linux engine pipe was unavailable; Docker Desktop was started in the background
and the isolated stack files prepared. F1 remains open, including profile column privileges and
repeatable milestone rewards. No hosted changes were made.

Created 20260907220306_restrict_profile_writes.sql: removes table-wide and column-level profile
mutation grants and restores only the baseline's intended editable columns. Added
remediation-profile-grants.sql privilege assertions. Docker is now available; isolated Supabase
startup is actively applying migrations (exec session 28825). The profile migration was created
after the isolated snapshot and must be applied separately there before validation. Original local
database remains untouched.

Database validation update: applied the profile migration with psql only to
supabase_db_mintenance-audit-20260906. All three rollback-only checks passed:
remediation-rpc-grants.sql, remediation-profile-grants.sql, and remediation-profile-operations.sql
(logs alongside each script). Verified six RPC ACLs, service access, new table/function defaults,
protected profile columns, allowed owner name editing, denied cross-user editing, denied
role/verification forgery, and denied anonymous delete_user_data. All synthetic records rolled back.
F1 is still incomplete because milestone reward idempotency and the broader privileged-function
inventory remain to be resolved.

Milestone remediation: 20260907220658_contribution_milestone_claims.sql adds a service-only,
RLS-enabled ledger keyed by contractor and threshold. Claim insertion and credit/premium updates are
atomic under the existing contractor lock. Local rollback tests passed for retry, premium credits
and failed-transaction recovery. remediation-milestone-race.py passed with two concurrent sessions:
exactly one 10-credit award, final balance 60, one ledger claim; synthetic records removed.
Historical records are explicitly marked legacy_boundary when last_reward_date exists; historical
award ambiguity needs reconciliation before hosted rollout. This is not proof of historical award
correctness. F1 broader privileged-function review remains open.

F3 progress: both request idempotency helpers now hash a structured tuple of operation, actor,
resource and client key instead of returning the untrusted raw header. This prevents
cross-user/resource cache addressing and delimiter ambiguity. The original concurrent payment-route
suite and audit payment diagnostics passed after converting the key-collision and foreign
cached-secret observations to safe assertions (see remediation-idempotency-tests.log). Headerless
fallback remains unchanged. Payload matching and database-level actor binding remain open; F3 is not
yet complete. Existing unscoped cache entries are intentionally not used by new supplied-key
requests; interrupted-payment recovery (F4) remains required.

F4 progress: create-intent can now resume a single pending escrow by retrieving its existing Stripe
PaymentIntent before the blocking guard. It verifies payer/payee, job/bid metadata, GBP currency,
cash plus credit against the accepted bid, and resumable provider status before returning the
existing secret. The changed audit route suite passed (remediation-payment-resume.log); no new
PaymentIntent is created on the replay. Negative mismatch/provider-failure tests, broader route
checks, and missing-escrow recovery remain outstanding. F4 is still partial. F5 accounting changes
must preserve/update this cash-and-credit reconciliation.

8 September update: broader payment tests passed, 6 suites/112 tests, including wrong
payer/contractor/job/bid, wrong amount/currency, non-resumable statuses, missing secret and provider
failure. Web TypeScript check passed (remediation-web-types-2.log). F4 missing-escrow recovery
remains open.

F2 progress: 20260908082527_trusted_contract_and_escrow_inserts.sql removes table and column INSERT
grants from PUBLIC/anon/authenticated; service creation retained. Active creation paths inspected
use serverSupabase. Applied only to disposable DB. remediation-trusted-inserts-tests.sql passed:
owner cannot forge held escrow or dual signatures; service can create pending escrow and draft
contract. All fixtures rolled back. Accepted-bid immutability, funding-provider validation, and full
integration compatibility remain outstanding.

Bid integrity update: 20260908082735_protect_bid_financial_terms.sql adds an invoker trigger
rejecting forged client accepted bids, edits/deletes of nonpending client bids, and changes to
accepted amount/job/contractor even by trusted writers. Pending own edits and withdrawals remain
allowed. Local SQL regression passed with rollback: forged acceptance denied, pending amount edit
allowed, accepted amount edit denied, accepted withdrawal denied. PATCH and withdrawal routes now
condition writes on status=pending; withdrawal requires a returned row before reporting success.
Updated the query-shape mock; all 37 tests in three bid route suites passed. Broader
integration/concurrency verification and provider-backed funding checks remain outstanding.

F11 progress: service-only accept_bid_with_capacity wraps atomic acceptance with a contractor-scoped
transaction advisory lock and capacity count; server-resolved free/basic tiers pass limit 3, other
tiers pass null. Route now bypasses capacity for already-applied acceptance recovery and maps
capacity rejection to 409. Local two-session race passed: two distinct posted jobs competing for the
third slot yield one success and active count=3. Synthetic profile names were supplied after the
first fixture failed a contractor_clients NOT NULL constraint; no control was disabled.
Bid-acceptance route tests passed including recovery at cap. Full migration-chain replay, broader
integration, and durable follow-up coverage still required.

F7 progress: 20260908083557_atomic_job_rework.sql adds service-only request_job_rework,
locking/checking designated payer, job and held escrow; clears approvals and reopens job in one
transaction; stores comments with actor-scoped request key and rejects replay payload changes.
Terminal transition exception is scoped to the trusted function's transaction marker and postgres
execution; clients remain blocked. Route now invokes this RPC. Local SQL test passed for successful
reopening, duplicate recognition, unrelated actor denial and injected job-write failure rolling
escrow changes back. Route mock updates, notifications/recovery durability and broader integration
checks remain open; F7 is not yet closed.

Rework route validation: updated tests to exercise the atomic RPC boundary, conflict mapping, exact
request arguments and no notification/email on failed transaction. Suite passed
(remediation-rework-route.log). This does not establish notification delivery after process death or
prevent duplicate delivery after a retry; durable dispatch remains outstanding.

F13 origin parsing progress: extractJobStoragePath now uses URL parsing, exact configured
origin/protocol/port, rejects URL credentials, invalid escapes and invalid object paths; retains
valid legacy bare paths. Unit and audit signing tests passed (remediation-storage-origin.log),
including denial of foreign-origin privileged signing. This is NOT the ownership fix: same-origin
arbitrary keys can still reach signing and remain a launch blocker. Signed URL TTL and caller/object
authorization are still open.

F8 progress: proxy now tries verified Supabase bearer identity after custom-cookie JWT verification,
retaining proxy blacklist/timeout gates. New verifySupabaseBearer uses Auth.getUser before decoding
and obtains role/timestamps from service-only verified_mobile_session_context. The RPC requires
matching live auth.sessions, not_after, profile and tokens_revoked_at cutoff. Four mocked verifier
tests passed; local SQL live/cross-user/revoked/deleted session tests executed with rollback (see
logs). Actual mobile bearer HTTP, route-helper unification, session-expiry integration and full
type/build validation remain required; F8 stays partial.

F8 actual HTTP evidence: remediation-mobile-http.cjs passed against isolated Next on 3017 and local
Supabase 55321. Supabase-issued owner bearer -> protected property 200; unrelated bearer -> 404;
same owner bearer after tokens_revoked_at cutoff -> 401. Synthetic accounts/property removed. Server
launched only with local credentials and dummy external providers (session 34692); no hosted
services used. Production timeout enforcement, device refresh/deep-link behaviour and route-helper
unification remain unverified.

F10 progress: 20260908133326_atomic_contract_signature_evidence.sql stores a contract snapshot and
click/image evidence together with signer timestamps and final status under contract row lock. It
checks signer/profile/designated payer and pending state, and waits on co-signer rows. Route now
calls sign_contract_atomic instead of separately updating state, persisting evidence and reconciling
status. Local rollback test passed after correcting the inet cast: injected image insert failure
rolls everything back; two click signatures create two evidence records and accepted status. Route
tests, co-signer concurrency, retries/version immutability, full type/build and dispatch recovery
remain outstanding; F10 is partial.

Contract validation update: 17 route tests passed after switching mocks to sign_contract_atomic,
including image payload forwarding and no notification on transaction failure. Added
20260908133828_freeze_signed_contract_terms.sql: locks economic/document fields once either primary
party/co-signer/evidence exists and prevents erasing or replacing an existing primary signature.
POST/PUT contract editing reports signed contracts as noneditable. Local signing SQL suite passed
with amount-change and signature-erasure rejection. Broader contract-edit compatibility,
amendment/version workflow and co-signer concurrency remain to verify.

F9 partial fix: refund route cancels the associated job only on a full refund. Added explicit
partial-refund route test asserting no job update; suite passed (remediation-refund-route.log).
Remaining escrow balance, cumulative refunds, provider-pending semantics and durable reconciliation
are still unresolved, so F9 is not closed.

Full regression result: 285/286 web suites passed, 3147/3149 tests. Two lifecycle tests used an
obsolete blanket bid-RPC result for the new signing RPC. Updated those fixtures to the explicit
signing response and reran the affected lifecycle suite successfully
(remediation-lifecycle-suite.log). No application controls were changed to satisfy those fixtures.
The full suite has not been repeated after the fixture correction.

Bid acceptance race update: added 20260908185926_enforce_pending_bid_acceptance.sql. The locked
atomic transition now rejects withdrawn/rejected bids and only rejects competing pending bids,
preserving withdrawn history. Applied on the disposable local database. Extended
remediation-capacity-race.py passed for withdrawn-bid rejection without job assignment and two
concurrent acceptances competing for one slot. No hosted database changes.

F3 actor/payload binding: all nine active shared claim callers now send their authenticated actor
and a canonical SHA-256 request fingerprint to service-only try_claim_bound_idempotency_key.
Migration 20260908190237 binds pending/completed cache reads before returning results; separate
fingerprint survives completion metadata. v3 keys hash complete structured identities (including
headerless keys) without truncation. Refund/checkout supplied keys bind actual resources separately
from headerless fallback details. Local rolled-back SQL passed for identical pending/completed
retries, changed-payload denial, cross-user denial and client EXECUTE denial. Payment route
diagnostics: 2 suites/22 tests passed; acceptance/refund/lifecycle plus helper: 4 suites/67 tests
passed; additional invoice/completion/refund plus helper: 4 suites/51 tests passed (overlap between
runs). Claim generation fencing, stale takeover and provider-success recovery remain open; F3 not
complete. Web type check remains running at time of entry.

F3 follow-up: the type check found nine additional generic checkIdempotency callers missed by the
first search (18 total). Updated all nine rather than making the new context optional. Contract
signing fingerprints validated signature input; photo routes fingerprint bounded multipart
fields/file contents independently of MIME boundaries. The original request remains readable.
Generic callers/signature/rework/start/photo suite: 4 suites/54 tests passed. Multipart helper plus
after-photo suite: 2 suites/21 tests passed. Bid acceptance now rechecks role, current designated
payer and bid/job identity before cache lookup; removed-payer replay regression and lifecycle suite
passed (2 suites/46 tests). Other cache-before-authorization callers still need the equivalent
review. Type-check attempt 4 failed with the nine missing-argument diagnostics; all were repaired,
and attempt 5 is running. No claim of a final passing type check yet.

Checkpoint for GitHub, 9 September: web type-check attempt 5 completed successfully before the
latest transfer-service changes. Added 20260908191850_durable_escrow_transfer_attempts.sql and
EscrowTransferService, shared by manual/automatic direct releases. Frozen provider parameters
survive lost responses and DB completion errors; known reversed transfers and old unresolved
attempts fail closed. Automatic finalization failure retains the transfer instead of reversing and
later falsely completing it. Manual error wording no longer claims that no funds moved. Two caller
suites/25 tests and the synthetic provider recovery suite/5 tests passed. Migration applied on
disposable local database. The SQL reservation test initially failed an invalid synthetic job
description; fixture corrected, but rerun was rejected by automatic approval review because of an
account usage limit. The concurrent reservation script was written but not executed. New transfer
changes still require SQL/concurrency/type-check verification, provider funding checks, durable
reconciliation and accumulation-path repairs. No hosted changes or real payments. Remediation
remains incomplete.

9 September continuation: transfer reservation SQL now passes after fixture correction; concurrent
two-session reservations produce one identical provider operation (remediation-transfer-race.log).
Added EscrowFundingService to verify matching succeeded GBP PaymentIntent, exact captured cash
amount, job/payer/payee metadata and a paid/captured, undisputed, unrefunded charge before new
direct transfers, accumulation credit and job start. Six targeted suites/82 tests passed, including
failure propagation preventing transfer creation. Embedded checkout now copies canonical metadata
onto its PaymentIntent, resolves contractor from the job when absent from input, and enforces
designated payer precedence; three route tests passed after correcting reset-prone price/fee mocks.
Legacy checkout PaymentIntents missing metadata require evidence-based reconciliation; no hosted
backfill attempted. Funding verification currently uses escrow cash amount; F5 gross/credit
accounting and F9 partial-refund reconciliation remain unresolved. Web type-check attempt 6 started.
No completion claim.

9 September private-photo continuation: web type-check attempt 6 passed. Added mandatory viewer
identity to private-photo refresh callers and service-only authorized_private_photo_paths
migration 20260909091114. Authority derives from storage ownership/server-generated paths and
current job/property-room access, never editable attachment URL arrays. Public contractor profile
readers cannot mint private photo capabilities. Denied/missing private photos now return a
placeholder without recycling old signed URLs; batch positions remain stable and fresh URLs expire
after one hour. Room-photo GET now uses the same authorization boundary, including current
property-team membership. Four suites/28 tests passed for parsing, cross-user/anonymous denial,
expiry limits, RPC/signing failure, and thumbnail viewer propagation. Type-check attempt 7 found a
missing viewer argument in the contractor list helper; corrected, and attempt 8 passed. Docker had
stopped; restarted Desktop and applied the migration only to the disposable audit stack. The
rollback-only SQL diagnostic passed owner access, unrelated denial, accepted room-photo viewer
access, removal revocation, and denial of client-supplied actor impersonation. No hosted changes or
real users/payments. Logs are ignored local artifacts; new test/SQL files are audit artifacts
identified by their remediation-private-photo names.

F13 remains incomplete: ordinary property-photo and legacy root job-photo sharing need trusted
attachment bindings before authorized collaborators can renew those images. Existing signed URLs
issued before this change remain capabilities until expiry; this change cannot revoke them. No
browser usability or device verification of the new photo flows has been performed. The full
migration chain, db diff, remaining payment/credit/refund recovery, and other outstanding audit
findings still require completion. Current changes are uncommitted; the prior GitHub checkpoint
remains 8fec38aa5cd84a1dacb7e654f6b1b6802e55446b. Goal remains active.

9 September trusted property-photo bindings: CLI-generated migration
20260909141332_trusted_property_photo_bindings.sql adds a service-only attachment table and
save_property_with_photo_bindings. Property POST/PUT now persist fields and attachments in the same
database transaction. New attachments require the actor's own storage upload; existing attachments
can be retained by an authorized property manager. Shared-photo reads consult these trusted bindings
and current team membership. Clients cannot directly create bindings or invoke the actor-taking save
RPC. Property creation's primary-property reset now occurs in the same transaction, so rejected
creation does not clear the previous primary property. PUT also redacts key_safe_code for property
managers/admins who are not the owner or platform admin, matching GET.

The migration applied on the disposable local stack. remediation-property-photo-bindings.sql passed
synthetic owner/manager/unrelated authorization, forbidden attachment, immutable owner field,
attachment removal, and rollback checks. An injected binding trigger failure after the property
update restored both the old property and the removed bindings. All fixtures, trigger, and function
rolled back. Four helper/photo suites passed 18 tests; the real PUT route with mocked auth/database
boundary passed 3 tests for atomic-save arguments, manager code redaction, owner code access, and
denied edits. Web type-check attempts 9 and 10 passed, including final route/test changes. New
diagnostic files: remediation-property-photo-bindings.sql, remediation-property-save.test.ts,
remediation-property-edit-route.test.ts; new application helper lib/properties/save-property.ts. No
hosted writes, deployment, real users, or payment operations.

Remaining photo work: legacy property photos without trusted bindings require the upload owner to
reattach them before team members can refresh URLs. No blind backfill from mutable legacy arrays was
performed. Legacy root job-photo sharing still needs a trusted attachment mechanism, and
browser/device UX plus full migration-chain validation remain outstanding. F5 still reduces escrow
principal when referral credit lowers the card charge; gross principal, cash capture, platform
credit liability, fees, release, and refund accounting must be reconciled together. The funding
verifier added earlier currently verifies cash against escrow.amount and must be adapted with that
accounting change. Goal remains active and current changes are uncommitted.

9–10 September funding continuation (F4/F5/F6 partial): added CLI-generated
20260909142420_reserved_payment_funding.sql and PaymentFundingService. The reservation records gross
principal, payer cash, and platform credit separately. Credit debit and reservation are atomic;
job-row locking and an active-reservation index reuse one reservation across different request keys.
The Stripe create key now derives from that durable reservation. Escrow creation and reservation
attachment commit together, with escrow.amount retaining gross principal. The original
£500/£50-credit diagnostic now requires a £450 provider request and £500 escrow. Unknown provider/DB
outcomes retain the reservation for recovery instead of restoring credit from a catch block while
another retry may already have succeeded. Requests older than 23 hours fail closed for
reconciliation rather than reuse a potentially expired provider idempotency key.

Confirmation, pending-intent resume, webhook success, and pre-release funding verification now
resolve the cash requirement from trusted funding records when credit is applied. Provider credit
metadata without a matching attached reservation cannot authorize subsidy. Authenticated provider
success events can recover an escrow missing after a provider-success/DB-failure gap. Confirmed
cancellation events call an idempotent SQL transaction that restores credit once and cancels the
pending escrow/job payment status together. SQL verification caught an actual schema mismatch:
jobs.payment_status accepts 'canceled', not 'cancelled'; corrected the new transaction and legacy
cancellation webhook write. The original migration and updated function are applied only on the
disposable audit stack. Docker was restarted and subsequently recovered; no original local-stack
schema was changed.

Validation: remediation-payment-funding.sql passed actual PostgreSQL gross/cash/credit equality,
payer authorization, request reuse, provider-identity binding, duplicate cancellation restoration,
and injected-ledger-failure rollback. remediation-funding-race.py passed with two independent DB
connections, different request keys, one reservation and one £50 credit debit; generated records
were removed. Combined isolated checkpoint: 9 suites / 174 tests passed, including create/confirm,
release authorization, provider funding, webhook guards/recovery and web payment display.
remediation-funding-checkpoint.log records this run. Web type-check attempts 11, 12, and 13 passed;
attempt 13 includes the latest production changes. No live/test-provider payment was executed;
provider outcomes in these tests are synthetic mocks.

The web PaymentForm now uses returned cash for its Pay button, displays gross and applied credit,
rejects inconsistent breakdowns, and ignores obsolete async responses. Confirmation returns cash and
credit separately alongside gross escrow amount; payer emails explain applied credit. The mobile
skill was read and the mobile service/hook traced, but mobile code was not changed: the service
currently discards funding amounts and the hook still treats failed server confirmation as success.
Those are remaining repairs, not verified mobile behavior.

F5/F9 remain incomplete: partial/full refunds still need a durable operation ledger separating cash
returns, restored credits and remaining contractor principal. Existing credited payments without new
funding records require evidence-based reconciliation, not blind metadata backfill. Reservation
cancellation is integrated via provider events; abandoned intents, aged unknown outcomes,
completed/refunded reservation lifecycle, and customer-initiated cancellation/retry UX still need
recovery work. Fee/payout accounting must be tested through credited refunds and actual Stripe test
mode, including platform balance insufficiency. Full migration replay/db diff, remaining audit
findings, browser/device checks and broad final checks remain outstanding. These changes are
uncommitted; the active goal is not complete.

10 September mobile confirmation and refund authority continuation: usePayment now requires an
intent ID before invoking Stripe and an explicit success:true/status:held response from server
confirmation before showing Payment Successful. A card payment that succeeds while application
confirmation fails displays Payment Received / escrow confirmation pending; Check Status retries
application confirmation using the retained intent without another SDK confirmation. Changing a
payment method/resetting retry count no longer discards the intent. A synchronous in-flight guard
serializes double taps, completed escrow prevents another payment, and an epoch guard ignores
responses arriving after a different job/account/contractor or unmount. The mobile API wrapper was
traced: post<T> returns the parsed response body, matching the new status check.

The existing mobile tests explicitly expected success on failed server confirmation; those unsafe
expectations were replaced. 34 hook tests passed, including pending HTTP-success responses,
received-payment retry without duplicate SDK/create calls, double taps, method reset, and stale
navigation responses. Mobile type-check passed (remediation-mobile-typecheck-1.log). Added
run-isolated-mobile-tests.cjs, an audit-only Jest launcher that clears deployment variables from
root/web/mobile env files and uses synthetic configuration. Tests mock providers/native UI; no
emulator, device, real account, or payment-provider request was used.

Refund POST now validates the current designated payer (homeowner only when no designated payer
exists) and escrow.payer_id before checking/replaying idempotency results. A former payer cannot
retrieve a cached refund result, and current job authority alone cannot refund another account's
funding. The route checks resource ownership before returning a completed result but leaves
terminal-state handling after cache lookup so legitimate retries still work. Missing payer IDs fail
closed pending reconciliation. Relevant synthetic fixtures were updated to include recorded payer
identity; 92 refund/payment tests passed, including two new negative-authority regressions. Web
type-check attempt 14 passed after the final refund edits. Current changes remain uncommitted. No
deployment or hosted changes.

Still outstanding: credit-aware refund operation ledger, cumulative/refundable balances and
payout-versus-refund race protection; mobile cash/credit display parity; pending/abandoned payment
recovery across app restart; full SQL migration replay/db diff; other F1–F15 repairs and final
end-to-end verification. These tests do not establish full payment or launch readiness. Goal remains
active.

## 13 September: refund/payout exclusion, internal grants, and migration replay

Added `20260913191656_serialize_refund_and_transfer_claims.sql`. The escrow row lock now serializes
a refund claim against durable payout reservations. A refund cannot claim funds with an existing
transfer attempt, including an attempt with no returned provider ID. `reserve_escrow_transfer`
rejects `refund_pending` before returning or creating a reservation. The rollback SQL diagnostic
passed; the new `remediation-refund-transfer-race.py` passed both payout-first and refund-first
orderings using two actual database sessions and synthetic records.

Refund POST no longer unlocks escrow when a Stripe request throws after being started: a timeout
does not prove no refund occurred. Pending, requires-action, failed, or canceled provider refund
objects cannot close escrow, cancel the job, or return a success response. They retain the claim for
reconciliation and return an explicit non-success response, which existing callers already treat as
such. This is containment, not complete recovery: the credit-aware refund operation ledger,
cumulative partial balances, and durable refund reconciliation remain open. The route tests now use
the real API error classes instead of an incomplete mock that omitted ConflictError. 98
refund/payment tests passed.

Added `20260913192749_restrict_internal_database_surfaces.sql`. Source callers of application RPCs
use the privileged web server client; no direct mobile RPC caller was found. The injectable shared
conformal service has no application initializer. Policy expressions and catalog dependencies were
checked before revoking client EXECUTE on application SECURITY DEFINER routines. The seven predicate
names used by RLS or participant checks remain callable; extension routines and trigger-returning
functions are excluded. Service-role execution remains explicitly granted. The migration uses
ROUTINE to include the existing recalibration procedure as well as functions. All nine public
materialized views deny both table and column SELECT to PUBLIC/anon/authenticated; server analytics
retain SELECT.

`remediation-internal-grants.sql` verifies effective grants and actual denied calls to MFA mutation,
data export, legacy escrow release, and analytics reads. All 15 rollback-only remediation SQL
scripts passed after the grant change, including profile ownership, mobile session validation, bids,
contract signing, credits, private photos and property bindings, rework, and payment reservations.

Supabase CLI 2.116.0 replayed the complete current migration chain in its disposable shadow database
and ran `supabase db diff --local` against the isolated audit stack. Both the initial pass and the
pass including internal-grant restrictions completed with **No schema changes found**
(remediation-full-migration-diff-2.log is the latest). The original mintenance-clean database and
hosted projects were not changed.

Read-only security advisors now report no materialized-view exposure warnings. Two extension
findings remain: public PostGIS and RLS-disabled spatial_ref_sys. The isolated extension table is
owned by supabase_admin and grants clients writes; postgres is not its owner, not a supabase_admin
member, and has no grant option. Do not dismiss this as a harmless advisor warning or add an
owner-only migration that cannot execute. Restricting those extension-owned grants needs the
appropriate provider/owner authority; hosted extension privileges have not been rechecked. PostGIS
is non-relocatable in this installation. No owner escalation was attempted.

Application checkpoint: 18 affected web suites / 229 tests passed with dummy provider credentials;
the separately executed mocked job-lifecycle suite passed. Changed web/mobile TypeScript files (53)
passed ESLint with zero warnings; web type-check attempt 15 passed. These checks do not replace real
provider, browser or device journey validation. Remaining F1–F15 work keeps the remediation goal
active.

## 14 September: durable refund ledger foundation and corrected lint verification

The prior checkpoint was pushed to the existing GitHub branch as 3412038b5. The following work
continues the goal; it does not close F9 or establish launch readiness.

Added 20260914081119_durable_refund_balances.sql and RefundService.ts. Original cash and credit
funding, cumulative cash refunded, credit returned, and remaining principal are recorded separately.
Reservations bind payer/job/escrow, request key, amount and reason; different simultaneous
operations serialize on job/escrow locks. The chosen partial policy returns cash first and restores
unused promotional credit afterward, so credit cannot be converted into provider cash. Existing
transfer attempts or recorded accumulated contractor credits prevent reservation. Payout insertion
rejects amounts above the remaining principal and accounts awaiting refund reconciliation. Client
roles cannot read/write these internal tables or invoke their mutation RPCs; service-role table
access is SELECT only, with mutations performed by the trusted RPCs.

Finalization atomically updates refund counters, credit-wallet entries, escrow status, and
full-refund job cancellation. Pending/requires-action results keep the claim; failed or canceled
attempts consume no principal. Repeated finalization cannot restore credit twice. Late contradictory
bank outcomes freeze the account instead of silently making settled principal payable again,
including when a newer refund is already in flight. Provider identifiers are treated as opaque
strings rather than assuming one prefix.

The recovery service freezes Stripe parameters and its operation key, verifies original captured
funding and prior refund totals before creating a refund, finds an existing provider refund after a
lost response/write, follows bounded history pagination, and retrieves current provider state when
handling events. An old unknown attempt is not re-created after the safe idempotency window. Missing
status, mismatched metadata, amount/currency/payment IDs, or duplicate provider matches fail closed.
Credit-only returns never call Stripe refunds.create. Stripe's current refund documentation also
confirms pending/requires-action states and later bank failures: https://docs.stripe.com/refunds

Verification: 22 recovery-service tests passed with mocked providers; SQL reproduced 50000 minus
10000 = 40000 remaining, cash/credit allocation, replay, negative authority, terminal outcomes, and
payout caps. Injecting a job-write failure after credit return rolled back every accounting write.
Separate-session races proved one reservation and one deduction under competing requests and
duplicate finalizations. All 16 rollback-only database regressions passed after the final migration
revision. Full migration replay and supabase db diff --local found no schema changes against the
isolated audit stack (remediation-refund-migration-diff-2.log). No hosted database or real payment
was used.

IMPORTANT: RefundService is not yet called by the active refund route/webhook dispatcher. The
current route still has the original partial-principal defect. Next work must replace that route's
direct Stripe/DB updates, route provider events through the ledger, update payout/funding
verification and displayed remaining balances, give distinct user refund actions distinct persistent
keys, reconcile external/admin refunds, and serialize the accumulated-payout path. Do not interpret
component tests as an end-to-end refund fix.

Lint evidence correction: the root ESLint config ignores apps/\*\*, and the existing lint-staged
rule suppressed ignored-file warnings. Therefore the earlier claim that 53 application files passed
lint was too strong. .lintstagedrc.js now invokes each app's actual workspace configuration. Actual
npm-workspace lint passed on 33 affected web source files after fixing six warnings; the mobile
payment hook also passed its own workspace lint. Tests remain excluded by the existing workspace
lint configurations. This correction does not change the independently observed unit/SQL/type-check
results.

The real lint pass exposed a payment request key that remained tied to the first job. PaymentForm
now generates/captures its key in the request effect, binds it to the job, contractor and amount,
preserves it for StrictMode retries, avoids refetching for callback identity changes, and clears
stale payable state for invalid job input. Five component tests passed, including job/amount changes
and callback/StrictMode behavior. Removed unused dashboard KPI computation and destructured values
without changing visible data.

Mobile method loading now follows account changes, clears the previous account's methods, and
ignores stale asynchronous responses. It no longer stays loading forever when no user is signed in.
Server fee state is cleared when the job changes. 36 hook tests passed, including late
previous-account responses and login/logout transitions. Web type-check 19 and mobile type-check 2
passed. The combined refund/display check passed 27 tests. No device, browser payment hand-off, real
Stripe challenge, or provider refund was tested.

### 2026-09-14: accumulated payout and refund exclusion

Traced accumulateEarnings to its only active caller, EscrowAutoReleaseService, which claims
release_pending before crediting the weekly payout balance. The old credit_payout_balance RPC
neither locked escrow nor checked a concurrent refund, and a same-job retry silently accepted a
changed amount or recipient.

20260914132337_serialize_accumulated_payout_claims.sql now takes job then escrow locks, matching
refund reservation order. It validates the assigned contractor, GBP currency, release claim,
remaining principal, and absence of unresolved refunds or direct transfer attempts. Matching retries
remain exactly once; mismatched payloads fail. Direct transfer insertion and the legacy refund claim
trigger also reject an existing accumulated credit, including after a stale worker resets an escrow
to held. This protects the currently active legacy refund path as well as the new ledger foundation.
No application route was switched to the new ledger yet.

Verification: all 17 rollback-only SQL diagnostics passed against the disposable
mintenance-audit-20260906 stack. The new SQL covers refund-first and payout-first exclusion, both
direct/accumulated payout orderings, wrong recipient/currency, remaining-principal caps,
matching/changed retries, and the legacy refund claim. A separate-session diagnostic observed the
competitor waiting on a PostgreSQL Lock before committing the first transaction; refund-first and
credit-first both rejected the competing operation and preserved exactly one credit. Synthetic
fixtures were removed. No hosted data or payment provider was used.

The full refund route/webhook/remaining-balance integration, weekly provider payout recovery, fee
reconciliation, and actual provider test-mode journeys remain open. These database protections do
not establish an end-to-end working refund journey.

Final full migration replay and supabase db diff --local completed with no schema changes
(remediation-accumulated-payout-diff-final.log).

### 2026-09-14: refund webhook recovery connected

The signature-verified Stripe dispatcher now routes refund.created, refund.updated, and
refund.failed to current-provider-state reconciliation. Charge refund events first check the durable
refund ledger and bypass all legacy escrow/job/refund-table writes when that ledger applies. Bounded
provider pagination is exhausted before recording known operations; incomplete history,
provider/ledger disagreement, and DB failures propagate so the webhook service returns an error and
records failure. No webhook recovery path creates a provider refund.

External/unmarked active refunds on ledger-backed charges persist needs_review via a new
service-only RPC before failing for reconciliation. Further refund reservations, direct transfers,
and accumulated credits are blocked by that flag. The flag does not change cash, credit, or
remaining principal. Human reconciliation and an explicit resolution path remain required; this
change intentionally does not invent financial entries for external refunds. Legacy charges without
a ledger keep their existing handler and still need migration/reconciliation work.

Also reproduced and fixed a legacy recovery gap: after escrow finalization succeeded but the job
write failed, a replay skipped the job update because escrow was already refunded. Full-refund
replay now repairs the job payment status without repeating the escrow transition or terminal
notifications. A regression simulates a failed job write followed by successful replay.

Verification: 145 tests across eight refund/webhook files passed with mocked providers and DB
boundaries (refund-webhook-final-tests.log). Web type checking and the real web workspace lint
passed for the changed source. The rollback-only refund-review SQL proved service/client privileges,
idempotent flagging without principal changes, and exclusion of both payout modes and new refunds.
The full migration chain replayed; supabase db diff --local reported no changes against the isolated
audit stack (refund-webhook-db-diff.log). No provider request or hosted database write was made.

Still incomplete: the refund HTTP route does not yet reserve/finalize through the new ledger;
remaining-balance UI and payout fee consumers need wiring, and real test-mode provider outcomes,
external-refund resolution, notification durability, and weekly payout recovery remain unverified or
unfinished. The webhook tests are not proof of a complete refund journey. The overall remediation
goal stays open.

### 2026-09-14: active refund route and reported CI failures

The homeowner refund HTTP route now calls readRefundContext, reserveRefund, and recoverRefund after
current job/escrow payer checks, role checks, MFA, rate limiting, and anomaly detection. The
operation key binds actor, escrow and caller key. It uses the durable operation instead of the
ephemeral result cache or application-side Stripe/escrow/job writes. Omitted amounts use remaining
principal; retries retain the original operation amount after settlement. Invalid/excess amounts are
rejected, not silently capped or promoted to a full refund. Responses distinguish cash returned,
credit restored, remaining principal and pending/failed outcomes. An unknown provider outcome cannot
unlock the claim in a route catch block.

Route tests now assert authorization before operation reads, current/funding payer agreement, MFA,
payload binding, remaining principal, terminal-operation recovery, non-success outcomes, and refusal
to bypass rejected reservations. Real RefundService recovery tests and isolated SQL diagnostics
remain separate evidence for accounting; the route boundary mocks do not prove provider or database
behavior by themselves. Web/mobile per-action request-key persistence, displayed remaining balances
and partial-refund payout fee/funding consumers still need completion.

Reproduced all six failures from the user's CI output in escrow-lifecycle.test.ts. Four confirmation
fixtures omitted Stripe's metadata object and failed inside the cash-requirement helper before their
intended assertions. The two deep release fixtures omitted the new reserve_escrow_transfer RPC,
transfer-ID persistence, independent captured funding read, payer/payee IDs and expanded paid charge
evidence. Updated those synthetic fixtures and strengthened the expected sequence to CAS claim,
durable reservation, provider transfer, persistence, final escrow update. Kept actual funding
verification enabled and kept the finalization-failure reconciliation assertions. All 43 lifecycle
cases passed after the fixture correction.

A full local web coverage run then passed 3287 tests in 297 files, but failed the existing
per-directory coverage floors for release, confirmation, auto-release and webhook code
(refund-route-full-coverage.log). No threshold was lowered. Added tests for dispute/MFA/evidence
gates, failed/rejected approval persistence, lost transfer outcomes, accumulated payout failures,
customer lookup, saved-card persistence and provider account synchronization failures.

Those tests exposed two additional recovery defects: the second completion-photo check ran after job
confirmation but outside rollback handling; it now runs inside the escrow preparation try/catch so a
lost photo rolls back this request's confirmation. The setup-intent success handler now throws on a
customer lookup DB error rather than acknowledging the event as an unknown customer. The existing
unknown-customer behavior is preserved. Targeted verification passed 252 tests in eight files, web
type checking, and workspace lint for all changed application sources
(payment-depth-final-tests.log, payment-depth-types.log). A second full coverage run is recorded
separately below.

No production or hosted database was changed, and no real provider operation occurred. The original
remediation goal remains open; passing mocks/coverage is not a production readiness verdict or a
verified end-to-end refund/payout journey.

The second full coverage run passed: 3326 tests in 299 files, exit code 0, including all original
per-directory coverage thresholds (payment-depth-full-coverage.log). Afterward the customer lookup
was changed from single to maybeSingle to distinguish a zero-row lookup from a DB error; all 13
affected webhook tests passed again (setup-intent-lookup-final-tests.log). The full coverage run
preceded that equivalent lookup-contract adjustment; normal commit checks verify the final source
snapshot.

## 2026-09-15 — Browser refund retry and remaining-balance contract

The payment-history route now accepts an exact transaction UUID while retaining the authenticated
payer/payee predicate. It reads service-only refund balances only for those returned payment IDs;
ledger read failures fail the request rather than showing the original principal as refundable. The
response retains original amount and adds remainingAmount and refundNeedsReview.

Both browser refund forms use a browser-persisted, actor/escrow-scoped operation key and frozen
payload. Network, pending, and malformed success responses retain that identity. A confirmed
terminal response retires it; another action receives a fresh key. Persistence failure prevents
sending. Forms guard double submissions and restore unresolved request fields when reopened.
Transaction details now load older records by ID, use the API camelCase identities/dates, offer
refunds for held payments/current payers (or recovery of a saved action), display the available
amount, and update the remaining balance after confirmed success.

Eight request-helper regressions cover lost responses/module reload, changed-payload rejection,
new-action/account key separation, malformed/pending responses, and unavailable storage. Four
history boundary tests check actor/ID predicates, restricted ledger IDs, zero-row behavior, review
holds, and lookup failure. All 12 passed; all 43 reported escrow lifecycle tests also passed in the
paired targeted run (51 total). Web type checking and application workspace lint passed. These are
mocked route-boundary/browser-helper tests, not real-account browser journeys.

Remaining work includes the mobile refund consumer, payout behavior after partial refunds,
browser/device exercise, and other previously recorded audit findings. Existing invoice download
stubs and guessed fee/VAT detail displays were observed and remain open; this checkpoint does not
claim the whole payment UI or public launch readiness. No schema changes, hosted writes, or real
provider operations were performed in this checkpoint.

Full web coverage passed with unchanged thresholds (exit 0; refund-client-full-coverage.log). Final
type checking passed (refund-client-types.log), and final five-source workspace lint passed. The
detail-form maximum/status presentation received a small follow-up adjustment during the full run;
final type/lint and normal commit hooks check that final snapshot.

## 2026-09-15 — Atomic remaining-principal release claim (integration pending)

Inspection confirmed both manual and automatic release still calculate fees on original escrow
amount, and EscrowFundingService rejects any refunded charge. Accepting refunded charges alone would
be unsafe: an old payout can be below the new gross balance yet exceed the correctly fee-adjusted
payout. This remains an open defect until both callers and funding verification use the refund
ledger consistently.

Added service-only claim_escrow_release(uuid,text,uuid), locking job then escrow in the refund lock
order. It checks completed work/current contractor, held state, review/in-flight refund holds and
positive remaining principal, then claims release and returns that principal from the same
transaction. Original escrow amount stays unchanged. This function is not called by the application
yet; no end-to-end payout fix is claimed by this database checkpoint.

Applied migration 20260914234544 only to supabase_db_mintenance-audit-20260906.
remediation-remaining-release-claim.sql passed with all fixtures rolled back: £500 original / £100
refund / £400 claim; duplicate claim exclusion; refund exclusion; unfinished-job and review-hold
rejection; anon/authenticated execution privileges absent. Initial test incorrectly skipped job
lifecycle transitions and was corrected to follow posted -> assigned -> in_progress -> completed; no
production controls were weakened.

remediation-remaining-release-race.py passed with random synthetic fixtures and cleanup. It observed
pg_stat_activity Lock waits before committing the first transaction: a refund plus valid job
completion committed before a waiting release, which returned 40000 minor units; a release blocked a
competing refund and a second release. Refund reservation itself disallows completed jobs, so the
first scenario performs valid completion after the refund inside the first transaction.

Required npx supabase db diff --local using isolated-stack completed exit 0, full shadow replay, no
schema changes (remaining-release-claim-diff.log). No original local or hosted database changes,
provider calls, real accounts, or deployment. Next required work is application integration and
provider/ledger reconciliation tests; the overall remediation goal remains active.

## 2026-09-15 — Release callers integrated with remaining principal

Manual release and EscrowAutoReleaseService now call claim_escrow_release instead of separately
updating held -> release_pending. Fees are calculated after the claim on its remaining_minor, which
is also passed to fee-record creation in direct and accumulated payout modes. Original escrow amount
stays intact for historical principal. Losing the claim still prevents provider work.

EscrowFundingService now accepts a refunded charge only when the internal committed refund balance
matches original gross/cash/credit, cumulative provider cash refunds, returned credits, and positive
remaining principal. Missing/error/review-held/inconsistent balances and unaccounted provider
refunds still fail. An attached funding reservation remains necessary for promotional credit. Fully
returned principal fails; cash fully refunded with some unreturned promotional credit is separately
tested.

The targeted lifecycle/automatic-release/funding run passed 93 tests in three files
(remaining-release-integration-tests.log). Its manual partial-refund case runs the real fee and
funding helpers: £250 captured, £50 reconciled refund, £200 release basis, £176 contractor payout;
fee-record input is £200. Both automatic modes assert the claimed remainder reaches fee calculation,
fee tracking and payout/accumulation. Existing ordering/finalization failure tests now instrument
the claim RPC rather than the removed direct UPDATE. Real lock/authorization invariants remain
covered by the SQL and concurrent diagnostic recorded above, not by these mock RPC responses.

A subsequent focused funding run passed 27 tests including all-cash-refunded/unreturned-credit and
zero-remaining cases (remaining-release-credit-tests.log). Web type checking and three changed
application-source lint passed. Processing costs remain estimates, not provider-settled fees; that
existing accounting limitation is not resolved here. No provider test-mode or browser journey was
exercised in this checkpoint, and overall remediation is still incomplete.

The first full integration coverage run had one stale payment-flow fixture that rejected the new
claim RPC (3347 passed / one failed). Updated that fixture; its 72-test suite passed. Final full
coverage is recorded separately below. During review, a further existing edge case was confirmed:
FeeCalculationService's minimum platform fee can exhaust a very small post-refund remainder,
returning zero contractor payout; both direct and accumulated reservation functions reject zero.
This requires explicit zero-payout settlement/accounting handling and remains open. Processing fee
estimates likewise remain an accounting limitation. Do not treat this checkpoint as all F9 or all
payment journeys complete.

Final full coverage passed exit 0: 3348 tests in 301 files, unchanged thresholds
(remaining-release-full-coverage-final.log). The new claim migration must be applied before these
application callers are deployed; only the isolated audit database has received it here.

## 2026-09-15 — Explicit fee-only settlement for tiny remainders

FeeCalculationService now caps the platform fee at available principal, preventing the minimum fee
from allocating more money than remains. Manual and automatic release (both payout modes) use
FeeOnlySettlementService when contractor payout is zero. It verifies captured/credit funding, then
calls a service-only atomic settlement function. The response explicitly has transferId:null,
settlementType:fee_only, and a separate settlement ID; no fictitious Stripe transfer is created.

Migration 20260915080346 adds escrow_fee_only_settlements and settle_fee_only_escrow. Under job then
escrow locks, it validates completed work, the release claim, current participants, no prior direct
or accumulated payout, and an exact remaining principal between 1 and 50 minor units. It atomically
records the fee, zero payout, terminal escrow/job payment state, actor-role audit record, and two
in-app notifications explaining that no contractor payout is due. A trigger rejects stale attempts
to reopen a settled escrow. Manual retries read the settlement only after MFA/role/participant
gates, so a lost response does not become a second payout or expose another user's record.

remediation-fee-only-settlement.sql passed against only the disposable audit database with complete
rollback. It exercises changed amount/unrelated actor rejection, direct and accumulated payout
exclusion, actor-role retention, replay without duplicate audit/notifications, absent transfer ID,
blocked reopening, and an injected notification failure rolling back all accounting changes.
remediation-fee-only-race.py passed with observed pg_stat_activity Lock waits: concurrent settlement
produces one record/audit and two notifications; a waiting stale status reset is rejected. Its first
cleanup failed on the retained audit actor FK; the two identified synthetic users/audit row were
removed and cleanup was corrected before the successful rerun. No fixtures from that run remain.

Targeted verification passed 112 tests in four files (fee-only-targeted-final.log), including real
manual fee calculation/funding verification, both automatic modes, response-loss recovery,
unrelated-user denial, fee conservation, and service failures. Web type checking and application
workspace lint passed. Required isolated npx supabase db diff --local completed exit 0 with full
shadow replay and no schema drift (fee-only-schema-diff.log). The temporary approval-review quota
rejection was resolved before these final database checks; it was not bypassed.

No hosted/original-local database or real provider was modified. The new migration is required
before deploying these callers. Overall F1-F15 remediation and real-account/provider/browser
verification remain incomplete; existing fee-reporting/processing-cost estimates and other recorded
items are not claimed fixed by this settlement checkpoint.

The full web log reports 3369 passing tests in 302 files and a completed coverage table, with no
reported threshold failures (fee-only-full-coverage.log). After continuation the process handle was
unavailable, so its exit code could not be recovered; this is not recorded as an observed exit-0
result. Normal commit hooks validate the final source snapshot separately.

## 2026-09-15 — Close direct contract UPDATE signature bypass (F2)

Current local ACL/RLS/trigger inspection showed broad authenticated UPDATE column grants on bids,
contracts and escrow. Escrow UPDATE is already constrained by admin-only RLS, and bids have the
pending-owner/immutable-accepted-amount trigger. These broad grants alone were not reported as
ordinary-user escrow exploits. Contracts still allowed participant UPDATE, and the freeze trigger
only checks prior signatures/evidence. A rollback-only authenticated-homeowner reproduction changed
both signature timestamps and status to accepted on an unsigned contract with zero evidence rows.
This was reproduced only on the disposable database, not on hosted production.

Migration 20260915134801 revokes direct UPDATE (table and all column grants) and DELETE on contracts
and escrow_transactions from PUBLIC/anon/authenticated. Service-role authority remains. Source
tracing found contract mutations in server routes using serverSupabase; escrow writers are server
services/routes or administrative reconciliation scripts, while mobile escrow access is read-only.
Thus the change routes mutations through existing server authorization/MFA/audit checks, including
for authenticated administrators. Existing SELECT and pending-bid flows remain unchanged.

remediation-financial-client-updates.sql passed: homeowner, contractor, unrelated-user, and admin
client sessions cannot forge signatures/accepted state, alter funded escrow, or delete these rows.
No residual anon/authenticated UPDATE column grants remain. Trusted service edits still work, and
sign_contract_atomic creates both evidence rows and transitions pending_contractor ->
pending_homeowner -> accepted. All 21 remediation SQL scripts passed against the updated disposable
schema (financial-client-updates-sql-suite.log). No application code changed in this checkpoint.

A separate open server-side retention race was identified while tracing callers: the contract DELETE
route checks signing state then deletes only by ID/contractor, allowing concurrent signing to race
deletion. The account-deletion DB function also deletes contract rows. These need coordinated
retention/recovery work; do not infer signed-record deletion safety from the client-grant repair. No
original-local or hosted database was changed. The overall goal remains active.

Required isolated supabase db diff --local completed exit 0 after full migration replay, with no
schema drift (financial-client-updates-diff.log).

### 2026-09-15 — Proposed retention policy following owner instruction

The owner confirmed there is no existing retention policy and authorised drafting one. Added
`DATA-RETENTION-POLICY-DRAFT.md`, grounded in ICO storage-limitation/erasure guidance, GOV.UK
accounting-record guidance and the Limitation Act. It specifies proposed category-specific periods,
restricted access after account closure, scoped reviewable holds, backup disposal and implementation
acceptance criteria. Legal/accounting review and technical enforcement are outstanding; this is not
a claim of compliance or completed account-erasure remediation. No application behavior or database
state changed in this checkpoint. The empty atomic co-sign/delete migration remains work in progress
and is excluded from this documentation commit.

### 2026-09-15 — Atomic contract co-signing and unsigned deletion

Replaced separate signatory/status updates in `sign-as-cosigner/route.ts` with service-only
`sign_contract_cosigner_atomic`. It locks the parent contract, rechecks invitation membership on
every retry, records a restricted snapshot for new assent, and atomically promotes acceptance plus
inserts both in-app notifications. Cancelled contracts cannot be resurrected. Legacy duplicate
invitations for the same account are resolved together; pre-existing timestamps do not receive
fabricated historical snapshots. The route no longer returns a cached result before checking current
membership.

`delete/route.ts` now invokes `delete_unsigned_contract_atomic`, locking the same row as
primary/co-signing and refusing deletion once any party has signed or evidence exists. The job UI
hides deletion after contractor signature as well as homeowner signature. This is a deliberate
retention-preserving restriction: cancelling/withdrawing a signed version must use a separate
retained-record workflow, not hard deletion. The broader account-deletion routine still needs
retention remediation; this change does not protect every privileged cascade.

The invitation insertion trigger takes the parent lock, rejects terminal contracts, prefilled
signatures and duplicate invitations. Client-role table and column INSERT/UPDATE/DELETE privileges
on signatories are revoked. Server invitation errors now explain conflicts rather than returning
generic 500 errors. Co-sign APIs exist, but current source search found no UI caller of the co-sign
endpoint and no import of the invitation dialog; this is not a verified user-facing co-sign journey.
Non-platform invitation delivery/redemption remains unimplemented.

Evidence: migration applied only to `supabase_db_mintenance-audit-20260906`;
`remediation-contract-cosign.sql` passed with transaction rollback (client denial, uninvited
administrator denial, atomic notification-failure rollback, replay counts, signed deletion
rejection, terminal invitation/sign rejection and unsigned deletion). One initial test fixture
reused a job despite the one-contract-per-job constraint; corrected to a separate synthetic job,
then passed. `remediation-contract-cosign-race.py` passed both signing/deletion orders, final
primary signing versus invitation, concurrent retry and concurrent final co-sign acceptance while
observing actual PostgreSQL Lock waits; fixtures cleaned in finally. All 22 remediation SQL scripts
passed. Full isolated `supabase db diff --local` completed exit 0 with no schema changes. Targeted
Vitest: 37 tests / 2 files passed; route-boundary tests explicitly mock the wrapper and do not claim
authentication or database isolation proof. Production route ESLint passed. Full coverage result
recorded below when complete.

Full isolated web coverage completed exit 0: **3,389 tests / 303 files passed**, duration 154.31s,
unchanged coverage thresholds (`contract-cosign-full-coverage.log`). Changed production routes and
the contract UI hook passed workspace ESLint with zero warnings. No live providers, hosted
databases, real accounts or deployments were used.

### 2026-09-15 — Retain signed evidence before account-deletion cascades

Reproduced `delete_user_data` deleting a synthetic cancelled signed contract and both primary
acceptance records: the transaction succeeded with zero contracts and zero acceptance rows
remaining. This is distinct from the newer funding/payout foreign keys that can block deletion of
other accounts. Source inspection also confirms the route snapshots subscription IDs only in request
memory before deleting their source rows; durable billing/auth cleanup remains outstanding.

Added `retained_contract_records` and a BEFORE DELETE trigger on contracts. The restricted archive
captures the contract, original primary/co-signer evidence, signature images, signed signatory
identities and minimal party names before cascading deletion. It has no foreign keys back to the
deleted account/job, cannot be read or modified by client roles, and cannot be overwritten/deleted
by ordinary service-role table access. Archive insertion failure aborts deletion in the same
transaction. Unsigned drafts (including legacy NULL status) are not archived. Previously lost
evidence is not reconstructed.

Added a service-only participant reader and authenticated `GET /api/contracts/[id]/retained`. Every
read checks a current non-deleted profile plus archived participation; unrelated administrators get
no override. The response selects agreement fields and signature timestamps, excludes raw
IP/user-agent/signature payloads, and sets private/no-store caching. Raw retained evidence remains
server-only. This endpoint has no archive navigation page or list yet; it is not a completed
ordinary-user archive journey or a verified former-user identity/export process.

Retention is explicitly marked for classification/review in 30 days; no unsupported fiscal-year or
universal six-year expiry is invented. A review/disposal worker, scoped holds and operational
ownership still need implementation. This checkpoint preserves signed evidence; it does not solve
payment-record retention, deletion/provider recovery, referenced storage-object preservation,
historical backups, or the complete policy implementation. The full goal remains active.

Validation: `remediation-contract-retention.sql` proves original acceptance JSON survives exactly,
an injected archive-write failure rolls back deletion, the deleted owner profile is removed, the
surviving party can read the redacted view, deleted/unrelated/admin readers are denied, and direct
client/archive mutations are denied. All 23 rollback SQL diagnostics and all 10 concurrency
diagnostics passed on the isolated stack. Six race cleanup queries now also remove their
specifically identified synthetic archives; an explicit count confirmed zero archive rows remain.
The new viewer/atomic route boundary suite passed 28 tests, and viewer production ESLint passed.
Initial isolated migration replay completed exit 0/no drift; final replay after the NULL-status
minimisation correction is recorded below on completion. No live provider, hosted data or deployment
actions were taken.

Final isolated migration replay after the minimisation correction completed exit 0 with no schema
changes (`contract-retention-db-diff-final.log`).

Follow-up customer-copy correction: the deletion modal previously promised removal of all associated
data, explicitly including payment history. The modal and both settings confirmations now disclose
restricted signed-contract retention; the success response also makes that exception clear. Removed
two unused imports and an unused prop binding found by the changed-file lint check. These are
copy/import changes; archive navigation and full deletion recovery are still outstanding.

### 2026-09-15 — Durable account-deletion provider cleanup

Replaced the request-memory subscription snapshot and one-shot provider calls in
`/api/user/delete-account` with `delete_account_with_recovery`. The database transaction freezes
subscription/auth cleanup identifiers in internal tables and calls the existing eligible-data
deletion routine. A data failure rolls back both the journal and deletion; a lost success response
leaves recovery work accessible after profile-linked subscription rows disappear. The existing
active-work/payment/dispute preflight is preserved.

The service-only cleanup worker claims individual immutable-resource steps with SKIP LOCKED,
two-minute leases and random fencing tokens. Provider outcomes are acknowledged only under a current
lease. Retryable failures back off; ambiguous provider ownership becomes `needs_review` and does not
cancel an unrelated subscription. Provider-confirmed cancellation/missing records can reconcile a
successful side effect after a lost database acknowledgement. The worker verifies Stripe
subscription IDs and all present owner metadata keys used by the actual contractor, homeowner and
Home Health creators before cancellation. It validates cancellation status and Auth deletion
responses instead of treating any HTTP success/error as confirmation. An authenticated cron route
and five-minute repository schedule use the same bounded worker; scheduling has not been deployed or
verified on the hosting plan.

Prerequisite found while tracing cancellation: homeowner_subscriptions had authenticated owner
INSERT/UPDATE policies plus column grants permitting edits to provider identifiers and paid
entitlements. Revoked client table/column INSERT/UPDATE/DELETE on both subscription mirrors; actual
server persistence/webhook writers remain supported. Real SQL tests now reject direct owner
replacement/insertion of another subscription ID. The metadata guard also accounts for references
persisted before grant revocation. Other subscription mutation consumers still need review for
legacy substituted references and their own partial-failure semantics; this checkpoint does not
claim every subscription flow fixed.

The API returns 200/success only when all durable cleanup steps are completed. Pending/review work
returns 202 with success=false and a request reference. All three web callers distinguish the
response and show a pending notice before returning to login; mobile validates the response, shows
an appropriate alert and disables automatic retries for this destructive request. Web/mobile
deletion copy no longer claims every associated record is immediately erased. The best-effort Redis
blacklist call, which can swallow errors and do nothing without Redis, is no longer used as evidence
of successful credential removal. Actual auth-provider removal remains pending until explicitly
confirmed.

Evidence so far: rollback SQL diagnostic validates atomic snapshot/deletion rollback, frozen
provider targets surviving source erasure, replay, client grant denial, lease replacement/stale
acknowledgement denial, backoff and manual-review exclusion. The concurrent diagnostic observed the
profile-row lock: duplicate erasure produced one operation, and concurrent workers claimed different
steps. All 24 remediation SQL diagnostics passed. Targeted web recovery/route/response tests: 25
passed; mobile response tests: 6 passed. Both web and mobile type checks passed. Changed web source
ESLint passed after removing six unused catch bindings already present in the contractor settings
file. Isolated migration replay completed exit 0 with no schema changes. Stripe/Auth behavior here
uses mocks plus the real local database journal, not a real provider trial. Device, hosted cron and
full session-revocation behavior are unverified.

Still outstanding: retained financial records, full erasure/storage coverage, atomic
marketplace-state exclusion during deletion, operator review/requeue and retention/disposal of
cleanup journals, former-user status/export access after a lost response, archive navigation, and
the previously documented F1–F15 gaps. This is a recoverable provider-cleanup implementation, not a
completed privacy/readiness claim.

Full isolated web coverage completed exit 0: **3,422 tests / 305 files passed**, duration 162.74s,
unchanged thresholds (`account-deletion-full-coverage.log`). Web/mobile type checks passed
separately. No emulator/device, real Stripe/Auth provider operation or deployed cron was exercised.

The first commit attempt was rejected by the existing 500-line source-file hook: contractor settings
page was 737 lines. Extracted its state/actions into `useContractorSettingsData.ts` and kept the
view separately, with no hook bypass. The split exposed pre-existing password-change and
notification-save handlers that only show success toasts without requests; these remain an explicit
follow-up before public use. Added a real hook-level HTTP 202 regression to verify the pending
notice and absence of a success toast.

Final settings-split coverage: 3,423 tests / 306 files passed, 155.66s. A subsequent real isolated
Auth diagnostic exposed successful DELETE returning no user identity. Recovery now verifies
user_not_found with a fresh admin lookup before acknowledging an empty response; ambiguous lookup
failures retry. The added regression covers absent, still-present and provider-error results.
Post-correction targeted suite: 27 tests passed. See account-deletion-auth-final.log for the local
Auth result; hosted Auth and Stripe remain untested.

### 2026-09-15 — Contractor notification form contract

Replaced the active contractor no-request notification handler and incompatible
emailJobs/smsJobs/pushJobs state with the shared canonical preference form. Traced the singular API
through actor-scoped user_notification_preferences storage to
NotificationService/NotificationPreferenceResolver. Fixed missing CSRF on save, schema validation of
GET/PATCH responses, failed-load default overwrite risk, retry loading, and protected payment-event
mute controls. Failed saves preserve edits. Removed the exposed email toggle from this shared form
because repository-wide consumer inspection found email_enabled is loaded but not consulted by the
actual senders; copy explicitly limits controls to supported push/in-app delivery. SMS/category
matrix behavior was never persisted by the replaced contractor handler. Full email/SMS preference
enforcement and noncanonical notification writers remain outstanding; this is not a claim that every
sender respects preferences.

React checklist reviewed: effect cleanup prevents late updates after unmount, inputs retain labels,
retry has an alert, and save failures preserve local values. Four targeted tests passed across the
form and existing contractor deletion hook: failed load/retry, actual CSRF helper and payload,
provider failure/edit preservation, protected-type filtering, malformed success response and
confirmed-save success. Web typecheck passed. No real user notification was sent. The contractor
password-change fake success handler remains a separate required fix.

### 2026-09-15 — MFA settings and disable recovery

Replaced the contractor local-only two-factor toggle with a link to the implemented MFA settings
flow. The destination used data.csrfToken while /api/csrf returns token; its three mutations now use
the shared CSRF fetch helper. Failed/malformed status reads show an unavailable state with retry
instead of falsely displaying Disabled. Mutation responses require success=true; enrollment checks
its response shape before presenting the QR image and recovery codes. Failed code verification
preserves input.

Following disable through the service exposed a second error: disableMFA ignored Supabase RPC
errors. The actual local disable_user_mfa function targeted public.users, whose view omits
mfa_enabled and the other MFA columns. A synthetic local call reproduced undefined_column.
CLI-generated migration 20260915152316_repair_mfa_disable_profile_target.sql targets profiles,
preserves transactional removal of backup/trusted/pending records, fails on a missing account and
explicitly restricts EXECUTE to service_role. The service now propagates RPC failures; status
counter reads also fail instead of substituting misleading zeroes on database errors.

Real rollback SQL diagnostic passed: direct authenticated RPC denied, injected backup cleanup
failure rolls back the profile change, successful disable removes credentials/recovery data, missing
profile rejected. Web typecheck and changed-source ESLint passed. Target run: 36 tests / 4 files
passed. Evidence caveat: the tests in the existing mfa-service.test.ts define a substitute service
inside the test rather than import production behavior; they do NOT verify production MFA. The new
client and service boundary tests plus real SQL supply the relevant evidence for this checkpoint.
Full TOTP enrollment/login/device enforcement, enrollment concurrency, MFA disable password identity
binding and contractor password change still need completion; this checkpoint does not establish MFA
journey readiness.

### 2026-09-15 — Serialize web-session revocation with refresh issuance

Password-change tracing identified a prerequisite: createTokenPair inserts a replacement refresh
token after rotate_refresh_token finishes its transaction. Existing revokeAllTokens only updated
currently visible rows and ignored PostgREST errors, while AuthManager.logout swallowed failures and
could skip cookie clearing. A rollback reproduction inserted an unrevoked refresh token from a
session started before profiles.tokens_revoked_at; one stale token was accepted.

CLI-generated migration 20260915152927_serialize_web_session_revocation.sql adds a service-only
atomic cutoff/refresh-token revocation function and a BEFORE INSERT guard. Both lock the account
profile. A late rotation retaining its original session_started_at is rejected after revocation; a
token inserted first is included in subsequent revocation. Existing pre-MFA sessions are deleted in
the same transaction. Fresh login sessions remain allowed. revokeAllTokens now calls the RPC and
throws on a database failure; AuthManager.logout clears local cookies in finally while propagating
unsuccessful server revocation. The logout route still has its redundant cutoff update; this
checkpoint does not claim Supabase bearer sessions or concurrent pre-MFA issuance are fully revoked.

Evidence: real rollback diagnostic covers atomic failure rollback, client RPC denial, stale
insertion denial and fresh login acceptance. Two-connection diagnostic observed actual lock waits in
both orderings and left zero unrevoked fixture tokens. Target auth/auth-manager/API suite: 53 tests
/ 3 files passed; corrected the existing auth test RPC mock to reference the actual mock consumed by
the imported implementation. Web typecheck and changed-source lint passed. Isolated db diff
completed exit 0 with no schema changes. Prior MFA migration replay also completed exit 0/no drift
(mfa-disable-db-diff.log).

Still required for password changes: authenticated current-password verification bound to the actor,
conditional fresh MFA verification, provider mutation and durable revocation/recovery across custom
cookies and Supabase sessions, truthful failed/uncertain outcomes, and wiring both web settings
callers. Current contractor no-request password handler remains open until those controls are
implemented and exercised.

### 2026-09-15 — Mobile refreshed-session revocation

The previous web revocation checkpoint completed full coverage after commit: 3,432 tests / 309 files
passed, exit 0, 163.84s (session-revocation-full-coverage.log).

A real SQL reproduction found verified_mobile_session_context accepted an Auth session created an
hour before the revocation cutoff when the supplied verified JWT was newly refreshed. The function
compared only JWT iat with the cutoff. CLI-generated migration
20260915153939_bind_mobile_revocation_to_session_creation.sql additionally binds authorization to
auth.sessions.created_at and excludes soft-deleted profiles. JWT second precision is handled
separately from the full-resolution session creation time so a genuinely new login in the same
second as revocation is accepted. Existing ownership, expiry and database-role checks remain.

The new rollback SQL diagnostic passes for refreshed old-session rejection, same-second fresh login,
and soft-deleted account denial. The original mobile session SQL diagnostic also passes. Existing
production bearer verifier tests: 4 passed. An actual local Auth/REST diagnostic creates a synthetic
account, signs in, validates its identity, invokes the service-only session lookup, revokes web
sessions, refreshes the original Supabase session and checks access again. Both the original and
refreshed bearer contexts are rejected, and a fresh password login succeeds. Cleanup removes the
synthetic Auth user, including sessions. No credentials, tokens or real account data are printed.

Scope limit: Supabase itself still issues refreshed credentials for the old Auth session; this
repair protects routes using verifySupabaseBearer/verified_mobile_session_context. It does not by
itself revoke direct PostgREST/storage JWT access, nor complete password-change/provider-session
recovery. Those remain required work. Migration replay result is recorded on completion.

Mobile revocation migration replay completed exit 0 with no schema changes
(mobile-revocation-db-diff.log).

### 2026-09-15 — MFA disable password identity and temporary sessions

The MFA disable route previously treated any successful signInWithPassword result for the request
email as proof for user.id, without comparing the returned Auth identity. It also retained the newly
created provider session. It now requires a matching Auth user ID and a returned session; any
temporary session is signed out with scope=local before the MFA mutation, including mismatched
identities. A cleanup failure prevents the mutation. Invalid JSON and oversized password bodies are
rejected before provider calls, and the existing user-based rate limiter now explicitly uses auth
criticality so production fallback is fail-closed. MFA client errors now display structured API
error messages rather than [object Object].

Twelve targeted route/client/service tests passed, including mismatched identities, absent sessions,
credential errors, cleanup failure, rate denial, malformed bodies and database mutation failure. Web
typecheck and changed-source lint passed. An actual local Auth diagnostic created two sessions,
confirmed reauthentication identity, revoked only the temporary session, rejected its refresh and
successfully refreshed the pre-existing session. Synthetic cleanup completed; no real account or
email delivery was used. This verifies the new temporary-session behavior, not a full MFA
enrollment/login journey.

Password-provider probe (isolated-stack/probe-password-sessions.py, ignored diagnostic scratch): a
real local admin password update removed existing Auth sessions, old refresh and old password
returned HTTP 400, and the new password returned HTTP 200. This helps choose the next
password-change implementation; it is not yet wired to the contractor form.

GitHub checkpoint: after explicit repository/source authorization, all five prior commits were
pushed to Mintenance-LTD/mintenance, codex/migrate-next-proxy, and ls-remote confirmed
e55651171ce3a75ce211b1b4cf68ae47c0bc7254.

### 2026-09-15 — Real password change with durable web-session cleanup

Added authenticated POST /api/auth/change-password. It uses a fresh provider identity for the
authenticated actor, verifies the current password against that identity, removes the temporary
local-scope Auth session and requires a fresh TOTP/backup code when MFA is enabled. It validates
password strength and breached-password status, rejects arbitrary actor fields, and enforces
per-account and per-IP auth-critical rate budgets. Neither password nor provider token is stored in
the recovery journal or returned.

CLI migration 20260915155133_durable_password_change_revocation.sql adds internal operation records
and service-only begin/finish/recovery functions. Begin locks the account and compares its
revocation cutoff with the pre-verification snapshot, rejecting stale concurrent verification. It
records durable cleanup and revokes existing custom web sessions before the provider update.
Confirmed provider updates are followed by a second atomic revocation to catch intermediate
login/refresh races; completion and revocation commit together. Failed acknowledgement leaves work
queued. Unknown provider outcomes are not automatically replayed; delayed cleanup is eligible after
two minutes and a five-minute cron recovers it without retaining passwords. Completed cleanup replay
does not invalidate later logins. The schedule is repository configuration, not deployed/verified
hosting behavior; journal retention/disposal remains part of the open retention work.

Both active web settings paths now use the shared server client. The contractor handler no longer
shows a success toast without a request, and the homeowner helper no longer mutates only the browser
Supabase session. The shared client sends CSRF, prompts for MFA only when the server requires it,
preserves caller inputs on failure and distinguishes 200 completed from 202 pending. Both outcomes
explain sign-in requirements; an ambiguous provider result advises trying the new password or reset
without claiming success. The reset-email route and direct mobile/provider password updates remain
separate surfaces requiring equivalent custom-session handling.

Evidence: rollback SQL passed for direct-client denial, stale proof rejection, failed final
acknowledgement with retained pending work, recovery of an intervening token, and completed replay
preserving a fresh login. A real two-connection lock test proved concurrent begin calls cannot both
use the same verification snapshot. Actual local Auth/REST sequence passed current-password
verification, scoped temporary logout, durable begin, password update, durable finish, old
password/refresh rejection and new-password login. Final targeted client/route/contractor-hook run:
14 tests passed; web typecheck and changed-source ESLint passed. Isolated migration replay completed
exit 0/no drift. Full coverage result follows after completion; no browser/emulator or hosted cron
was exercised.

### 2026-09-15 — Web session-start cutoff verification

Password-change checkpoint full coverage completed exit 0: 3,453 tests / 312 files passed, 173.15s
(password-change-full-coverage.log).

Production JWT signing includes sessionStart in milliseconds and preserves it during token rotation.
verifyToken previously compared the database cutoff only with second-resolution JWT iat. Two new
tests using the real signing/verifying functions reproduced both problems: a genuine login after a
cutoff within the same second was rejected, while a newly issued access token retaining an older
revoked sessionStart was accepted. The verifier now compares the signed sessionStart, rejects
impossible/malformed start times and missing/invalid issuance claims, and retains a conservative iat
fallback for legacy tokens without that claim. Invalid cutoff data also fails closed. No unsigned
token metadata is used.

Both reproduction cases now pass, together with future-start rejection and legacy cutoff tests.
Auth/library/manager/API target run: 57 tests passed. Web typecheck and source lint passed. The
database boundary remains independently enforced by the already validated refresh insertion trigger
and mobile session-creation guard; no schema changed in this checkpoint. A full web run is being
observed separately. Browser/device login and password-reset completion still remain unverified.

### 2026-09-15 — original F15 real isolation suite and strict fixture cleanup

- Full web coverage at `987087919`: **3,457 tests / 312 files passed**
  (`web-session-boundary-full-coverage.log`). This does not include the separately configured real
  database suites.
- Ran the original `apps/web/__tests__/integration-real/cross-user-isolation.integration.test.ts`
  against the disposable API on port 55321, using five synthetic Auth accounts and the real REST/RLS
  implementation, with `vitest.integration.config.ts` (no mock setup). Four tests passed. This
  exercises properties, jobs/discovery/assignment, messages, contractor documents, tenant
  report/token isolation and administrator access; it is not a browser journey test.
- Post-run counts exposed a fixture defect: one synthetic contractor survived because
  `job_audit_log_changed_by_fkey` blocked profile deletion and cleanup ignored errors. Reproduced
  the constraint failure inside a rolled-back transaction. The fixture now removes only its
  synthetic actor's audit rows, checks profile/Auth/job cleanup errors and verifies Auth user
  absence. Removed the exact leftover fixture from the disposable stack.
- Strengthened negative read checks to require error-free queries, added positive owner
  message/document reads, required the forged property insert to fail with SQLSTATE 42501, and
  checked the foreign property remained unchanged.
- Final real suite: **4/4 passed**, 4.67 seconds (`original-isolation-strengthened.log`); web
  TypeScript check passed. Post-run database counts: **0 recent synthetic accounts, 0 jobs, 0
  properties**. No hosted database or production data touched.
- Added ignored diagnostic launcher `isolated-stack/run-original-isolation.cjs`; it captures local
  stack credentials in memory, asserts the exact disposable API URL and clears deployment
  environment values. No credentials logged. Existing unrelated worktree tsconfig parsing warnings
  remain in Vitest output.
- Remaining: other real database suites, full browser/device journeys and external payment-provider
  recovery still require their own evidence. This checkpoint does not establish public readiness.

### 2026-09-15 — F15 financial/job/review assertion repair and real REST validation

- Removed the remaining unsupported mutation `.select(..., {count, head})` assertions from
  `__tests__/integration-real`: escrow, payments, jobs and contract/review tests. Job/review RLS
  denial now requires a successful query with an empty returned row array; financial mutation denial
  requires SQLSTATE 42501. Existing and added persisted-state checks confirm blocked operations did
  not change or delete records.
- Expanded real escrow mutation coverage to payer, payee and unrelated actors (UPDATE and DELETE);
  exact INSERT denial also asserted. **9 escrow tests passed**, 3.04 seconds
  (`escrow-isolation-final.log`).
- Real job/payment suites: **22 tests / 2 files passed**, 6.28 seconds
  (`job-payment-isolation.log`). Service-role payment status writes in this suite validate database
  constraints and access, not Stripe processing or a complete application state machine.
- Contract/review setup previously attempted homeowner direct contract INSERT, which is now
  intentionally forbidden. Seeded the completed-job quote and contract with the service fixture
  client; renamed the suite/assertion to describe its actual access-boundary scope instead of
  claiming a complete quote handoff. Added independent homeowner/contractor/outsider INSERT, UPDATE
  and DELETE denial tests and persisted amount/status checks. **7 contract/review tests passed**,
  3.50 seconds (`contract-review-isolation-final.log`). Server contract generation/signing remain
  covered by their separate route/SQL diagnostics, not this fixture setup.
- All checks used actual synthetic Auth accounts and the disposable API on port 55321, no mocked
  database and no payment-provider calls. Post-run counts: **0 recent synthetic accounts and jobs**.
  Added three ignored isolated-stack launchers; no application or schema changes in this checkpoint.
  Existing unrelated worktree tsconfig warnings persist.

### 2026-09-15 — mobile payment verification and screen test repair

- Ran the actual mobile payment hook, PaymentService and BidService unit suites: **121 tests / 3
  suites passed**, 13.101 seconds (`mobile-payment-contract-check.log`). External API/provider
  dependencies are mocked; these are caller/component regression checks, not device or real-provider
  verification.
- The separate payment screen/Stripe form/schema-contract group printed 60 passing assertions but
  the command exited **1** after pending payment-method API retries logged after test completion
  (`mobile-payment-screen-check.log`). Existing screen tests merely asserted arbitrary text, a
  defined navigation object, and an interaction count greater than or equal to zero. These were not
  evidence of working payment behavior.
- Replaced those screen assertions with the real rendered PaymentScreen/usePayment plus explicitly
  mocked service/API boundaries. Five cases check loading, no-card disabled action, visible
  method-load error, selected-method intent creation followed by held escrow confirmation, and
  pending confirmation without a success alert. Removed the unbounded network retry side effect from
  this component test; no application behavior changed.
- Final screen/Stripe form/schema-contract group: **61 tests / 3 suites passed**, command exit
  **0**, 15.995 seconds (`mobile-payment-screen-final.log`). Mobile TypeScript check exited 0.
  Existing react-test-renderer deprecation warnings remain; no emulator, 3DS hand-off or real Stripe
  verification is claimed.
- Static follow-up remains: the reachable payment screen can retain local fee estimates after
  payment-details failure; cash/credit presentation and authoritative payable-amount display still
  need complete review. The optional direct-payment branch was not found in current navigation
  callers. Do not treat its mocked tests as evidence of a reachable user journey.

### 2026-09-15 — fail-closed mobile payment quote display

- Confirmed reachable `PaymentScreen`/`usePayment` retained a local fee estimate after
  payment-details failure and could still initiate payment. The displayed job amount also came from
  navigation params even when the server returned another amount.
- Removed the local fallback from this hook. It now requires finite, nonnegative fee fields and a
  positive total, shows loading/error/retry states, and refuses payment initiation without a valid
  server quote. The screen displays the quoted job amount and uses that amount for intent creation
  rather than stale navigation data. No schema or provider behavior changed.
- Quote requests are scoped to both account and job, with stale-response rejection on account
  changes/unmount. Quote retry retains the chosen payment method and does not initiate a charge.
  Invalid/null/negative/string totals are rejected.
- Regression coverage includes stale navigation values, invalid quotes, rejected GET retry,
  old-account responses, and a rendered screen that hides Pay on quote failure then restores it
  after retry. Final targeted mobile group **101 tests / 4 suites passed**, exit 0, 23.767 seconds
  (`mobile-quote-final.log`). Mobile type check and source lint passed before final formatting/test
  addition; normal commit hooks run the final checks.
- This proves client gating and request composition against controlled responses, not the server
  quote's complete eligibility/credit accounting or a real device/Stripe hand-off. Those remain
  open. No deployment or hosted data changes.

### 2026-09-15 — accepted-bid-only server payment quotes

- Traced `/api/jobs/[id]/payment-details` against create-intent. The quote handler ignored bid
  lookup errors, did not constrain accepted bids to the assigned contractor, and fell back to a
  numeric job budget. Consequently it could display a payable quote that intent creation would
  reject.
- Quote selection now includes the current contractor and never substitutes job budget for an agreed
  bid. No assigned contractor or missing/nonpositive/invalid accepted amount returns the existing
  no-quote shape. Bid lookup failures return a retryable 503 instead of fabricated fee totals.
  Homeowner/designated-payer access checks remain enforced.
- Added nine production-handler tests for numeric-string normalization, contractor filtering,
  missing/null/zero/negative/invalid amounts, query error, missing assignment, designated payer and
  unrelated-user denial. These mock the database and handler authentication wrapper; they do not
  claim end-to-end authorization.
- Quote + create-intent concurrency + payment-ceiling group: **21 tests / 3 files passed**, exit 0,
  2.05 seconds (`payment-quote-final.log`). Web TypeScript and changed route lint passed. No schema
  changes, provider calls or deployments. Full quote eligibility (including already funded states),
  credit presentation and real device/provider journeys remain separate unfinished checks.

### 2026-09-15 — combined validation at e239322d5

- Full sanitized web coverage: **3,466 tests / 313 files passed**, exit 0, 160.49 seconds
  (`quote-final-full-coverage.log`). This includes the new server quote tests and existing
  payment/auth regressions. Real database suites remain separate from this mocked/unit
  configuration.
- Executed all **28** current `audit/2026-09-06/remediation-*.sql` suites through psql with
  ON_ERROR_STOP against `supabase_db_mintenance-audit-20260906`: **28/28 passed**, exit 0
  (`final-rollback-sql-check.log`). Each diagnostic ends in ROLLBACK. Coverage includes effective
  grants, client mutation restrictions, funding/credit reservations, refunds and payout claims,
  signing/co-sign/retained evidence, deletion recovery, mobile/web revocation and password-change
  recovery. This run does not repeat the separate multi-connection race scripts or external Auth
  HTTP probes.
- Required command executed using cached CLI v2.116.0:
  `npx --offline supabase db diff --local --workdir audit/2026-09-06/isolated-stack`. Fresh shadow
  migration replay completed; exit **0**, **No schema changes found** (`final-local-db-diff.log`).
  No CLI upgrade, hosted mutation, original local database mutation or deployment performed.
- These results strengthen current local evidence but do not satisfy the complete readiness gate:
  hosted upgrade/permission parity, real provider challenge/webhook/recovery journeys, device
  behavior, and identified remaining local flow concerns still need resolution. Goal remains active.

### 2026-09-15 — release cache authorization ordering (F3 follow-up)

- Confirmed `release-escrow` checked and returned a cached result before loading the escrow/job or
  rechecking current participant/admin access and MFA. Actor/payload-scoped keys prevented another
  actor's cache lookup, but did not account for access revoked since that actor's original request.
- Moved the idempotency claim/cache check after current record, MFA, database-admin and participant
  checks. A request denied before acquiring a claim no longer calls releaseIdempotencyClaim in its
  catch path. This avoids deleting a claim that this attempt never acquired.
- Added a former-participant replay regression: even with a cached successful transfer, the route
  returns 403, never checks the cache, never transfers and never releases a claim. Updated the valid
  duplicate fixture to include the current escrow/job record.
- Escrow lifecycle + transfer helpers: **56 tests / 2 files passed**, exit 0, 2.03 seconds
  (`release-cache-final.log`). Web TypeScript and changed route lint passed. Tests use controlled
  external dependencies; no real Stripe call or schema change.
- F3 broader completion is not claimed: stale-lease fencing and other callers still require their
  own verification. Existing durable transfer reservations remain the separate money-movement
  protection.

### 2026-09-15 — reproduced open stale-claim fencing defect (F3)

- Added `diagnostic-idempotency-stale-owner.sql`, explicitly an **open-defect reproduction**, not an
  expected-safe regression. It runs in a rollback transaction on the disposable stack: claim, age
  claimed_at by two minutes, acquire replacement claim, then submit the old request's
  completion/release arguments.
- Actual current database result: **expired completion accepted and replacement pending claim
  deleted**, reproduction exit 0 with `REPRODUCED OPEN DEFECT`
  (`idempotency-stale-owner-reproduction.log`). All data rolled back. Unlike the 28 expected-safe
  suites, this diagnostic succeeding means the defect remains present.
- Root cause: `try_claim_bound_idempotency_key` preserves actor/payload identity but returns no
  generation token; `complete_idempotency_claim` and `release_idempotency_claim` match only
  key/operation/pending state. `lib/idempotency.ts` completion retry exhaustion also invokes the
  unfenced release RPC. Thus a slow old request cannot be distinguished from the new owner.
- Scope: internal service-role calls, not publicly executable RPCs; this evidence establishes
  claim/cache ownership corruption, not a reproduced duplicate provider charge. Payment funding and
  transfer reservations remain separate mitigations. Consumers include financial routes, contracts,
  bids and job lifecycle handlers, including the shared releaseOnError wrapper.
- Required repair remains open: issue an opaque claim-generation token on every
  acquisition/takeover, require that token plus actor/key/operation for completion/release,
  propagate it explicitly through every caller and wrapper, retire unfenced internal write entry
  points, and verify stale completion/release rejection plus valid-owner recovery in SQL and
  concurrent-request tests. Avoid a process-global key-to-token map: overlapping requests could pick
  up the replacement token. Do not disable takeover as a substitute for durable recovery.

### 2026-09-15 — fenced idempotency database primitives (caller integration pending)

- CLI-generated migration `20260915170225_fence_idempotency_claim_ownership.sql` adds
  per-acquisition UUID tokens and expiry timestamps. New service-only claim/complete/release
  functions require actor plus token for writes. Acquisition retains the existing bound
  actor/payload validation and transaction lock; each takeover rotates the token. Cached responses
  do not return an ownership token.
- Applied only to disposable Supabase. New rollback regression `remediation-idempotency-fencing.sql`
  passed: expired completion denied before takeover, old completion/release denied after takeover,
  wrong actor denied, current completion and release succeed, completed replay retains the correct
  response without exposing token, direct client RPC grants absent (`idempotency-fencing-sql.log`,
  exit 0).
- Isolated `supabase db diff --local` replay passed with no schema changes
  (`idempotency-fencing-db-diff.log`, exit 0).
- Security advisors ran with `--type security --level warn --fail-on error`: exit **1**, retaining
  the existing public PostGIS / spatial_ref_sys findings. Explicit effective grants check confirms
  anon and authenticated SELECT/INSERT/UPDATE/DELETE privileges on spatial_ref_sys remain true. Do
  not interpret successful migration replay as resolved effective-grant scope; this remains a
  separate F1 concern.
- **Not integrated yet:** shared TypeScript helper and its 16 route consumers still invoke the old
  functions, which remain available for the staged migration. Therefore the original stale-owner
  defect remains reproducible in active application code. Next required work is explicit
  request-local token propagation through check/store/release/releaseOnError, retiring old write
  entry points, updating real helper/route tests and proving concurrent stale-owner rejection. No
  deployment or hosted mutation occurred.

### 2026-09-15 — request-local fenced idempotency integrated (F3)

- Shared helper now acquires through claim_fenced_idempotency and returns an explicit ownership
  object (actor and token); missing tokens fail closed. All **16 route consumers** pass that
  request-local object through storeIdempotencyResult, releaseIdempotencyClaim and releaseOnError.
  No shared key-to-token map is used. Payment create/release outer catch paths retain only their own
  request's ownership. Completion retry exhaustion also uses the fenced release function.
- CLI-generated `20260915171223_retire_unfenced_idempotency_entrypoints.sql` revokes service-role
  and client access to the old claim/bound-claim/complete/release entry points. Owner-internal calls
  remain available to the fenced acquisition wrapper. Source search found no remaining active calls
  to those retired RPC names in apps/packages/edge functions. **Callers and both fencing migrations
  must ship together**; none have been deployed here.
- Real rollback SQL verifies expired/stale/wrong-actor denial, valid-owner completion/release,
  cached replay and retired grants. All 29 current rollback suites were run: initially 28 passed and
  the broad grant test failed because it still expected service execution on retired RPCs. Updated
  that test to explicitly require denial on those routines; its rerun passed
  (`fenced-final-all-sql.log`, `fenced-internal-grants-final.log`).
- Added `remediation-idempotency-fencing-race.py`: while replacement completion remains uncommitted,
  two separate connections attempt stale completion and stale release; both return false,
  replacement commits and its correct result remains. Exact synthetic fixture cleanup in finally.
  Passed (`fenced-claims-race.log`). This is actual local SQL overlap, not a JavaScript mock.
- Shared-helper tests verify separate ownership objects survive overlapping acquisitions and are
  passed unchanged to completion/cleanup; missing ownership/token fails closed. Route tests assert
  ownership is forwarded. Initial full run had three old argument-list expectations fail (3,467
  passed); after updating expectations, final full coverage **3,470 tests / 313 files passed**, exit
  0, 160.60 seconds (`fenced-callers-final-full.log`). Web type-check and all changed
  production-source lint passed. Subsequent source cleanup removed unused imports/directive only.
- Isolated fresh migration replay/diff passed, exit 0, no drift (`fenced-callers-db-diff.log`).
  Existing PostGIS advisor findings remain as previously recorded. The old open-defect SQL is
  historical and now encounters permission denial under service_role; use the expected-safe fencing
  tests for the repaired contract.
- Fencing prevents old requests from corrupting replacement claim/cache state. It does not cancel a
  slow request's business work or replace operation-specific database/provider idempotency and
  durable recovery. Other F3 caller authorization ordering and broader readiness checks remain in
  scope. No hosted writes, deployment or real payment occurred.

### 2026-09-15 — contract rejection cache access and extension-owner recheck

- Rechecked disposable PostGIS ownership: spatial_ref_sys belongs to supabase_admin; postgres is not
  superuser or a member of supabase_admin. This confirms the earlier provider/owner authority
  limitation; did not attempt ownership escalation or install an owner-only migration. F1
  extension-grant remediation remains open under the existing scope restriction against hosted
  mutation.
- Found another cache-before-access path in `contracts/[id]/reject`: a former designated payer could
  receive their prior cached contract response before current party checks. Moved contract existence
  and homeowner/designated-payer reads before claiming/returning idempotency results. Current
  authorized retries still recover success even after the original state transition, without
  repeating it.
- Four handler regressions cover revoked payer access, deleted contract, current homeowner and
  current designated payer. Denied requests never call the cache; successful retries do not update
  the contract. Auth wrapper and DB are controlled test boundaries, not end-to-end authentication
  evidence.
- Contract rejection/acceptance group: **21 tests / 2 files passed**, exit 0, 1.99 seconds
  (`contract-cache-final.log`). Web type-check and route lint passed. No schema change, provider
  call or deployment.

### 2026-09-15 — contract signing cached-response authorization

- `contracts/[id]/accept` also returned cached responses before loading the contract and checking
  current signer membership. Moved the existing contract/job read and role-specific
  homeowner/payer/contractor checks ahead of idempotency lookup. State-transition validation stays
  after cache recovery, allowing an authorized retry after a successful signature without signing
  again.
- Five new controlled-handler tests verify former-payer denial, missing-contract denial and cached
  success for each current authorized party. No mutation path is invoked for cached retries.
  Existing atomic-signing tests remain in the targeted run.
- Contract signing/rejection access and existing signing group: **26 tests / 3 files passed**, exit
  0, 2.33 seconds (`contract-signing-cache-access.log`). Web TypeScript and route lint passed. These
  are handler contract tests with mocked authentication/DB boundaries, not real session/browser
  signing verification.
- No database migration, hosted changes or deployment in this checkpoint. Other idempotency consumer
  authorization ordering and broader readiness gates remain open.

### 2026-09-15 — Job start and rework replay authorization

- Moved current assigned-contractor and designated-payer checks before cached idempotency responses
  in job start and request-changes routes. Missing jobs and former participants cannot recover
  cached success. Transition checks remain after cache recovery so legitimate retries do not repeat
  work.
- Added six controlled-handler regression cases covering both routes: former participant denial
  before cache lookup, missing job denial, and current participant recovery without RPC/update
  execution. Authentication and database boundaries are mocked; these are not browser or
  real-session tests.
- Targeted job replay/start/rework suites: **28 tests / 3 files passed**, exit 0, 3.38 seconds
  (`job-replay-access-final.log`). Source ESLint passed. No database migration or hosted mutation.
  Broader readiness verification remains open.

### 2026-09-15 — Completion confirmation replay authorization

- Extended job replay regression coverage to completion confirmation. Before the fix, two tests
  failed: a former participant and a missing job both received cached success
  (`completion-replay-before.log`, 2 failed / 7 passed).
- Moved existing current job/payer authorization before idempotency lookup. State and financial
  transition checks remain after cache recovery, preserving authorized retries without repeating
  transitions.
- After the fix, completion/replay/start/rework suites passed **53 tests / 4 files**, exit 0, 2.85
  seconds (`completion-replay-final.log`). Route lint passed. Tests exercise actual handlers with
  mocked authentication and database boundaries, not real browser or provider flows. No migration or
  hosted mutation. Broader readiness gates remain open.

### 2026-09-15 — Before/after photo replay authorization

- Both upload routes previously returned cached responses before loading the current job and
  checking assignment/admin access. Four controlled-handler regressions reproduced
  former-participant and missing-job cached success (4 failed / 11 passed,
  `photo-replay-before.log`). Cached upload responses include photo metadata, making current access
  material.
- Moved existing job/assignment checks before multipart fingerprinting and cache lookup. Authorized
  cache recovery still skips upload/mutation work. Existing admin predicate and upload validation
  remain unchanged.
- Upload/replay/private-photo suites: **49 tests / 4 files passed**, exit 0, 3.32 seconds
  (`photo-replay-final.log`). Source lint passed. Tests use mocked authentication/database
  boundaries; multipart fingerprinting is real. No actual storage/provider request, migration, or
  hosted mutation. Signed-link expiry and device/browser checks remain separately unverified.

### 2026-09-15 — Combined replay authorization validation

- Full isolated web coverage at `ed5f3f6ac`: **3,494 tests / 316 files passed**, exit 0, 159.70
  seconds (`replay-access-full-coverage.log`). Sanitized launcher; no live payments or hosted
  mutations. This validates the accumulated route changes against the available web suite, not real
  provider/device/browser behavior.
- Follow-up source trace: contractor-withdraw and terminate-contractor still call
  `stripe.refunds.create` directly, outside `RefundService` reservation/outcome tracking. Contractor
  withdrawal uses refund.id without requiring succeeded status before marking escrow refunded. This
  path needs a durable lifecycle/refund integration review, including pending provider results,
  payout exclusion, credit restoration, and recovery before reassignment. Do not interpret the green
  suite as closing that review.
- Ruled out one suspected incompatibility: `protect_bid_financial_terms` permits trusted
  accepted-to-withdrawn status changes while freezing financial identity;
  `freeze_signed_contract_terms` preserves terms/signatures but does not prohibit cancellation
  status. Neither supports a claim that those specific guards always break withdrawal. No
  application changes in this validation checkpoint.

### 2026-09-15 — Lifecycle refund status guard (partial remediation)

- Actual withdrawal and termination handlers reproduced eight false transitions: provider
  pending/requires_action/failed/canceled responses still wrote escrow refunded and reopened the
  job. Synthetic provider/database boundary regression: `lifecycle-refund-pending-before.log`.
- Added a succeeded-status guard before recording the refund or making lifecycle changes.
  Non-success responses follow the existing error path; this prevents the reproduced false
  transitions but is not durable recovery.
- New regression suite: **10 tests passed**, exit 0, 2.10 seconds
  (`lifecycle-refund-pending-final.log`), including both succeeded paths and explicit error
  assertions for all eight non-success cases. Web TypeScript and source ESLint passed. No provider
  calls or hosted mutations.
- Required follow-up: integrate both exit flows with a durable lifecycle operation and refund
  reservation/outcome tracking; authorize contractor-initiated refunds without impersonating the
  payer; serialize payout/refund/assignment changes; restore credits; recover pending provider
  outcomes and DB failures; provide truthful pending UI. The existing refund reservation only allows
  payer-owned jobs in cancellation/dispute/pre-assignment states, so simply calling it from these
  routes would break legitimate assigned-job exits. This guard does not close the payment finding.

- Follow-up reachability search found no literal web/mobile UI caller for contractor-withdraw or
  terminate-contractor (API endpoints remain present). Admin refunds also have a direct Stripe
  refund path (`apps/web/app/api/admin/refunds/[id]/route.ts`, refund action): it claims
  release_pending first, but does not check provider refund.status before finalization and uses
  original escrow.amount for partial/full classification. This requires inclusion in durable refund
  integration; no admin repair claimed.

### 2026-09-15 — Admin refund uncertainty guard (partial remediation)

- Five controlled-handler regressions reproduced false finalization for
  pending/requires_action/failed/canceled refunds and restoration to held after an ambiguous
  provider exception (`admin-refund-outcomes-before.log`). Admin refund UI caller confirmed in
  RefundManagementClient.handleAction.
- Require provider succeeded status before finalization. Preserve release_pending on an ambiguous
  provider exception instead of restoring spendable escrow. Error text no longer asserts provider
  success without evidence. This intentionally requires reconciliation while the durable recovery
  integration remains unfinished.
- Admin and lifecycle refund regression group: 15 tests / 2 files passed, exit 0
  (`admin-refund-outcomes-final.log`). Source lint passed; synthetic provider/database boundaries
  only. No live payment or hosted mutation. No claim that pending refunds can yet recover
  automatically, that admin repeated partial amounts are correctly deduplicated, or that
  credit/cumulative balances are fixed. Durable reservation/outcome integration remains required.

### 2026-09-15 — Durable admin refund reservation foundation

- CLI-created `20260915180822_reserve_admin_refund_operations.sql` adds a separately recorded admin
  initiator and service-only reserve_admin_escrow_refund RPC. The financial actor remains the escrow
  payer, preserving existing refund verification and credit restoration. Current non-deleted admin
  role is checked in the transaction before reservation. Existing amount/payload identity,
  cash-first allocation, inflight refund exclusion and payout-attempt checks are retained.
- Applied only to disposable audit DB. Rollback SQL `remediation-admin-refund-reservation.sql`
  passed: non-admin denial, matching retry identity, changed payload denial, competing operation
  denial, pending claim preservation, exactly-once partial settlement, remaining cash/credit
  allocation and payer-only credit restoration, authenticated RPC denial. These are sequential
  real-DB checks, not concurrent network/provider tests.
- Local security advisors exit 1: existing public.spatial_ref_sys RLS error and PostGIS
  extension-in-public warning remain (`admin-refund-advisors.log`). No new advisor item was
  reported. API/service/UI integration and durable pending/retry recovery are not yet connected to
  this function. No hosted changes or deployment.
- Isolated migration replay/diff completed with exit 0 and no schema differences
  (`admin-refund-db-diff.log`).

- Service adapter reserveAdminRefund now calls the admin RPC with the real administrator and
  validates returned administrator, payer, escrow and gross amount before provider work. Six new
  adapter cases plus existing recovery/admin guard tests: **39 tests / 2 files passed**, exit 0,
  1.98 seconds (`admin-refund-service.log`). Source lint passed. The admin route is not switched to
  this adapter yet; API and UI durable retry integration remains required.
- Commit file-size gate required extracting the existing guarded admin refund action and audit
  writer into AdminRefundAction.ts. After extraction, the same 39 tests passed (1.97 seconds;
  admin-refund-extraction.log); no hook bypass was used.

### 2026-09-15 — Admin refund route/browser durable integration (in progress)

- AdminRefundAction now uses readRefundContext, reserveAdminRefund and recoverRefund instead of
  direct Stripe/refund escrow updates. Requires a scoped request key, derives omitted amount from
  remaining principal or original replay amount, rejects excessive amounts rather than clamping,
  returns 202 success:false for unknown/pending outcomes, and returns actual cash/credit/remaining
  totals only after confirmed settlement. Current admin authority remains checked at route and
  reservation boundaries.
- Admin page supplies authenticated actor identity; browser persists actor/escrow-scoped payload and
  key before network access, restores saved form values, and offers Check refund for saved actions
  even after escrow status changes. Pending/network failures retain identity; a confirmed action
  retires it so another identical partial refund gets a new key. Admin and payer browser slots are
  separate.
- Route/recovery/browser request group: **54 tests / 3 files passed**, exit 0, 3.24 seconds
  (`admin-refund-integration.log`). Web TypeScript and source lint passed. These are mocked-boundary
  route and persistence tests, not rendered UI or real Stripe tests.
- Integration remains in progress and uncommitted: replace previous route-level notification fanout
  with durable settlement notifications, verify rendered recovery UI, test concurrent admin
  reservations on real DB, and verify full-refund downstream job/contract semantics. No production
  readiness claim or deployment.

### 2026-09-15 — Transactional admin refund notifications and concurrency

- CLI-created migration 20260915182522_durable_admin_refund_notifications.sql inserts in-app
  payer/payee notifications and an audit record in the same transaction as admin refund settlement.
  Replayed success creates neither duplicate notifications nor duplicate audit entries. A
  notification failure rolls settlement back so provider reconciliation can retry it. Push/email
  delivery is not established by these inserts.
- Real DB execution exposed the previous route audit writer using nonexistent audit_logs columns and
  an invalid action value. Corrected both migration and shared writer to actual
  table_name/record_id/new_values columns, with action UPDATE and named event metadata. Removed
  route refund audit duplication; other admin actions retain the corrected writer.
- Extended rollback SQL passed: pending outcomes send no success notification; repeated confirmation
  creates two recipient notifications and one audit row; injected notification failure leaves the
  pending operation and full balance intact. New remediation-admin-refund-race.py passed on separate
  DB connections: one competing reservation wins; concurrent finalizations deduct once and emit
  notifications/audit once. Synthetic fixtures cleaned up; no provider calls.
- Web route/recovery/browser request group remained **54 tests / 3 files passed**, exit 0, 3.10
  seconds (admin-refund-notifications-web.log). UI rendering and full-refund contract lifecycle
  semantics remain unverified; broader F1-F15 goal remains open.
- Isolated migration replay/diff passed with exit 0 and no schema differences
  (admin-refund-notifications-diff.log). Source lint and web TypeScript passed. Refund form now
  labels original payment separately and calls the full option Full remaining balance, avoiding a
  promise to refund the original amount again after partial refunds.

### 2026-09-15 — Admin refund form verification

- Actual ActionModal rendered in test DOM: three tests passed for restored partial refund
  amount/reason, unchanged submission payload, preserved values/disabled submission while
  processing, and full remaining balance without a client-selected amount (`admin-refund-form.log`,
  exit 0, 3.36 seconds). This is component DOM verification, not a live browser/auth/provider
  journey.
- Final local advisors exit 1 with the same spatial_ref_sys RLS error and PostGIS extension warning,
  no new reported item (`admin-refund-final-advisors.log`).
- Source search confirmed refund recovery is currently invoked by route retries and verified
  webhooks, with no cron sweep for abandoned reserved/pending refund operations. A bounded durable
  recovery sweep remains required; do not describe unattended recovery as complete.
- Full isolated web coverage for the combined integration: **3,525 tests / 319 files passed**,
  178.15 seconds (admin-refund-final-coverage.log).

### 2026-09-15 — Bounded unattended refund recovery (in progress)

- Added service-only refund recovery claim/acknowledgement RPCs with a two-minute initial delay,
  three-minute expiring token lease, SKIP LOCKED selection, sanitized recovery error category and
  bounded retry backoff. Rollback SQL verified fresh/live claim exclusion, expiry/takeover,
  wrong/stale-token rejection, backoff and client privilege denial.
- Added a 25-second total provider deadline to recoverRefund, retaining its existing default
  behavior for interactive callers. Tests verify no provider request starts after expiry and
  pagination stops when the total budget expires.
- Added refund-recovery cron through the existing authenticated withCronHandler, maxDuration 60,
  configured every five minutes. Worker handles at most three operations, acknowledges exact lease
  ownership, and reports failures for monitoring. No deployment or real provider calls.
- Worker/provider recovery group: **40 tests / 2 files passed**, exit 0, 1.97 seconds
  (`refund-recovery-worker.log`). Real rollback SQL passed; isolated db diff exit 0/no differences
  (`refund-recovery-leases-diff.log`). Source lint and web TypeScript passed. Separate-worker DB
  concurrency, cron authentication regression, and full-suite integration remain to be checked
  before committing this checkpoint.

### 2026-09-15 — Recovery worker concurrency and cron authentication

- remediation-refund-worker-race.py passed using separate real DB connections and service-role RPC
  execution: one overlapping worker claims due work, expiry rotates the lease token, stale
  acknowledgement fails, and current acknowledgement succeeds. Exact synthetic fixtures were cleaned
  up.
- Actual withCronHandler/cron-auth boundaries tested with synthetic secrets and a mocked worker:
  missing/wrong bearer credentials, missing configuration, expired HMAC and wrong-path HMAC all
  rejected before worker/tracking. Valid scheduler credential accepted; worker failures return 503.
  Targeted recovery group **47 tests / 3 files passed**, exit 0, 2.03 seconds
  (refund-recovery-final-targeted.log). Web TypeScript passed.
- Next confirmed source gap: admin release in apps/web/app/api/admin/refunds/[id]/route.ts still
  derives Stripe transfer from original escrow.amount and bypasses the durable remaining-principal
  transfer service. It must be integrated before treating admin payment intervention as ready,
  particularly after partial refunds. No fix to this separate release path claimed here.
- Full isolated web coverage: **3,538 tests / 321 files passed**, exit 0, 156.24 seconds
  (refund-recovery-full-coverage.log). Hosted scheduling, real Stripe recovery and broader readiness
  remain unverified.

### 2026-09-15 — Admin release overpayment reproduction (open)

- Added expected-safe admin-release-balance.test.ts against the actual admin route with synthetic
  database/provider boundaries. A GBP 100 escrow with GBP 70 remaining after refund still produced a
  Stripe transfer request for 10,000 minor units. The safety assertion failed: expected <= 7,000,
  actual 10,000 (`admin-release-balance-before.log`, one failed test, exit 1, 2.00 seconds). No real
  payment occurred.
- The existing shared claim_escrow_release obtains remaining principal under job/escrow locks, and
  reserve_escrow_transfer binds provider terms and rejects refund conflicts. The admin route
  currently bypasses both. Repair must integrate atomic claim, frozen provider transfer, fees, and
  pending recovery together; a standalone balance read would retain a refund/release race. The new
  safety test is intentionally failing until that implementation is repaired and is not committed in
  this checkpoint.

### 2026-09-15 — Atomic admin release foundation (not yet connected)

- CLI-created migration 20260915185723_reserve_admin_release_principal.sql adds a service-only admin
  release operation that freezes remaining principal, fee, payout, recipient and original reason
  under job/escrow locks. Checks current admin authority, payout setup, payee identity, unresolved
  refunds and existing payout attempts. Retry retains original economics; changed reason is
  rejected.
- Atomic finalization requires a matching durable transfer record for positive payouts, records
  escrow payout/fee and job payment state, and inserts notifications/audit once. A pending operation
  blocks job status/reassignment changes to prevent lifecycle code from bypassing the release claim.
- Real rollback SQL remediation-admin-release-reservation.sql passed: GBP 500 minus GBP 100 refund
  reserves GBP 400 principal / GBP 48 fee / GBP 352 payout; pending refund and non-admin calls
  denied; fee-rate change on retry retains original values; missing transfer confirmation denied;
  reassignment blocked; duplicate confirmation emits exactly two recipient notifications and one
  audit row. Provider confirmation is synthetic, not a real transfer.
- API/UI still use the legacy admin release path, so admin-release-balance.test.ts remains
  intentionally failing until integration. Fee bookkeeping consumers, zero-payout behavior, provider
  recovery and concurrent release/refund checks still require completion. No hosted mutation or
  deployment.
- Expanded isolated migration replay/diff completed: exit 0, no schema differences
  (admin-release-finalization-diff.log).

### 2026-09-15 admin release recovery validation (uncommitted integration)

- Hardened AdminReleaseAction confirmation decoding: completed positive payouts require a nonempty
  transfer ID; fee-only settlement requires null; finalization must retain escrow identity and
  destination as well as frozen amounts.
- Actual admin route tests (authentication wrapper, database and provider mocked) cover
  partial-refund principal, provider uncertainty, provider success followed by database failure,
  completed retry without another transfer, fee-only funding verification, missing transfer evidence
  and mismatched escrow finalization.
- Browser request tests cover persistent identical key/reason across network and pending responses,
  changed-payload rejection, confirmed balanced success cleanup, inconsistent totals and unavailable
  browser storage. These are DOM-environment helper tests, not a real browser journey.
- Sanitized targeted run: 11 tests / 2 files passed, exit 0, 2.04 seconds;
  admin-release-recovery-tests.log. First persistence diagnostic targeted Storage.prototype, but
  shared test setup supplies a separate localStorage instance; corrected the spy to that actual
  instance and reran.
- Admin release integration remains incomplete pending broader validation, real database concurrency
  coverage, fee-accounting consumer review and unattended recovery. No deployment or real provider
  operation occurred.

### 2026-09-15 admin release database race and transactional recovery

- remediation-admin-release-race.py passed against supabase_db_mintenance-audit-20260906 using two
  independent connections and service_role RPC calls. Concurrent matching reservations return one
  operation with frozen GBP500 principal / GBP60 fee / GBP440 payout. Concurrent finalization writes
  exactly two participant notifications and one audit event. Provider confirmation is synthetic; no
  Stripe call occurs. Exact fixture cleanup completed. Initial diagnostic incorrectly selected an id
  column from reserve_escrow_transfer; corrected to its actual escrow_id return column before
  passing.
- remediation-admin-release-reservation.sql passed again after adding injected notification failure.
  A failed notification insert rolls back the operation, escrow transition and all settlement
  effects; retry with the same recorded synthetic transfer then settles once. The entire diagnostic
  rolls back.
- Fee-accounting follow-through remains open: FeeTransferService.transferPlatformFee writes
  platform_fee_transfers using recomputed amounts and estimated processing fees, then separately
  overwrites escrow fee columns. The new admin finalizer correctly freezes escrow fee/payout but
  does not yet populate that separate accounting table. Calling the existing service naively would
  undermine the frozen amounts and transactional settlement. Its pending/held consumer is
  /api/admin/escrow/fee-transfer/pending and /admin/payments/fees; actual-cost accounting and
  durable ledger integration require a targeted follow-up.
- Additional fee-only real-database diagnostic remediation-admin-release-fee-only.sql passed
  (rollback-only): GBP0.30 principal is entirely fee, contractor payout zero, no transfer attempt
  exists, non-null transfer identity rejected and duplicate finalization emits only two
  notifications.
- Full sanitized web coverage: 3,549 tests / 323 files passed; exit 0; 161.32 seconds
  (admin-release-full-coverage.log). Targeted changed-source ESLint passed with --max-warnings=0.
  Web TypeScript check passed in the preceding validation. The exact migration replay previously
  completed with no schema changes (admin-release-finalization-diff.log); SQL diagnostics added here
  do not alter migrations.

### 2026-09-15 actual provider timeout enforcement

- Found that refundProviderCall passed its remaining worker deadline into stripeWithTimeout, but
  that helper retried twice with extra delay. A stalled call could exceed the supposed remaining
  budget by roughly three times. Earlier recovery tests mocked this helper away.
- Added optional retry-count control to stripeWithTimeout (existing default retained). Durable
  refund calls explicitly use zero internal retries; their frozen operations and recovery scheduler
  govern subsequent attempts. Funding verification and escrow transfer create/retrieve now also
  bound each provider wait and disable hidden retries. Escrow transfer/funding accept an optional
  shared deadline for worker use.
- Corrected withTimeout timer lifecycle: the old code cleared an unused AbortController timer but
  left the actual Promise.race rejection timer alive after success. The actual timer is now cleared
  on every exit. A timeout bounds waiting; it does not cancel a provider-side operation or imply
  payment failure.
- Removed the timeout mock from refund recovery tests. Fake-clock tests with never-resolving
  provider promises prove a 5-second deadline stops waiting, does not issue another provider
  request, records no transfer success, and leaves no timeout timers. Sanitized targeted checks: 55
  tests / 4 files passed, exit 0, 1.85 seconds (payment-real-timeout-tests.log).
- Web TypeScript emitted no errors. Changed-source ESLint reported zero errors and two existing
  unused-function warnings in api-timeout.ts (mlWithTimeout/dbWithTimeout); --max-warnings=0
  therefore exited 1. The normal commit hook also rejected these warnings. Follow-up source
  inspection confirmed both functions are unexported and have no callers; removed their dead
  definitions, preserving all reachable timeout behavior, and reran normal hooks without bypassing
  lint.
- Unattended admin release scheduling and the separate fee ledger remain unfinished; this change
  supplies bounded provider calls, not the complete worker.
- Full sanitized web coverage for timeout changes: 3,551 tests / 323 files passed, exit 0, 160.56
  seconds (payment-timeout-full-coverage.log). No database schema changes in this checkpoint.

### 2026-09-15 unattended admin release recovery

- Extracted frozen-operation decoding and provider/settlement recovery into AdminReleaseService; the
  administrator route and scheduled worker now use the same implementation. The worker never creates
  a new release authorization or recalculates its amount/destination.
- Added 20260915193532_lease_admin_release_recovery.sql: only existing reserved operations older
  than two minutes are claimable; FOR UPDATE SKIP LOCKED assigns a random token with a three-minute
  lease. Expired leases can be replaced. Acknowledgement requires the current unexpired token and
  schedules bounded exponential backoff after failure. Internal claim/ack RPCs are service-role
  only.
- AdminReleaseRecoveryService handles at most three operations per invocation with a 25-second
  provider-work budget; failed/uncertain provider outcomes remain reserved. The cron route uses the
  existing authenticated cron wrapper and returns failure to monitoring when recovery needs
  attention. vercel.json schedules five-minute runs; nothing was deployed, so hosted
  scheduling/provider behavior remains unverified.
- Local migration applied only to supabase_db_mintenance-audit-20260906. Rollback diagnostic
  remediation-admin-release-recovery-leases.sql passed: fresh-request delay, lease exclusion,
  wrong/expired/stale token denial, takeover, backoff and client privilege denial.
  Separate-connection remediation-admin-release-worker-race.py passed under service_role and cleaned
  its exact synthetic fixtures.
- Initial targeted route/worker/cron run: 20 tests / 3 files passed, exit 0, 2.01 seconds
  (admin-release-worker-tests.log). These exercise actual settlement helper and actual cron
  authentication with mocked database/provider boundaries; real SQL lease behavior is tested
  separately. Added fee-only worker and total-budget tests before the subsequent full suite.
- Web TypeScript and changed-source ESLint --max-warnings=0 passed. Separate fee-ledger integration
  and operator reconciliation for old unknown transfers remain open.
- Final validation: full sanitized web coverage passed 3,566 tests / 325 files, exit 0, 163.74
  seconds (admin-release-worker-full-coverage.log). Isolated Supabase migration replay/diff passed
  with no schema changes (admin-release-worker-diff.log).

### 2026-09-15 atomic admin-release fee ledger and honest reporting

- Added 20260915194629_record_admin_release_fees_atomically.sql. Admin release finalization now
  inserts exactly one platform_fee_transfers row in the same transaction, using the frozen operation
  ID/fee and GBP currency. Processing cost and net revenue are NULL with pending provenance until
  provider reconciliation; no zero or formula-derived cost is invented. The legacy net_revenue
  column now permits NULL.
- Existing fee accounting prevents a new admin release reservation before provider activity. A fee
  conflict arising before finalization also fails settlement closed, retaining the recoverable
  operation. The ledger represents a retained platform fee, not a separate bank transfer. The
  existing administrative fee interface lists pending/held records; this change does not add a
  completed-ledger explorer or a provider-cost reconciliation worker.
- Existing FeeTransferService estimates now carry explicit estimated provenance. Fee-report rows
  display Pending reconciliation, Estimate or Unverified instead of presenting every number as
  confirmed. Pending and held metric totals now use their own records (previous pending was
  hardcoded zero and held included all loaded fees). Unknown net revenue prevents a misleading
  aggregate number. These are loaded-record totals, not global reporting totals.
- Real isolated SQL passed: reservation rejects preexisting fee accounting; injected notification
  failure rolls back the fee row too; successful retry records one fee with unknown cost; concurrent
  finalization produces exactly one fee row. Fee-only settlement SQL also passed. No provider calls
  occurred; all SQL fixtures rolled back or were cleaned exactly.
- Actual component tests with synthetic API data: 2 passed / 1 file, exit 0, 2.40 seconds
  (admin-fee-ui-tests.log). Web TypeScript passed. Changed-source ESLint passed after removing three
  unused catch bindings; no lint rule was weakened.
- Follow-through found a separate unfinished reporting issue: UKEarningsStatementService still
  treats null processing costs as zero and uses original escrow gross even after partial refunds.
  Recorded contractor_payout is preferred for paid totals, but statement gross/fee semantics need
  correction before calling financial reporting complete. Payment history itself preserves null
  processing cost as undefined.
- Final checks: full sanitized web coverage passed 3,568 tests / 326 files, exit 0, 165.24 seconds
  (admin-fee-ledger-full-coverage.log). Isolated migration replay/diff exited 0 with no schema
  changes (admin-fee-ledger-diff.log).

### 2026-09-15 earnings statements reconcile to released principal

- Reproduced two statement errors before repair (earnings-settlement-before.log, 2 failures / 4
  tests): GBP500 original principal with GBP100 refunded was reported as GBP500 gross rather than
  GBP400; a modern GBP100 payment / GBP12 platform fee / GBP88 payout reported the platform's
  GBP1.70 processing estimate as a contractor deduction.
- Added shared earningsSettlement calculation for both contractor statements and admin listEarners.
  It uses the joined durable refund balance when present, validates gross/remaining/review state,
  and requires recorded platform fee and payout. Modern processing-cost estimates are not contractor
  deductions. Historical deductions remain only when the recorded payout difference exactly equals
  the recorded processing fee. Missing payout, invalid amounts or inconsistent economics require
  reconciliation instead of a fabricated paid amount.
- Both source queries now embed escrow_refund_balances. Real local PostgREST verification
  (remediation-earnings-rest.py) passed after synthetic partial refund and release: original GBP500,
  remaining GBP400, fee GBP48, payout GBP352 and unknown platform processing cost. The actual
  relationship and response shape were verified; exact fixtures cleaned; no provider calls or
  credential output.
- Initial repaired service tests passed 4 / 1 file, exit 0, 1.48 seconds
  (earnings-settlement-tests.log), including retained historical deductions and missing-payout
  rejection. Added nine focused invalid-input/relationship tests before the full suite.
- This repairs recorded financial arithmetic, not legal suitability or tax filing. Existing
  statement query pagination and generic reconciliation error presentation remain follow-up
  concerns; no official filing or real-user statement was generated.
- Final validation: full sanitized web coverage passed 3,579 tests / 327 files, exit 0, 161.58
  seconds (earnings-settlement-full-coverage.log). Web TypeScript and changed-source ESLint
  --max-warnings=0 passed. No schema migration was required for this query/calculation change.

### 2026-09-15 durable job-exit database foundation (integration incomplete)

- Re-inspected contractor-withdraw and terminate-contractor: both still call Stripe directly, select
  one held escrow, do not use the credit/refund ledger, and independently update contracts, bids and
  jobs. Those routes are NOT fixed by this database-only checkpoint and must be replaced before
  readiness can be claimed.
- Added draft migration 20260915200910_durable_job_exit_operations.sql. A service-only reservation
  validates the current actor/assignment and immutable request identity, records a durable exit, and
  reserves remaining cash/credit refunds against each held escrow for its original payer. Private
  financial/finalization helpers are not executable by service clients. Pending-exit guards block
  assignment/contract/bid changes and new funding inserts while refunds are unresolved.
- Refund confirmation now preserves the assignment for exit-linked operations. Once every linked
  refund succeeds, a database trigger atomically finalizes the exit: cancel applicable contracts,
  withdraw/reject the accepted bid, reopen the job, persist two participant notifications and an
  audit row. Ordinary refunds retain their existing behavior. The existing refund recovery worker
  can process these ledger operations once routes are integrated.
- remediation-job-exit-transactions.sql passed on the isolated audit database with full rollback:
  unauthorized actor denial, stable request replay, payload mismatch denial, pending-refund
  assignment protection, original-payer GBP50 credit restoration, atomic rollback on notification
  failure, exactly-once completion, historical actor replay and unfunded homeowner termination.
- remediation-job-exit-race.py passed with independent service-role connections: one exit operation
  under competing requests; concurrent refund confirmation restores credit and finalizes the
  assignment once. Exact synthetic fixtures cleaned. Existing admin-refund and admin-release
  rollback SQL also passed with the new recorder/guards.
- Remaining required work: wire both routes and responses to durable exits; handle terminal provider
  refund failures/retry; expand multi-escrow and competing-transition coverage; validate interface
  recovery. This is a foundation, not a claim that the active withdrawal/termination journeys are
  repaired. No external payments or deployment occurred.
- Isolated migration replay/diff passed with no schema changes (job-exit-foundation-diff.log),
  exit 0. Foundation remains uncommitted while route integration and remaining concurrency/retry
  cases are completed. Contract/bid INSERT coordination also needs review before integration.

### 2026-09-15 job-exit foundation follow-through (still not routed)

- Extended pending-exit guards to contract/bid inserts and ownership changes
  (homeowner/payer/contractor). The original duplicate-contract probe was already blocked by
  contracts_job_id_key, so this was not reported as a confirmed exploitable contract-insert flaw.
- Confirmed failed/canceled refund attempts can now be replaced on explicit retry of the same exit;
  uncertain/pending attempts retain their existing provider identity. Historical failed rows remain
  for audit; finalization still requires every escrow to be refunded. The expanded rollback SQL
  passed a failed attempt, replacement, injected settlement rollback and eventual exactly-once
  credit restoration.
- Preserved designated-payer termination authority from requireJobOwnership. Completion
  notifications include affected payer identities. The payer regression passed after giving
  synthetic profiles required names; an initial attempt was blocked by contractor_clients.first_name
  NOT NULL during fixture reassignment, not by a changed production control.
- Important scope correction: uq_escrow_active_per_job already prevents two active escrows for one
  job. The attempted multi-active fixture failed correctly. Replaced that diagnostic with
  remediation-job-exit-escrow-history.sql, proving the active-escrow uniqueness invariant and
  ignoring historical refunded escrows. Do not treat the old route limit(1) alone as a confirmed
  multi-active-escrow defect.
- Updated job-exit transaction, independent-connection race, historical escrow and ordinary
  admin-refund SQL checks passed on the isolated database. The earlier job-exit-retries-diff.log
  replay passed, then payer/ownership changes required another replay (job-exit-payer-diff.log).
- Both live routes still use the legacy direct-refund implementation. This draft migration and
  diagnostics remain uncommitted until route integration and end-to-end recovery validation are
  finished.
- The payer/ownership migration replay completed successfully (job-exit-payer-diff.log, exit 0). A
  subsequent transaction assertion then reproduced an active funding reservation remaining after
  exit, which would block the next contractor's funding. Corrected the draft to use the actual
  cancelled state (the prior released spelling is not in its enum) and retire attached funding only
  after settled refunds, without calling a second credit-restoration path. Updated transaction and
  independent-connection race diagnostics passed. The final funding-retirement adjustment still
  needs replay validation with the eventual route integration; no commit or deployment has occurred.

### 2026-09-15 durable job-exit route integration

- Replaced both contractor-withdraw and terminate-contractor legacy direct Stripe/refund and
  sequential contract/bid/job updates with JobExitService and reserve_job_exit. Database
  role/ownership checks preserve contractor, homeowner and designated-payer authority. Both
  endpoints now require an explicit stable Idempotency-Key; the key is scoped by actor, job and
  action. No active web/mobile caller was found by source search; UI reachability remains unverified
  rather than assumed.
- Route recovery uses existing frozen refund operations with original-payer cash/credit allocations
  and a shared provider deadline. Pending/uncertain recovery returns 202 success:false, confirmed
  terminal failure returns a retryable 409, and reconciliation-required outcomes direct the caller
  to support. Success requires the durable exit to be completed. Completed replay avoids another
  provider call and does not claim the job is still open after a later reassignment.
- Replaced old route tests that mocked direct Stripe writes with actual route/helper tests covering
  durable completion, pending/failure statuses, provider uncertainty, required retry identity,
  database ownership denial and completed replay. Initial targeted run: 18 tests / 1 file passed,
  exit 0, 2.65 seconds (job-exit-route-tests.log). Auth middleware is mocked in these route tests;
  actual SQL actor restrictions are covered separately.
- A new real SQL probe reproduced a competing admin refund reservation after the exit refund failed.
  Added guard_job_exit_financial_claim to reject unrelated refund/transfer reservations and admin
  payout claims while the exit remains pending. Matching exit refund retries still proceed. Final
  transaction/race tests passed with competing admin refund and payout denial, and ordinary admin
  refund/release plus historical-escrow diagnostics passed.
- Web TypeScript and changed-source ESLint --max-warnings=0 passed. Full sanitized web coverage:
  3,587 tests / 327 files passed, exit 0, 197.35 seconds (job-exit-integrated-full-coverage.log). A
  later response-wording refinement avoids stale current-job claims on historical replay and is
  checked by normal commit tests.
- Remaining external scope: no real Stripe outcome, authenticated browser/device journey, hosted
  migration or deployment was exercised. Local SQL foundation is now connected to both routes;
  previous notes describing them as still legacy are superseded by this entry.
- Final corrected migration replay/diff completed with no schema changes
  (job-exit-corrected-diff.log), exit 0. This includes funding retirement, designated-payer
  authorization, explicit failed-refund retry, and competing financial-claim guards.

- The earlier job-exit-final-diff.log exited 0 but reported a function difference; exit status alone
  was insufficient. Restored the intended unconditional terminal-reconciliation return and verified
  the corrected replay explicitly returned an empty diff and No schema changes found.

### 15 September 2026 — confirmed earnings filing updates

- Followed admin tax page handleMarkFiled through POST /api/admin/tax/mark-filed to
  UKEarningsStatementService.markFiled. Existing admin/fresh-MFA checks remain intact. The old
  update accepted zero affected rows and allowed ungenerated statements to be filed.
- The update now atomically filters statement_generated=true, returns contractor_id, and reports
  confirmation only for the requested contractor. No matching generated statement returns HTTP 409;
  the existing UI error path displays it instead of the success toast.
- Added service cases for missing, ungenerated, generated and database-failure responses. Final
  selected suite: 8 tests / 1 file passed (filing-after.log). Web TypeScript and changed source
  ESLint --max-warnings=0 passed. Initial sandbox runs failed before test startup; those failures
  are not regression reproductions.
- Added remediation-filing-rest.py. Real isolated local PostgREST reproduced the old ungenerated
  update, then verified zero changes for missing/ungenerated rows and returned/persisted generated
  state (filing-rest.log, exit 0). Exact synthetic records cleaned up in finally.
- No schema change, hosted mutation or external filing occurred. This is bookkeeping confirmation,
  not proof of submission to a tax authority. Reporting pagination and broader journey checks
  remain.

### 15 September 2026 — reconciliation consumer repair (in progress)

- Current worker writes boolean reconciliation_flag, but administrator GET called .includes on it.
  Added reconciliation-dashboard.test.ts: actual route reproduces TypeError plus false HTTP 200 for
  failed records/count queries (3 failed, reconciliation-dashboard-before.log).
- Route now handles boolean/legacy string flags, reads mismatch_type and reconciliation_date, does
  not infer resolved from refunded/released status, and returns 503 on unavailable queries. Three
  route tests passed (reconciliation-dashboard-after.log). Types and changed-source lint passed
  before the final conditional table-render refinement.
- Followed actual admin/payments/reconciliation page: reads previously swallowed failures; Run
  Reconciliation POST has no implementation. Added visible errors/retry and suppress empty table on
  error. This does not implement manual execution; DOM/browser verification remains.
- Required next work: durable bounded worker traversal beyond newest 100, canonical funding cash
  comparison (current worker compares gross escrow to Stripe cash), safe metadata persistence,
  explicit run history and meaningful manual execution. Existing Last Run is inferred from flagged
  record time, not authoritative execution history. Do not mark this flow complete or publish this
  partial change as complete remediation. No provider/hosted request was made.

### 15 September 2026 — durable bounded payment reconciliation

- Replaced the newest-100 worker with service-only claim/acknowledge RPCs and persistent per-escrow
  work records. Selection prioritizes unchecked/oldest checked payments, skips live leases, rotates
  expired claim tokens, and rechecks lease state after acquiring the escrow lock. Each invocation
  handles at most three records with a 25-second provider-call budget (8 seconds/call, no helper
  retries). Unknown provider failures retry after 15 minutes; completed comparisons after one day.
- Claims snapshot authoritative escrow, funding reservation and refund-balance fields. A changed
  snapshot requeues without writing a conclusion. Acknowledgement merges only reconciliation keys
  into escrow metadata in the same transaction; stale tokens cannot overwrite newer work.
- Cash comparison now uses the trusted funding reservation, verifies provider metadata identity,
  currency, received/captured amount and recorded refunds, and handles completed/release-pending/
  approval states plus refunded retired reservations. Resource-missing is distinct from other
  provider errors. These are reconciliation observations, not new payment or release authorizations.
- Durable run records expose started/completed/failed states. Manual POST now uses the same worker
  behind administrator role, fresh MFA and one request/minute. Cron is configured every five
  minutes; provider/storage errors surface as failure. No scheduler or application was deployed.
- Dashboard handles boolean flags, unavailable queries and failed manual requests, distinguishes
  batch completion from complete backlog coverage, and labels capped record counts as the current
  view. Run history comes from recorded executions, not a flagged payment's update timestamp.
- Added migration 20260915210327_durable_payment_reconciliation.sql, worker/funding comparison,
  reconciliation-dashboard/worker/page regression tests, remediation-reconciliation-queue.sql and
  remediation-reconciliation-race.py. SQL diagnostics roll back; race fixtures are precisely
  deleted.
- Real local SQL processed 105 oldest records; tested lease expiry/reclaim, stale snapshot
  rejection, metadata preservation, client grants and rollback of acknowledgement after an injected
  write failure (reconciliation-queue.log). Two service-role connections claimed distinct payments
  concurrently (reconciliation-race.log). Both exited 0.
- Final targeted tests: 21 tests / 3 files passed, 7.20 seconds (reconciliation-final-targeted.log).
  Web TypeScript and changed-source ESLint passed. Exact isolated migration replay/diff returned
  empty diff, No schema changes found, exit 0 (reconciliation-diff.log).
- Limits: Stripe responses in tests are synthetic; no real provider reconciliation, authenticated
  browser session or deployed scheduler was exercised. The three-record/five-minute schedule has
  finite throughput (at most 864 attempts/day); production backlog metrics and capacity validation
  remain necessary. Latest 100 flagged records are still a capped view, explicitly labeled; complete
  dashboard pagination remains local follow-up. Goal remains active.

- Combined sanitized full web coverage passed: 3,612 tests / 330 files, exit 0, 218.01 seconds
  (reconciliation-full-coverage.log). Final worker/API/page cases are included. No mobile behavior
  was changed or device verification claimed by this reconciliation increment.

### 15 September 2026 — complete reconciliation review pagination

- Replaced the capped latest-100 API with 50-record cursor pages. Unresolved filtering occurs in
  PostgreSQL before limiting; total/result/unresolved counts cover the full dataset. Cursor ordering
  uses creation timestamp plus UUID, preserving microsecond precision and handling missing dates.
  Cursor/filter input is validated before constructing query predicates.
- Added previous/next controls and reset navigation on filter changes. Request epochs prevent slow
  responses from a previous page/filter replacing current results. Manual runs disable navigation
  while their result is being handled. Removed capped-view labels; counts now represent all rows.
- Regression tests cover 105 unresolved records behind 100 resolved records, malformed navigation,
  next/previous/filter reset and delayed responses. Final 14 tests / 2 files passed, 6.23 seconds
  (reconciliation-pagination-tests.log). Web TypeScript passed. Changed-source ESLint passed after
  moving request invalidation into a stable cleanup callback; initial warning is not claimed as
  pass.
- Added remediation-reconciliation-pagination.py. Real isolated PostgREST traversed all 105
  unresolved rows once, excluded 100 resolved rows, and exercised microsecond timestamp ties plus 55
  missing dates (including continuation within that group). Exact fixture cleanup completed;
  reconciliation-pagination-rest.log exit 0. No schema changes or hosted/provider requests.
- This closes the capped dashboard view follow-up recorded above. Cursor pages remain live views,
  not a transactionally frozen financial export. Authenticated browser/device and production-scale
  operational verification remain outside this increment; the wider remediation goal is active.

### 15 September 2026 — F12 location fallback and native permission validation

- Traced LocationPromptModal through geocode-proxy and withApiHandler. Both forward/reverse
  geocoding POSTs omitted required CSRF headers. Manual entry therefore failed for cookie sessions;
  reverse lookup silently lost its address result. Added getCsrfHeaders to both requests, preserving
  route controls. Accepted finite zero coordinates instead of treating them as missing.
- Extracted request/state logic into useLocationPrompt.ts so the existing 678-line modal and the new
  hook both fit repository file-size checks. No provider/auth bypass was added.
- Added six actual-component tests for protected manual lookup, denied/unavailable browser location,
  granted location, zero coordinates, and retained manual text on failed save. All six passed
  (location-prompt-after.log). Initial failures included three incorrect button selectors, corrected
  to the actual label; only missing headers and zero-coordinate rejection were code defects.
- Added location-policy-browser.cjs plus its sanitized run-location-policy-browser.cjs launcher.
  Actual Next /login returned 200 with geolocation=(self). Headless Chromium with synthetic
  coordinates succeeded when permitted and returned permission-denied after denial. External browser
  requests were blocked, no login/provider call was made, and browser/server shut down
  (location-policy-browser.log, exit 0). This is a real policy check, not a full authenticated flow.
- Changed-source ESLint passed. A malformed ignored .next/dev/types/routes.d.ts initially blocked
  TypeScript; it contained duplicate trailing content. Removed only that generated file, regenerated
  route definitions using supported next typegen under sanitized credentials, then web TypeScript
  passed (location-typegen.log and location-types-final.log). No type-check exclusions were changed.
- Also reran reviewed rollback-only F1/F2 probes against the current isolated schema: sensitive RPC
  and default grants, allowed owner/denied cross-user profile writes, role/verification forgery,
  forbidden escrow/signature inserts and valid service inserts all passed (current-\*.sql.log).
  These local results do not change the recorded hosted environment distinction or prove every
  privileged database function safe. Full F1–F15 completion review remains active.

### 15 September 2026 — current acceptance ledger and financial/signing rechecks

- Added CURRENT-ACCEPTANCE.md to keep all F1–F15 requirements explicit and separate current proof
  from earlier evidence needing completion review. No finding is declared closed by a narrow probe.
- Reviewed and reran remediation-bound-idempotency.sql, remediation-payment-funding.sql,
  remediation-rework-tests.sql and remediation-contract-signing-tests.sql against the current
  disposable schema. All exited 0; all fixtures/triggers rolled back. Outputs: current-\*.sql.log.
- Proven boundaries include actor/payload replay binding, one cash/credit reservation across keys,
  exact credit restoration, ledger-failure rollback, atomic rework, unrelated-user denial and atomic
  signing evidence/acceptance. Provider/browser behavior is not inferred from these database tests.

### 15 September 2026 — F14 real SDK evidence and remaining phone OTP path

- Traced login/register routes to AuthManager and fresh anonymous clients. Existing constructor
  mocks alone did not prove installed SDK session behavior. Added auth-client-sdk-isolation.test.ts:
  real client factory and real Supabase SDK, synthetic intercepted HTTP only, reverse-order user
  login completion with privileged reads before/between/after. User clients retain their distinct
  tokens and the singleton retains its service authorization. OTP session establishment is included.
- Global test setup mocked both the factory and SDK; the first test attempt therefore exercised no
  actual SDK. Explicitly unmocked both dependencies before running the final evidence.
- Caller search found active PhoneVerificationService.verifyCode still called verifyOtp on the
  privileged singleton. Extracted verification to verifyPhoneCode.ts and switched send/verify OTP
  calls to fresh anonymous clients. Successful proof must match the current user; the profile update
  additionally matches the proved phone to reject a concurrent phone change. Auth lookup failure now
  prevents OTP sending. Service methods remain callable through the existing route.
- Added phone service tests for isolated verification, wrong identity, changed phone and failed Auth
  lookup. Combined AuthManager/real-SDK/phone regressions: 27 tests / 3 files passed
  (current-auth-client-isolation.log). Web TypeScript passed; changed-source ESLint passed after
  handling pre-existing unused results in the touched file. Normal commit hooks check final types.
- No SMS, hosted Auth request or customer interaction occurred. This proves the local client-session
  isolation contract; it does not certify the entire phone-change/provider-fallback journey.

### 15 September 2026 — F11 current capacity proof and confirmed contract durability gap

- Reviewed and reran remediation-capacity-race.py: withdrawn bid denied; two concurrent acceptances
  for one remaining slot yielded exactly one winner and three active jobs. Fixture cleanup ran.
- Followed the active bid-accept route: it commits accept_bid_with_capacity before contract
  creation. The existing retry-at-cap test passes by skipping the transition and rerunning follow-up
  work. The current bid-accept test file passed (current-bid-accept-tests.log); this is not
  unattended recovery.
- Added audit-only remediation-contract-durability-gap.py. It preserves the capacity checks then
  asserts the winning committed assignment has a contract. It currently FAILS that criterion
  (current-contract-durability-gap.log, exit 1), with exact fixture cleanup in finally. This
  deliberate failing diagnostic is not part of the web test suite and must become passing when F11
  is fixed.
- Current source has no durable contract recovery queued by acceptance. Required next change is an
  atomic contract/acceptance operation or a durable transactionally created recovery obligation,
  preserving proposal, dates, warranty/materials, contractor identity/insurance and quote linkage.
  Do not substitute a bare contract or claim client retry alone satisfies this requirement.

### F11 in-progress atomic-contract regression (2026-09-15)

The uncommitted `20260915220535_atomic_bid_acceptance_contract.sql` was confirmed installed on the
isolated `supabase_db_mintenance-audit-20260906` database. Running
`python audit/2026-09-06/remediation-contract-durability-gap.py` exited 0: an injected contract
INSERT exception rolled back both job assignment and bid acceptance; a withdrawn bid was rejected;
two independent connections competed for one capacity slot and exactly one succeeded; the winning
transaction included one contract; repeating it at capacity returned success with the same contract
and exactly two contract notifications. All new-run synthetic fixtures were cleaned. The first run
exposed an outdated diagnostic cleanup assumption (job DELETE blocked by the new contract FK);
cleanup now deletes synthetic contracts first, and the exact earlier synthetic fixture was removed
after validating its job description and example.invalid accounts.

This is a partial F11 result, not completion: the HTTP retry path still bypasses the RPC, the legacy
follow-up contract block remains, reopened jobs with retained cancelled contracts need coherent
agreement-history handling, full contract-field preservation and authorization tests remain, and
migration replay/diff plus route regression checks are outstanding. No hosted database or payment
provider was touched.

### F11 API integration and expanded checks (2026-09-15)

The acceptance route now always invokes `accept_bid_with_capacity`, including already-applied
retries, and requires its successful result before returning/caching success. Removed the separate
HTTP contract-creation block; its proposal/identity/schedule work now belongs to the transaction.
Added a route regression for an already-applied retry whose contract operation fails: returns 500
and caches no success. All 24 bid-accept route tests passed (1 file, 1.82s); web `tsc --noEmit` and
route ESLint `--max-warnings=0` exited 0. Initial sandboxed Vitest startup could not read the
config; the same sanitized launcher passed with filesystem escalation.

Expanded real-database diagnostic exited 0: denies null and unrelated actor IDs, denies
anon/authenticated execution, preserves proposal/schedule/warranty/materials/company/license, and
retains rollback/concurrency/retry assertions. The transaction actor check now matches the API:
designated payer when present, otherwise homeowner. First expanded fixture used an unsupported
license type; corrected to actual schema value `trade`, without changing the constraint. Fixtures
were cleaned on both attempts.

Remaining F11 work is recorded in CURRENT-ACCEPTANCE.md; do not treat these subset checks as closure
or public readiness.

### F11 migration replay, payer and contract-field proof (2026-09-15)

`npx --offline supabase db diff --local --workdir audit/2026-09-06/isolated-stack` completed with
exit 0 after copying the pending migration into the isolated replay directory. Inspected actual
output: `No schema changes found` and JSON `diff:""`, `files:[]`, `dropStatements:[]` (pg-delta).
This proves replay matched the isolated live schema at this point; no hosted operation occurred. The
expanded durability diagnostic then exited 0, additionally proving designated payer acceptance and
owner denial when designated, correct contract party, quote linkage and insurance
provider/policy/expiry snapshot. Existing capacity race exited 0 after its synthetic cleanup was
updated to delete newly created contracts before jobs. Formatted API regression rerun: 24 tests
passed.

Reassignment consumer review: the single-contract constraint is `contracts_job_id_key`; homeowner
and contractor job pages use job-filtered `.single()` without status; scheduling and jobs-as-payer
build per-job results from unfiltered contract lists; contract POST uses job/contractor
`.maybeSingle()`; payment/start queries already filter accepted status. Real isolated FK inspection
confirmed `payment_funding_reservations.contract_id` references contracts without delete cascade,
while signature/evidence children cascade. Thus deleting/replacing a cancelled agreement is not a
valid repair, and merely dropping uniqueness would break active-contract consumers. Next required
implementation is retained cancelled agreements plus one current agreement per job, with
corresponding consumer selection and mutation protections tested. No such history schema change has
been applied yet.

### F11 contract history implementation and full-suite verification (2026-09-15)

The pending migration now replaces job-wide contract uniqueness with a partial unique index for
non-cancelled contracts. Cancelled rows remain in place with signature/funding references intact; a
database trigger denies rewriting them. Acceptance selects only the current agreement. Updated job
pages, scheduling, jobs-as-payer, preparation/details and contract creation lookups to exclude
cancelled history. Job-filtered contract GET defaults to the current agreement; explicit cancelled
status and participant document lists retain history. Document/PDF routes using contract IDs remain
available.

Real isolated diagnostic exited 0 after independently signing a former contractor agreement,
cancelling it, and accepting another contractor: both agreements persisted, original signature
timestamps and complete acceptance snapshots stayed unchanged, and the new contract used the new
contractor. History rewrite denial, injected rollback, concurrent capacity, payer/actor denial,
quote/insurance fields and retry invariants also passed. Diagnostic transactions rolled back and
committed synthetic fixtures were cleaned.

Second isolated migration replay/diff exited 0 and actual JSON contained an empty diff, no files and
no drop statements (`current-f11-history-db-diff.log`). Full sanitized web run passed **3,633 tests
/ 334 files**, 157.77 seconds (`current-f11-full-web-tests.log`). Web types exited 0. Changed
production-file lint found 0 errors and 4 unused-variable warnings in contracts/route.ts and
scheduling.ts, so the strict zero-warning command exited 1; not reported as passing. Three new API
selection tests cover current-vs-history responses and contractor isolation with deliberately
history-first mock ordering; these complement, not replace, real SQL verification.

Still required before F11 closure/commit: review acceptance retry after negotiated contract edits,
integration with the actual job-exit finalizer rather than a synthetic status change, and final
changed-file/hook validation. The wider F1-F15 completion ledger remains active.

### F11 final interaction checks (2026-09-15)

Expanded the signed-history test to call the real `reserve_job_exit` withdrawal/finalization
operation, then accept the replacement contractor. It passed with job reopening and original
signature snapshots intact. An initial diagnostic used reversed actor/job arguments and was
corrected to the actual function signature; no authorization control was changed. A separate
regression reproduced retry failure after allowed unsigned-contract amount/scope edits. Fixed the
wrapper to compare the original bid amount only for a new acceptance, while an already-applied
assignment still requires the correct parties and valid current contract status. The revised
diagnostic passed with amount 550 and negotiated scope preserved, no new contract or duplicate
notifications.

Removed unused import/local computation/query/helper/catch binding responsible for the four
changed-file warnings. Strict changed-source ESLint now exits 0. Final replay and normal commit
hooks are being checked; the prior complete web run was 3633/334 and the prior schema diff was
empty.

### F11 committed validation checkpoint

Implementation commit `d4e792995` passed all normal commit hooks, including web/mobile types,
zero-warning staged lint and selected tests. Final focused contract suites passed **81 tests / 6
files**, 4.63 seconds. The final migration replay (`current-f11-final-db-diff.log`) exited 0 and its
actual result was `diff:""`, no generated files or drop statements. This supersedes the earlier
pending final-check notes; full-suite evidence remains 3633 tests / 334 files, followed by the
focused tests after unused-code cleanup and real SQL checks after the final negotiated-term
correction. No hosted changes or real-provider actions occurred. Overall remediation remains active;
next confirmed local follow-up is earnings-query truncation and batched metadata failure handling.

### Earnings completeness and metadata failures (2026-09-15)

Both `getStatement` and `listEarners` now read escrow rows in ascending-ID cursor pages, continuing
until an empty page rather than assuming a short server-capped page is final. Errors discard the
incomplete result, and a missing/non-advancing ID fails instead of looping or double-counting.
Contractor statements restore chronological presentation after loading. Contractor metadata queries
use batches of 100 IDs and reject provider errors instead of presenting missing names/filing state;
statement tax-profile errors are distinguished from a missing record. No schema changes.

`remediation-earnings-pagination-rest.py` on the isolated stack reproduced the old request
truncating **1205 synthetic payments to 1000**. Actual PostgREST cursor queries returned all 1205
IDs once, principal 120500 and recorded payout 106040. Synthetic rows/users were cleaned and service
credentials stayed in memory. This verifies real query behavior; unit tests separately execute the
TypeScript service/helper. The focused run passed **14 tests / 2 files**, including totals above
1000, a lower 137-row server cap, later-page failure, ignored cursor, second metadata-batch failure
and unavailable tax-profile handling. Web types and zero-warning source lint exited 0.

This repair proves pagination completeness for stable records, not a database snapshot across
concurrent settlement changes. Point-in-time reporting under concurrent financial changes,
tax-policy/legal suitability and broader real-provider verification are not established by these
tests. The overall F1-F15 objective remains active.

### F6 current webhook review: two reproduced guards repaired, atomic job transition still open

New synthetic handler regressions reproduced four failing cases: failed/cancelled PaymentIntent
lookup errors were swallowed, and succeeded events for `pending_review` /
`awaiting_homeowner_approval` attempted to reset escrow to held. The lookup now throws on database
error; failed/cancelled and charge-failed callers share that behavior. Traced active POST through
StripeWebhookService: a handler exception marks the event failed and returns an API error instead of
marking it processed. Added both post-funding states to the success guard. Updated the pre-existing
lookup-error test to require rejection as well as no mutations.

After repairs, **46 tests / 4 files passed**, covering the new cases, existing handler state tests,
success CAS diagnostic and webhook idempotency. Web type check completed with an empty error log;
changed-source zero-warning lint exited 0. No provider calls or database mutations were used for
this subset. Changes remain uncommitted.

F6 is NOT closed. Current failure/cancellation handlers still log escrow UPDATE errors and fall back
to a stale selected row before writing jobs. Success and terminal handlers also persist escrow and
job payment status in separate statements, leaving a cross-statement race with refunds/releases/new
funding. The remaining repair must make authoritative escrow/job transitions atomic (with existing
job-before-escrow lock order) and test concurrent processing, losing compare-and-set, missing rows
and injected write failure. This confirmed source path is distinct from the narrower lookup/state
guards fixed here.

### F6 atomic persistence in progress (16 September 2026)

CLI-created migration `20260915225551_atomic_webhook_payment_transition.sql` adds a service-only
`apply_payment_intent_state` RPC. It locks job then escrow, rechecks actual state/funding and
obsolete attempts, validates succeeded amount/currency against the trusted funding ledger, and
updates escrow plus job in one transaction. PaymentIntent success/failure/legacy cancellation and
charge failure now call it; split job writes and stale-row update fallbacks were removed.
Reserved-credit cancellation still uses its existing dedicated credit-restoration transaction and
requires lock-order review.

Real rollback-only SQL (`remediation-webhook-atomic.sql`) passed injected job-write failure (escrow
also rolls back), funding both records, late failure no-op, seven post-funding states, amount
rejection, cancellation and client EXECUTE denial. Initial diagnostic fixture description was
corrected to satisfy the existing length constraint. More importantly, real SQL exposed
schema/implementation drift: escrow permitted `cancelled`, not `canceled`, and neither escrow nor
jobs permitted the `disputed` state used by active dispute handlers. The pending migration preserves
canonical escrow cancellation, maps provider cancellation to it, and explicitly admits disputed in
both applicable constraints. No existing constraint was disabled.

Handler tests now assert the atomic RPC and absence of metadata-driven/separate job writes.
Corrected an old concurrency diagnostic that could pass on any thrown error: it now requires the
actual RPC call and no side effects on an ignored transaction result. The focused suites pass,
changed-source lint exits 0, and the web type check passed after initial RPC integration.
Protected-state checks precede credit lookup so retired funding does not turn an obsolete success
event into endless retries.

Still uncommitted and not F6 closure: actual concurrent-connection races,
missing/newer/funded-credit cases, reserved-cancellation lock order, full affected webhook suites,
current types and isolated migration replay/diff remain required. No hosted schema or payment
provider was touched.

### F6 concurrency and funding regression results (16 September 2026)

Attachment and cancellation now acquire the job lock before their funding/escrow locks, matching
webhook/refund/release/job-exit ordering. Real two-connection diagnostics
(`remediation-webhook-races.py`) wait until pg_stat_activity confirms the leading connection is
sleeping while holding its job lock, then start the competitor: success-first ignores late failure;
failure-first is followed by valid success; both end held/paid. Missing and older intents cannot
alter a newer paid job. A cancellation-first race on a 50000-gross/45000-cash/5000-credit
reservation ends cancelled/canceled with 5000 credits restored; waiting success returns no row and
cannot revive it. Committed synthetic fixtures were explicitly cleaned.

Extended `remediation-payment-funding.sql` passed: gross 50000 is rejected as the provider cash leg,
45000 funds the full 50000 principal and paid job, cancellation remains exactly-once, and late
success cannot revive cancelled credit funding. Its fixtures and fault injection roll back. The full
sanitized web suite passed **3646 tests / 336 files**, 153.75 seconds
(`current-webhook-atomic-full-tests.log`). Migration replay is running; final types/hooks/diff
results will be recorded separately. No provider or hosted database requests occurred.

### F6 committed validation checkpoint

Implementation commit `c8f318686` passed normal hooks (web/mobile types, staged lint, selected tests
and repository checks). Final `supabase db diff --local --workdir audit/2026-09-06/isolated-stack`
exited 0 and actual output was `No schema changes found`, JSON empty diff, no files/drop statements
(`current-webhook-atomic-db-diff.log`). Current web type-check log was empty with exit 0. Combined
evidence: 3646/336 full web tests, real rollback SQL, controlled two-connection races, cash/credit
invariants and replayed migration. This supersedes prior pending replay/commit notes for F6. Actual
Stripe delivery and deployed schema parity are outside these isolated results; no readiness claim
for unverified provider journeys is made.

### F7 rework review-state mismatch and durable notification (16 September 2026)

Traced enhanced photo verification to HomeownerApprovalService.requestHomeownerApproval, which
persists `awaiting_homeowner_approval`. The rework RPC only accepted `held`. A rollback-only copy of
the current diagnostic using that reachable status reproduced `Escrow is not available for rework`.
CLI-created pending migration `20260915231739_durable_rework_review_transition.sql` accepts
held/awaiting approval, returns escrow to held, resets approval/inspection flags plus auto-release,
auto-approval and cooling-off deadlines, and persists the contractor notification in the same
transaction as the rework record/job reopening. Other financial states remain excluded;
administrative hold flags are preserved.

Both `remediation-rework-tests.sql` and new `remediation-rework-awaiting.sql` passed on the isolated
DB: injected job failure and injected notification failure roll back the transition; valid requests
reopen work and clear all deadlines; replay preserves exactly one notification; unrelated actors are
denied. Route now confirms the RPC boolean, skips supplementary email on replay and does not
independently create another in-app notification. **28 tests / 2 files passed**, 3.36 seconds; web
type log is empty. No external email or SMS was sent.

Still required before F7 closure/commit: web/mobile callers omit stable Idempotency-Key headers
(server fallback is generated), so response-loss retry can hit a new key after the job is already
reopened. Client retry identity, visible UI behavior, remaining concurrency with approval/release
and migration replay are pending. Email remains best-effort; the durable guarantee is the in-app
notification. Changes are uncommitted.

### F7 client response-loss regression checkpoint (16 September 2026)

Both active photo-review screens now keep per-attempt keys across retries while mounted, scoped to
job/completion timestamp/trimmed feedback (mobile also includes current actor). Edited feedback gets
a different key; returning to original feedback reuses its original key. Synchronous refs prevent
concurrent submissions before state rerenders. Both clients require `success: true`, keep feedback
on failure, and disable editing while sending. Web displays structured API messages and refreshes
job data after confirmed success. Mobile cancellation is disabled while sending.

`rework-review.test.tsx` tests lost responses, key/payload reuse, feedback changes, pending
duplicate clicks, malformed HTTP-success responses and structured errors. Combined with route and
replay-access tests: **32 tests / 3 files passed**, 3.41 seconds
(`current-rework-final-web-tests.log`). Mobile `HomeownerPhotoReviewScreen.test.tsx` renders the
real screen and controls with network/photo-data boundaries mocked: response-loss retry and missing
confirmation both pass, **2 tests / 1 file**, 8.256 seconds (`current-rework-mobile-tests.log`).
These are component tests, not device evidence. Web/mobile type checks exited 0 with empty logs;
affected web/mobile source lint exited 0. The two rollback-only SQL fixtures were rerun successfully
against the isolated audit DB.

Remaining concrete F7 work is not waived: key maps do not survive remount/restart, the unused
`JobCRUDService.requestJobChanges` helper still has no explicit key contract, and approval writes
must serialize with rework. Current `HomeownerApprovalService.approveCompletion` reads parties and
photos then claims escrow by status/approval only, without a locked completed-job check; its history
write follows separately. `confirm-completion/route.ts` separately sets the job flag then escrow
approval, with only preflight state checks. These paths require atomic decision/recovery work and
real race tests before F7 closure. The existing countdown/approval UI promises also need comparison
with the authoritative release policy. Migration replay and new `remediation-rework-races.py` are
pending at this checkpoint; no hosted/provider operations occurred.

Final local database results for this checkpoint: isolated migration replay/diff exited 0 with
`No schema changes found` and actual JSON `diff: ""`, no files or drop statements
(`current-rework-db-diff.log`). `remediation-rework-races.py` passed both real two-connection cases
after observing the leading transaction holding the job lock in `pg_stat_activity`: same-key retry
returns false, different-key request is rejected after reopening. Both cases leave one rework
record, one notification and in_progress/held with cleared auto-approval date. All committed
synthetic fixture records were explicitly cleaned. This supersedes the pending replay/race note
above, but does not close the separate approval/release and restart work.

### Atomic completion approval and release decision checkpoint (16 September 2026)

CLI-created migration `20260915233945_atomic_completion_approval.sql` adds service-only
`approve_job_completion`. Both the job confirm route and HomeownerApprovalService now use it. It
locks job then latest escrow; verifies the designated payer and exact completed_at version; rejects
protected financial states, active disputes and administrative holds; and requires verified=true
after-photos created after the latest rework. Automatic approvals recheck their deadline, enabled
flag and verification score inside the transaction, rather than trusting an older service read. Job
confirmation, escrow approval, history, status log and contractor notice commit together. A replay
returns the existing decision without changing the deadline or resending email. Explicit approvals
consistently use the existing 48-hour cooling-off rule; the existing explicit approve-and-release
waiver remains the only waiver path. Disabling automatic release is not overridden. A waiver attempt
cannot silently change an already approved cooling-off decision.

The rollback diagnostic exposed another real trigger conflict: rework after an actual confirmation
raised `Cannot unconfirm job completion once confirmed`. The reversal trigger now permits only the
existing postgres-owned, job-specific rework transaction marker on completed -> in_progress.
Ordinary reversal remains denied. `claim_escrow_release` now rechecks approval, cooling-off, holds,
disputes and automatic-release scheduling under the shared locks; prior API/agent reads cannot
substitute for the claim-time checks. Existing remaining-principal/refund guards are preserved.

The confirm route binds idempotency to the completion version, checks current authorization/status,
and still invokes the idempotent transaction on cached responses to detect intervening rework.
Web/mobile review screens submit the version they displayed and require explicit success before
showing approval. UI and approval email now describe pending release checks, not an already-sent
transfer. The alternate escrow approval route uses the same designated-payer rule and bounds
comments at 5000 characters. Supplementary email failure does not undo a committed approval; durable
in-app notice/history are the required atomic records.

Executed evidence:

- `remediation-completion-approval.sql` passed on the isolated database. Rollback-only tests cover
  private function ACL, owner-versus-designated-payer authorization, null-verified photo rejection,
  seven protected escrow states, eligible automatic approval, injected history/notification
  failures, unchanged cooling-off on replay, one notice/history, approved -> rework, stale
  completion version, old-photo rejection after rework, fresh-cycle waiver, and release refusal
  during cooling-off or without new approval.
- `remediation-approval-races.py` passed five real two-connection cases. It observes both the
  leader's held job lock and follower's lock wait. Approval -> rework and rework -> approval end
  in_progress/ held/unapproved; duplicate approval ends completed/held/approved with one history
  row; release -> rework preserves release_pending; rework -> release blocks the transfer claim.
  Exact synthetic records are cleaned. Log: `current-approval-races.log`.
- `remediation-remaining-release-claim.sql`, `remediation-fee-only-settlement.sql`,
  `remediation-remaining-release-race.py` and `remediation-fee-only-race.py` all passed. Their
  fixtures now establish approval through the real RPC and synthetic verified evidence; release
  controls were not weakened for these tests. Remaining-refund principal and fee-only settlement
  invariants hold.
- Full sanitized web suite: **3650 tests / 337 files passed**, 154.94 seconds
  (`current-approval-full-web-tests.log`). After adding final service/client/version regressions,
  **55 tests / 5 files passed**, 4.14 seconds (`current-approval-final-tests.log`). Old route tests
  that asserted independent writes were replaced with current API contract/recovery assertions;
  database invariants are exercised by the real SQL/race diagnostics above.
- Mobile screen: **3 tests / 1 file passed**, 9.124 seconds (`current-approval-mobile-tests.log`).
  Native modules/network boundaries are mocked; this is not device/provider verification.
- Current web/mobile types exited 0 with empty logs. Affected web/mobile source lint exited 0. Final
  isolated migration replay/diff exited 0: `No schema changes found`, actual JSON empty diff, no
  files/drop statements (`current-approval-db-diff.log`).

F7 is still open for restart recovery, review of other request/reject/inspection/photo-verification
writers and countdown behavior against the actual policy. The broader F1-F15 completion gates remain
intact. No hosted mutation, external email, real payment or deployment occurred.

## 16 September 2026: completion review actions and review-page recovery

The service-only `record_completion_review` RPC serializes request, inspection and rejection with
approval/rework using job then escrow locks. It binds the completion version, enforces
designated-payer access, preserves replay deadlines, and commits required history and notifications
atomically. The actual photo-verification caller now supplies the actor and captured completion
version.

The separate homeowner review page now sends CSRF-protected requests, requires an explicit success
result, retains failed input, prevents duplicate submissions, and shows load errors with retry. Its
data route uses the actual job relationship and explicit photo types, signs authorized storage
paths, and reads every metadata page. The database timestamp predicate preserves microsecond
precision after rework.

Executed validation:

- Rollback-only `remediation-review-actions.sql` passed on the isolated database: actor
  restrictions, replay, stale version, notification/history failure rollback.
- `remediation-review-races.py`: eight real two-connection ordering cases passed; the diagnostic
  observes lock waits, not just sequential calls.
- `remediation-review-data-rest.py`: actual local PostgREST join and pagination returned 205 fresh
  after-photos plus one before-photo and excluded old evidence across a microsecond boundary. This
  uses service-role REST, not an authenticated browser-to-Next journey. Synthetic records were
  cleaned.
- Full sanitized web suite: 3668 tests / 340 files passed in 154.70 seconds. Final focused checks:
  29 tests / 4 files passed in 2.23 seconds.
- Web type check and affected-source lint were rerun successfully, exit 0.
- Isolated migration replay completed with actual JSON empty diff and no drop statements
  (`current-review-db-diff.log`). No hosted schema was changed.

F7 remains open: the enhanced verification route still has separate photo-status writes requiring
completion-version fencing; restart recovery, reminder/countdown behavior, and browser/device
verification remain. This checkpoint does not establish public readiness or close the other F1-F15
acceptance gates.

## 16 September 2026: measured photo-quality regression

Tracing enhanced verification through the shared analyzer exposed a separate active quality-gate
defect: `VerificationRules.validatePhotoQuality` replaced measured zero brightness/sharpness with
0.5/0.7 using truthiness defaults. The same helper is used by the before/after photo upload routes.
A new diagnostic generates real 1200x1200 black and white PNGs with Sharp and runs the real analyzer
and quality rules; only the HTTP/URL boundary is stubbed. Both cases failed before the fix with
sharpness 0.7 instead of the actual zero. The fix preserves zero and treats absent measurements as
zero, so blank photos cannot pass this gate.

After the fix, the image regressions plus before/after upload route and job-lifecycle tests passed:
54 tests / 4 files, 2.24 seconds. Those route tests mock provider and database boundaries; the new
two-image test exercises actual image processing. This is boundary evidence, not an accuracy
evaluation of the overall verification model.

Further source tracing confirms the enhanced endpoint still needs resource-owned current-cycle
evidence and atomic completion-version-fenced writes. Its broad URL allowlist is not proof that
submitted photos belong to the job. The mobile `PhotoUploadService.verifyPhotos` wrapper sends no
required payload, but a full source search found no production callers (only its own tests), so it
is not evidence of a currently reachable failing screen. Do not close F7 based on the quality fix.

### In-progress completion photo fencing

CLI-created migration `20260916003207_fence_completion_photo_verification.sql` was applied only to
the disposable audit database. The new private RPC locks job then current escrow, validates
actor/completion version and bound current-cycle photo IDs, and saves verification plus review
request in one transaction. The rollback-only `remediation-photo-verification.sql` passed (exit 0),
exercising client execute denial, wrong actor, stale version, unbound evidence and successful atomic
review/notification creation. This is not yet concurrency/rollback-complete coverage.

The route now binds supplied paths to verified job photo metadata before analysis, limits input to
20 distinct photos, signs the stored paths for quality analysis, and uses the RPC instead of
separate escrow/review writes. It reads actual latitude and longitude, preserving zero coordinates
and preventing absent location from passing geolocation. Still required before this work is
committed: route regressions, current-cycle and rollback/race cases, migration replay, and
signed-URL/metadata identity reconciliation in before/after comparison. This is an unfinished local
checkpoint, not a readiness claim.

### Photo metadata identity and unavailable-verification handling

Metadata lookup now uses the exact-origin extracted storage path when available, so a renewed
signing token does not sever geolocation/timestamp identity. Missing or invalid timestamps no longer
become the current time. Before-photo queries now fail on database error and renew bound storage
URLs before comparison.

Tracing the comparison arithmetic found another concrete false-positive path: AI unavailable/error
previously returned score 0.5, which combined with matching geolocation produced 0.65 and passed the
0.6 threshold. Unavailable/failed AI now returns zero; parsed model scores must be finite and within
[0,1], and measured zero is preserved. This prevents an unavailable provider from supplying positive
evidence. The configured provider model and complete provider integration still need review; these
changes do not establish model accuracy or successful external delivery.

Six new image/metadata regressions passed; combined with before/after upload and job-lifecycle
checks, 58 tests / 5 files passed in 2.72 seconds. Web type checking passed, exit 0. Still pending:
enhanced-route tests, full RPC concurrency/rollback coverage, migration replay, final lint and
commit.

### Photo-verification transaction recovery and races

The expanded rollback-only SQL diagnostic passed with an injected notification failure: neither
verification status nor review deadline survived the failure.
`remediation-photo-verification-races.py` passed four actual two-connection cases:
verification/rework in both orders and verification/approval in both orders. It observes the
follower waiting on the job lock and checks persisted final states; synthetic records are cleaned.
Migration replay is running separately in the isolated stack; do not mutate its schema until that
process is terminal.

Migration replay subsequently completed with empty actual JSON diff and no drop statements
(`current-photo-verification-db-diff.log`). Affected source lint passed with zero warnings after
removing an unused catch binding. Enhanced-route regressions and remaining verification integration
review are still pending.

### Enhanced endpoint regression boundary

Six enhanced-route regressions passed (1.31 seconds): wrong contractor, foreign Supabase origin,
missing bound evidence, exact actor/photo/version RPC payload, stale-completion error and absent
commit result. These isolate the handler; auth wrapper and database/provider boundaries are mocked,
while earlier SQL diagnostics exercise the real transaction. Web types passed after these additions.

Integration tracing found before/after upload writers did not populate the existing `storage_path`
column. Both now save their server-generated object path. Their 29 tests / 2 files passed in 2.33
seconds. Existing null-path records still require compatibility/backfill validation; do not treat
the new lookup as fully integrated until that is resolved. The full sanitized web suite is running
separately in `current-photo-full-web-tests.log`; its outcome is not yet asserted here.

### Full-suite result and legacy compatibility

The full sanitized web run completed successfully: 3684 tests / 343 files, 154.84 seconds
(`current-photo-full-web-tests.log`). This run preceded the final legacy lookup changes. Those
changes paginate same-job verified after-photo metadata, resolve old exact-origin stored URLs to
object paths, and compare against submitted object identity. They never accept a foreign-origin URL
or a photo from another job. Comparison receives renewed image URLs separately from persisted
metadata URLs; legacy exact-URL metadata fallback remains available when no path row exists. Eleven
focused endpoint/metadata tests passed in 1.87 seconds and web types passed. A final
pagination-failure regression was then added for the next focused run. No hosted backfill or
production data mutation was performed.

### Photo-verification checkpoint validation

Final focused run after legacy compatibility and pagination-error checks: 43 tests / 5 files passed,
2.79 seconds (`current-photo-final-tests.log`). Affected route/service lint passed with zero
warnings. Web types passed after legacy integration. Earlier real SQL rollback, four concurrent
ordering cases, and empty migration replay remain applicable: no schema changes followed that
replay. Normal commit hooks are required.

This checkpoint does not close all F7 requirements or establish provider/model accuracy. Remaining
review includes restart recovery, reminder/countdown semantics, provider configuration/timeouts and
authenticated browser/device journeys, alongside the full F1-F15 acceptance ledger. Historical
in-progress notes above describe the sequence; this paragraph records the final local validation
state for this checkpoint.

## 16 September 2026: reachable completion deadline copy

Source tracing found no production callers of `sendReminderNotifications`; its legacy helpers must
not be represented as a verified active delivery path. The reachable web homeowner review page and
mobile job-details escrow modal did still promise automatic payment release after seven days. Their
wording now distinguishes conditional automatic approval from subsequent cooling-off/release checks.
The web label is “Review deadline” and uses a date-fns suffix so past deadlines read “ago” instead
of suggesting a future countdown.

Web and mobile type checks passed (exit 0), as did lint of both changed components with zero
warnings. This is source/type/lint validation of a presentation change; no browser or
physical-device rendering is claimed. Full F7 restart/recovery and remaining audit acceptance
requirements remain open.

## 16 September 2026: rework completion-version fencing in progress

Restart-recovery tracing found a missing prerequisite: rework POSTs carried only comments, so stale
screens could reopen a later completion. Web/mobile now send the displayed completedAt; the route
requires it and binds it into idempotency payload matching. New private
`request_job_rework_for_completion` locks the job, checks payer and version, delegates the existing
atomic transition, and records completion_version with the durable request. Replay checks that
stored version before returning without mutation. The original internal four-argument RPC remains
for existing trusted callers and diagnostics; production caller inventory must be rechecked before
this checkpoint is complete.

CLI-created migration `20260916005125_fence_rework_completion_version.sql` applied only to the
isolated audit database. Rollback-only `remediation-rework-version.sql` passed stale-version
rejection, valid transition, exact replay and persisted version. Pending: API/client test contract
updates, concurrency checks, migration replay, restart-persistent retry identity and final
lint/types. This unfinished work is local and uncommitted. Prior deadline-copy edits remain in the
worktree.

### Rework replay across new transport keys

The versioned rework RPC now recognizes the same actor/job/completion/comments decision even with a
new transport key. The job lock serializes this lookup with the transition. The real rollback
diagnostic passed stale-version rejection, exact replay and new-key replay with only one durable
rework record. This removes reliance on an in-memory key for server-side duplicate prevention; it
does not by itself prove recovery of unsent draft text or the complete restarted UI journey.

Updated route/replay tests carry the displayed completion version and continue to assert actor
authorization before cached success: 28 tests / 2 files passed in 3.28 seconds. The otherwise unused
mobile JobCRUDService wrapper now requires and sends completedAt rather than retaining an
incompatible API signature. Still needed: client/type checks, versioned concurrency tests, migration
replay and completion of the broader restart/recovery acceptance review. No hosted mutation
occurred.

### Versioned rework clients and real ordering checks

Web review tests: 5 passed / 1 file, 2.37 seconds. Mobile review tests: 3 passed / 1 suite, 7.953
seconds. Fixtures now include a real completion timestamp and assert that exact version in the
request; mobile provider/native boundaries remain mocked. Web and mobile type checks both exited 0.

`remediation-rework-version-races.py` passed five real lock-order cases with the versioned RPC:
approval/rework in both orders, duplicate approval, release/rework in both orders. It checks
persisted job/escrow/history and cleans exact synthetic fixtures. Isolated migration replay is now
running in `current-rework-version-db-diff.log`; do not mutate that schema until terminal.

### Versioned rework checkpoint

Isolated migration replay exited 0 with actual empty JSON diff and no drops
(`current-rework-version-db-diff.log`). Final combined API/access/web review tests passed, including
missing-version rejection before mutation and exact version passed to the RPC
(`current-rework-version-final-tests.log`). Earlier web/mobile type checks, three mobile screen
tests and five real ordering cases apply. Affected web source lint passed; mobile lint found a
pre-existing array-style warning in the edited JobCRUDService file, corrected without behavior
change. Normal commit hooks still run. No real user/device/provider journey or hosted deployment is
claimed.
