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
