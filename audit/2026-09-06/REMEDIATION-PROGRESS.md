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
