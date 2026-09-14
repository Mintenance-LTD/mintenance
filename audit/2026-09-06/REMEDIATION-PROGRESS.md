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
