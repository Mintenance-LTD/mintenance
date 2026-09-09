# Mintenance production-readiness audit — completed 7 September 2026

**Not ready for public users.** The local database permits privilege escalation and fabrication of
authoritative marketplace records. Payment retries, credits, webhook concurrency and rework contain
additional defects. A successful build and passing selected tests do not establish safe operation. I
would not enable real contracts, payments, payouts or private property information in this version.

**Hosted verification update:** Supabase MCP has now checked both production and staging. Production
blocks the demonstrated profile-role UPDATE and older sensitive RPC execution; staging/fresh local
do not. Production still permits the unsafe escrow/contract INSERT fields and exposes two newer
contribution-reward functions to anonymous callers. See the
[hosted Supabase verification](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/audit/2026-09-06/HOSTED-SUPABASE-VERIFICATION.md)
for the authoritative environment comparison, exact evidence and repair gates. No hosted data was
modified.

## A. Coverage and limitations

Audited the current working tree on `codex/migrate-next-proxy`, commit
`b6fda5b8a3c67b1cd30bfddcb7f556599e8089a6`. Existing modifications were preserved:
`.github/workflows/ci-cd.yml`,
[apps/web/**tests**/api/payments/release-escrow-helpers.test.ts](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/__tests__/api/payments/release-escrow-helpers.test.ts),
[apps/web/package.json](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/package.json),
and `package-lock.json` (initially 296 additions, 80 deletions). Root AGENTS.md was read; its
historical failure counts were not treated as current evidence. No application behavior was changed.

Primary evidence: route implementations and their callers, shared authentication/idempotency
helpers, Stripe consumers, SQL grants/policies/functions/triggers, mobile services/screens, test
implementations, local PostgreSQL experiments and browser inspection. This is representative breadth
with deeper job-to-payment coverage, not exhaustive review of every route or dependency.

### Executed checks

| Check                                        | Observed result                                                                                                                       | Limits                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Hosted Supabase MCP                          | Production and staging privileges, policies, defaults, triggers, functions, migrations, views, bucket settings and advisors inspected | Read-only metadata; no customer rows or hosted mutation tests                                        |
| Hosted HTTP                                  | Auth/settings and zero-row REST queries returned 200; retired payout function returned 410                                            | No hosted login, customer content or Stripe operation                                                |
| Web and mobile TypeScript                    | Both passed, `--noEmit --incremental false`                                                                                           | No native compilation                                                                                |
| Complete web Vitest suite                    | 284 files, 3,119 tests passed                                                                                                         | Includes the initial six audit diagnostics; mocks still apply; not additive to selected suite counts |
| Fresh-stack integration suite                | 9 suites passed, 1 suite failed during fixture setup; 62 tests passed, 4 skipped                                                      | Real Supabase Auth/REST/database; no Stripe transactions                                             |
| Audit copy of cross-user suite               | 4 tests passed                                                                                                                        | Valid separate messaging fixture and returned-row assertions; original suite unchanged               |
| Added storage diagnostic                     | 1 test passed                                                                                                                         | Confirms unsafe schema/helper behavior; supplemented by real HTTP reproduction                       |
| Selected payment/webhook Vitest suites       | 13 files, 216 tests passed                                                                                                            | Provider and database mocks; not payment certification                                               |
| Selected journey/auth/security Vitest suites | 38 files, 411 tests passed                                                                                                            | Not equivalent to cross-account browser tests                                                        |
| Selected mobile Jest suites                  | 4 suites, 124 passed, 5 skipped                                                                                                       | Services/hooks/schema contracts; no emulator                                                         |
| Added diagnostic Vitest tests                | 2 files, 6 passed                                                                                                                     | Assertions reproduce defects; passing means defect observed                                          |
| Full-web ESLint                              | 2,352 files, 0 errors, 899 warnings                                                                                                   | Warnings remain; no automated fixes applied                                                          |
| Sensitive-path ESLint                        | 30 files, 0 errors, 5 warnings                                                                                                        | Not full repository lint                                                                             |
| Production web build                         | Passed, Next 16.2.12, webpack; TypeScript enabled                                                                                     | Dummy isolated environment; build does not prove providers work                                      |
| `npx supabase db diff --local`               | Completed; nonempty diff                                                                                                              | Local database is behind current migrations                                                          |
| Local SQL role/isolation diagnostics         | Executed with synthetic homeowner, contractor, admin and unrelated-user identities; rolled back                                       | `SET LOCAL ROLE authenticated`/auth UID, not real login sessions                                     |
| Browser                                      | Landing, login, registration and password-reset navigation; desktop and 390px layout inspection                                       | Public-screen pass only; authenticated requests were tested separately through HTTP                  |
| Real web HTTP                                | Cookie login 200, property PUT/GET 200, logout 200 and subsequent protected request 401                                               | Also reproduced private-image disclosure and mobile bearer rejection; no payment provider            |

Commands were discovered from package scripts and configs. On this Windows host, npm's PowerShell
shim was broken, so npm/npx were invoked using their installed Node CLI files. Node was 22.15.0
versus repository `.nvmrc` 20.19.4. Type checks used
`node node_modules/typescript/bin/tsc --noEmit --incremental false -p apps/{web,mobile}/tsconfig.json`.
Test commands and output are retained in the adjacent logs. The complete web suite was subsequently
run; full-web lint results are recorded in the completion appendix. Native builds, full mobile tests
and device tests were not run.

The original local stack initially provided only PostgreSQL and was behind current migrations. To
remove that limitation, a disposable stack named `mintenance-audit-20260906` was created with
separate ports (API 55321, database 55322), copied current migrations and seed execution disabled.
All current migrations applied successfully. Auth, REST and Storage became available. The rollback
SQL diagnostics reproduced F1, F2, F6 and F7 against this fresh schema; real authenticated REST
reproduced self-admin escalation. The existing database was not reset or migrated. Hosted Supabase
infrastructure was subsequently inspected read-only through MCP; the deployed web bundle and hosted
money-moving journeys remain outside the verified scope.

The initial build was stopped when explicit dotenv loading was discovered. The successful retry
prepopulated environment names to prevent loading real integration values and supplied dummy
local/test values. No live payment, deployment, production mutation, real-user communication or AI
provider request was made. Initial browser login used synthetic input without a configured auth
service. Subsequent real HTTP requests successfully logged synthetic accounts into the web
application against disposable local Auth, and verified logout. No credentials or customer records
were included in this report.

### Implementation map

| Surface                  | Implementation and trust boundary                                                                                                                                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web                      | Next.js App Router in [apps/web](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web); server components, client components, API routes and `proxy.ts`. Cookie JWT authentication coexists with Supabase bearer authentication.                                                             |
| Mobile                   | Expo 54 / React Native 0.81.5 / React 19.1 in [apps/mobile](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/mobile); Supabase sessions, direct Supabase services, and `mobileApiClient` requests to web APIs. Device-only payment, refresh, deep-link and upload behavior remains untested. |
| Shared packages          | Types, shared utilities, auth, API contracts/client, data access, security, shared UI/design tokens and AI core. Shared schemas help, but do not enforce consistency across independently implemented flows. `demo-video` is not a marketplace client.                                                      |
| Database                 | Supabase/PostgreSQL with RLS, grants, triggers and SECURITY DEFINER RPCs. The large August baseline is active SQL; many earlier migration files are historical marker comments. September migrations must be evaluated after that baseline.                                                                 |
| Direct access            | Mobile services directly access profiles, jobs/bids, messaging and storage; browser Supabase access also exists. Consequently API authorization alone cannot secure these records.                                                                                                                          |
| Privileged access        | Web `serverSupabase` services/routes bypass RLS with service credentials. Each route must validate actor, role, resource ownership and transition before the privileged call.                                                                                                                               |
| Money                    | Stripe PaymentIntents, Connect onboarding/transfers, refunds, subscriptions and webhook processing; local escrow records mediate work and release. Fees and credits are calculated across separate services.                                                                                                |
| Background/notifications | Vercel cron routes, payment reconciliation, queued notifications, email/push integrations and realtime consumers. Delivery and recovery depend on external services and scheduler execution.                                                                                                                |
| AI                       | Building-surveyor assessment API/service pipeline with model calls, schema validation, image fetching, caches, confidence/abstention handling; optional Python SAM/YOLO/VLM services. No accuracy or latency measurement was performed.                                                                     |

Business rules are split between API routes, service helpers, database functions/triggers and client
screens. Core trace: job UI → job API and ownership/tenancy validation → job row; bid UI/service →
bid row; acceptance API → atomic bid RPC → contract creation; contract acceptance → job payment
eligibility; PaymentForm/mobile hook → create-intent → Stripe + pending escrow; signed webhook →
held escrow; contractor work APIs → completed job; homeowner approval/release API → conditional
escrow claim → Stripe transfer → final database state. Several findings concern gaps between those
steps rather than a missing screen.

Interface/source reachability was established for job creation/discovery, bids, contracts, payments,
work evidence, messaging and assessment displays. Only public authentication/navigation screens were
exercised in-browser; authenticated property mutation/read and cookie login/logout were subsequently
exercised through the real web HTTP pipeline. Property teams, tenant invitations/landlord
organizations and designated payers are implemented and require additional cross-account tests;
their existence does not establish complete property-management journeys. Unused webhook helpers,
historical migrations, examples and mocks were not treated as active safeguards.

## B. Prioritized findings

Line references below are repository-relative to the audited commit plus preserved working changes.
Diagnostic evidence includes `fresh-database-diagnostics.log`, `local-http-diagnostics.json`,
`diagnostic-tests.log`, `storage-diagnostics.log` and the integration-test logs. Fresh-schema and
real HTTP results supersede earlier environment limitations below.

### F1 — Critical in staging/fresh local; production scope narrowed: effective-grant drift

**Hosted scope correction:** Production denies authenticated UPDATE of `profiles.role` and
anon/authenticated execution of the inspected deletion/bid/idempotency RPCs. Do not report that
specific self-admin exploit as reproduced in production. Staging retains the permissive grants.
Production still has unsafe default ACLs and anonymously executable new contribution-reward
functions with no caller authorization. These are additional manifestations of the same grant
defect; the hosted verification details the evidence, impact and targeted fix.

**Location:**
[supabase/migrations/20260805194939_uk_earnings_statement_bookkeeping.sql:37449](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/supabase/migrations/20260805194939_uk_earnings_statement_bookkeeping.sql:37449)
(profiles grants), `:35440` (function grants), `:39218` (default function privileges); earlier
lockdown files such as `20260508100543_lock_profiles_privileged_columns_table_level.sql` contain
marker comments rather than executable remediation.

**Journey/preconditions:** Any authenticated user with direct database API access. The local schema
grants table-level privileges despite the baseline's narrower column grants. Narrower GRANT
statements do not revoke broader existing grants. Similarly, revoking function access from PUBLIC
does not revoke explicit anon/authenticated grants.

**Expected/actual:** Users can edit safe profile fields but cannot promote themselves. The unrelated
synthetic user successfully updated their own `profiles.role` to `admin`, then read another owner's
property. Before promotion the property and draft job were correctly hidden. Fresh-schema SQL and
real REST both reproduced this escalation. Effective function privileges also permit
anon/authenticated execution of supposedly service-only functions, including `delete_user_data` and
`accept_bid_atomic`; destructive functions were not invoked.

**Impact/evidence:** Administrative data isolation is defeated in the tested database. Fresh
temporary table/function probes reproduce the baseline grant mechanism, including role UPDATE and
anonymous function EXECUTE. This is stronger evidence than merely spotting permissive SQL, but
deployed ACLs remain unverified.

**Smallest fix:** Explicitly revoke table-level privileges from anon/authenticated before granting
safe columns; explicitly revoke sensitive function EXECUTE from PUBLIC, anon and authenticated.
Correct default privileges and supply a forward migration for existing installations. Review all
sensitive definer functions rather than fixing only profiles.

**Acceptance:** Apply the complete migrations to a fresh local database and an upgrade fixture;
owner can edit permitted fields, cannot change role/verification/payment identifiers, and unrelated
users remain isolated. Anonymous/authenticated callers cannot execute service-only RPCs. Assert
effective privileges, not migration text alone.

### F2 — Critical, high confidence: clients can fabricate funded escrow and accepted contract/bid state

**Hosted evidence:** Production column privileges, participant INSERT policies, CHECK constraints
and trigger metadata confirm the unsafe INSERT authority. Actual fabrication was exercised locally
only. Production UPDATE restrictions do not repair INSERT authority.

**Location:** August baseline `:32923` (`escrow_insert_policy`), `:37444` (escrow INSERT grant),
`:34159` and `:37408` (contract INSERT), `:32424`, `:32434`, `:36926` (bid policies/grants).
Consumers:
[apps/web/app/api/jobs/[id]/start/route.ts:103](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/jobs/[id]/start/route.ts:103),
[apps/web/app/api/payments/create-intent/route.ts:196](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/payments/create-intent/route.ts:196),
[apps/web/app/api/payments/release-escrow/\_helpers.ts:125](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/payments/release-escrow/_helpers.ts:125)
(`performStripeTransfer`).

**Journey/preconditions:** Authenticated owner/contractor using direct database access to their own
permitted records, without self-promoting. Insert policies check participation but do not constrain
authoritative columns.

**Expected/actual:** Only trusted server transitions establish payment funding and signatures. SQL
diagnostics inserted a `held` escrow with no PaymentIntent, an `accepted` contract with the other
party's signature timestamp, and an accepted bid whose amount the contractor subsequently changed
from £500 to £900.

**Impact:** Work can appear funded without payment; acceptance/signature evidence is forgeable; the
payable amount can drift after agreement. Release checks still require the applicable job,
approval/evidence and payout gates: this is not a claim that any user can instantly withdraw
arbitrary funds. However, the transfer helper trusts escrow principal and does not require an
authoritative source charge before making the transfer. A colluding or misled job participant can
carry forged state into those gates.

**Smallest fix:** Remove direct writes to financial and signed lifecycle fields; expose constrained
trusted transitions. Enforce initial states, immutable accepted amounts and participant-owned
signatures in the database. Require a verified captured payment/ledger entry before work funding or
release. This remains necessary after F1's general ACL repair because broad lifecycle INSERT is
explicitly granted.

**Acceptance:** Direct client attempts to insert held/released escrow, forge either signature or
insert/edit an accepted bid fail. Legitimate server transitions work. A completed approved job with
no captured provider funds cannot transfer platform money.

### F3 — High, high confidence: caller-supplied idempotency keys are not scoped to the caller or payload

**Location:**
[apps/web/lib/idempotency.ts:87](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/lib/idempotency.ts:87)
(`checkIdempotency`), `:363` and `:397` (key extraction); August baseline `:7490`
(`try_claim_idempotency_key`), `:21301` (uniqueness);
[apps/web/app/api/payments/create-intent/route.ts:392](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/payments/create-intent/route.ts:392).

**Scenario:** Two otherwise authorized requests use the same supplied key for an operation. Helpers
preserve the header verbatim; database identity is key plus operation, with no
caller/resource/request digest. The diagnostic seeded another synthetic payer's cached result and
observed create-intent return that cached client secret for a legitimate different job without
creating a payment.

**Expected/impact:** A retry must replay only the same actor/resource/payload. Current behavior can
leak cached payment details or return another operation's result. Exploitation requires a
shared/known key; this is not evidence that random unguessable keys are enumerable. Bid acceptance
also checks its cache before resource authorization.

**Fix/acceptance:** Namespace all keys by authenticated actor, operation and resource; persist a
canonical payload hash and reject mismatches with 409. Enforce authorization before cache return.
Test identical headers across users/jobs and changed amounts as well as same-request replay.

### F4 — High, high confidence: ordinary create-intent retries cannot recover the payment secret

**Location:**
[apps/web/app/api/payments/create-intent/route.ts:295](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/payments/create-intent/route.ts:295)
(existing escrow guard), `:392` (later idempotency replay), `:637` (pending insert);
[apps/web/components/payments/PaymentForm.tsx:180](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/components/payments/PaymentForm.tsx:180)
(client request).

**Scenario:** Provider creation and pending escrow persistence succeed, but the response is lost or
the screen reloads. A retry encounters pending escrow and returns 400 before reaching the cached
client-secret response. Diagnostic: first request 200, same-key retry 400, one Stripe creation.

**Impact:** A customer cannot resume the normal payment flow after an interruption. Existing
concurrent-dedup tests return an empty escrow list even after insertion, hiding the
persistence-dependent failure.

**Fix/acceptance:** Recover the caller's authorized pending attempt before treating an existing row
as conflict; check provider status and return a resumable result. Define cancellation/expiry
recovery. Test persisted rows, lost responses, reload with a new client key, double taps and
completed/canceled intents.

### F5 — High, high confidence: referral credit reduces the contractor's recorded principal

**Location:**
[apps/web/app/api/payments/create-intent/route.ts:440](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/payments/create-intent/route.ts:440)–`:447`,
`:520`, `:637`;
[apps/web/app/api/payments/release-escrow/\_helpers.ts](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/payments/release-escrow/_helpers.ts)
(`calculateReleaseFeeBreakdown` consumers).

**Scenario/evidence:** A £500 accepted bid uses £50 referral credit. Diagnostic observed Stripe
amount £450 and escrow principal £450. Release calculates from that reduced escrow amount; no
corresponding referral subsidy is added by the inspected release/webhook consumers.

**Expected/impact:** Credit should reduce the homeowner's cash contribution without silently
reducing the agreed contractor compensation. The current record conflates contract value with cash
collected and therefore underfunds settlement.

**Fix/acceptance:** Keep gross contract value, customer cash, platform-funded credit and remaining
settlement balance separately. Preserve the existing credit-restoration intent but make
reservations/restoration durable and idempotent. Test £500 = £450 cash + £50 credit, correct agreed
payout/fees, cancellation, provider failure and replay.

### F6 — High, high confidence: success webhook can overwrite a concurrent release claim

**Location:**
[apps/web/lib/services/stripe-webhook/payment-intent-handlers.ts:115](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/lib/services/stripe-webhook/payment-intent-handlers.ts:115),
`:154`, `:174` (`handlePaymentIntentSucceeded`); actual consumer
[apps/web/lib/services/stripe-webhook/stripe-webhook-service.ts](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/lib/services/stripe-webhook/stripe-webhook-service.ts)
via
[apps/web/app/api/webhooks/stripe/route.ts](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/webhooks/stripe/route.ts).

**Scenario:** Handler reads a nonterminal escrow; release claims it as `release_pending`; handler
writes `held` using only its ID. Its earlier snapshot check does not guard the later write. The
real-handler mock diagnostic reproduced that interleaving, and the local database accepts
release_pending → held. This was not a live simultaneous Stripe transfer test.

**Impact:** The release exclusion claim can be undone, allowing contradictory/repeated processing.
The transfer helper uses a stable escrow-scoped Stripe idempotency key, which mitigates duplicate
transfers on ordinary retries; this diagnostic does not prove a duplicate provider payout. It does
establish loss of the database exclusion invariant across operations. Separately, escrow lookup
errors are logged and returned rather than thrown, so the outer service may mark a transiently
unhandled event processed.

**Fix/acceptance:** Conditional state transition with an allowed source-state predicate or locked
transaction; interpret zero updates safely. Throw retryable lookup/persistence errors so they are
not acknowledged as processed. Test explicit barriers across webhook/release/refund/dispute workers
and failure before/after provider success. Preserve signature verification and durable event
deduplication.

### F7 — High, high confidence: requesting changes fails against the job status trigger

**Hosted evidence:** MCP retrieved the attached production trigger and its unconditional rejection
of transitions out of completed, matching the local failure.

**Location:**
[apps/web/app/api/jobs/[id]/request-changes/route.ts:157](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/jobs/[id]/request-changes/route.ts:157)
and `:184`; August baseline `:8977` (`validate_job_status_transition`), `:9009`, `:28015` (trigger
attachment).

**Scenario:** Homeowner requests rework on completed work. Route first resets escrow approval data,
then attempts completed → in_progress. The active trigger refuses every transition out of completed.
SQL diagnostic returned `Cannot transition from completed status`.

**Expected/impact:** Rework should reopen the job and reset approval together. Instead the second
operation fails, potentially leaving approval cleared while the job remains completed; the
contractor cannot follow the advertised rework loop.

**Fix/acceptance:** One authorized, locked database operation updates job and escrow together and
permits this specific rework transition when money has not been released. Test completed → rework →
completion → approval, rollback on failure, and a concurrent release attempt.

### F8 — High, confirmed with a real Supabase token: proxy verifies mobile tokens with the cookie verifier

**Location:**
[apps/mobile/src/utils/mobileApiClient.ts:56](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/mobile/src/utils/mobileApiClient.ts:56),
`:166`;
[apps/web/proxy.ts:190](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/proxy.ts:190);
[apps/web/middleware/auth.ts:90](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/middleware/auth.ts:90);
[packages/auth/src/jwt.ts:114](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/packages/auth/src/jwt.ts:114),
`:128`; compare
[apps/web/lib/auth.ts:659](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/lib/auth.ts:659).

**Scenario:** Mobile obtains a Supabase access token and sends Bearer authorization to a protected
web API. Proxy uses the app's custom JWT secret and HS256 verifier, while downstream authentication
supports Supabase `getUser`. ES256 tokens necessarily fail that proxy verifier; HS256 tokens signed
with a different Supabase secret also fail.

**Evidence/impact:** A real access token obtained by signing a synthetic account into the fresh
local Supabase Auth service received HTTP 401 `Invalid token` from the unchanged web proxy at
`/api/properties`. The same account successfully authenticated via the web cookie login endpoint.
The earlier ES256 helper diagnostic additionally demonstrates algorithm incompatibility. Protected
mobile API requests fail before the route verifier; native UI behavior remains untested.

**Fix/acceptance:** Share a consistent verified Supabase bearer path through proxy and route,
separate from cookie JWT validation. Test real local Supabase homeowner/contractor tokens through
the entire request pipeline, expired/revoked tokens and cookie sessions. Do not bypass
authentication to accommodate mobile.

### F9 — High, high confidence from source; provider test outstanding: partial refund leaves an inconsistent principal and job

**Location:**
[apps/web/app/api/payments/refund/route.ts:177](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/payments/refund/route.ts:177),
`:336`, `:358`, `:366`, `:474`;
[apps/web/lib/services/stripe-webhook/charge-handlers.ts:60](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/lib/services/stripe-webhook/charge-handlers.ts:60);
release fee/transfer helpers.

**Scenario:** Refund £100 of a £500 escrow. Route compares refund against the original amount and
returns partial escrow to held, without reducing its authoritative remaining principal; it then
attempts to cancel the job even for a partial refund. Charge refund processing records refunds, but
the inspected payout calculations still consume escrow amount.

**Impact:** Cancellation and money remaining disagree; subsequent refund/release decisions can use
the original principal. A canceled job may block release, so this is not a demonstrated automatic
overpayment from this route alone. External/admin partial refunds and subsequent settlement require
explicit invariant tests.

**Fix/acceptance:** Track cumulative refunded and available settlement balances, with a deliberate
partial-versus-full lifecycle policy. Preserve pending provider outcomes and reconcile failures.
Test £500 − £100 = £400 remaining; retries, successive refunds and concurrent release must never
refund plus transfer more than funded value. Use Stripe test mode to verify actual status handling.

### F10 — Medium, high confidence: signing succeeds before its evidence is durably stored

**Location:**
[apps/web/app/api/contracts/[id]/accept/route.ts:203](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/contracts/[id]/accept/route.ts:203),
`:236`;
[apps/web/lib/services/contracts/ContractSignatureService.ts:75](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/lib/services/contracts/ContractSignatureService.ts:75),
`:86`.

**Scenario:** Contract acceptance update succeeds but signature-row insertion fails. Signature
service logs a nonduplicate failure and returns; acceptance has already been persisted and may make
payment eligible. A retry can encounter the already-signed guard.

**Impact:** Visible signing success can lack the submitted signature artifact. This is a technical
evidence-retention defect, not a legal conclusion about enforceability.

**Fix/acceptance:** Persist signature artifact/version evidence and acceptance state atomically, or
use a durable recoverable intermediate state. Inject signature persistence failure: no final
accepted response/state until evidence is durable; retry recovers without duplicate signatures.

### F11 — Medium, high confidence from source: capacity guard breaks acceptance recovery and is not concurrency-safe

**Location:**
[apps/web/app/api/jobs/[id]/bids/[bidId]/accept/route.ts:238](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/jobs/[id]/bids/[bidId]/accept/route.ts:238),
`:247`, `:271`; atomic acceptance RPC locks the job, not a shared contractor capacity record.

**Scenario:** Free/basic contractor's third job is assigned; follow-up contract creation fails.
Retry checks the now-full capacity before recognizing `acceptanceAlreadyApplied`, preventing
recovery. Two different jobs can also both observe a count below the cap and be accepted
concurrently. Eligibility/tier/early-access branches determine applicability.

**Impact:** Accepted jobs can remain without their contract; published capacity limits are not
reliable under concurrent acceptance. These interleavings were traced statically, not reproduced
with two real API workers.

**Fix/acceptance:** Recognize same-job recovery before new-capacity checks; serialize capacity
decisions per contractor inside the assignment transaction. Make contract follow-up durable. Barrier
test at cap−1 allows only one new assignment; interrupted third acceptance can resume.

### F12 — Medium, high confidence from configuration/source: global policy disables implemented geolocation

**Location:**
[apps/web/next.config.js:532](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/next.config.js:532);
callers
[apps/web/app/contractor/(dashboard)/jobs/[id]/components/JobPhotoUpload.tsx:106](<C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/contractor/(dashboard)/jobs/[id]/components/JobPhotoUpload.tsx:106>),
[apps/web/app/contractor/(dashboard)/jobs/[id]/components/JobMapCard.tsx:54](<C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/contractor/(dashboard)/jobs/[id]/components/JobMapCard.tsx:54>),
[apps/web/app/contractor/(dashboard)/discover/components/LocationPromptModal.tsx:103](<C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/contractor/(dashboard)/discover/components/LocationPromptModal.tsx:103>).

**Scenario/impact:** A user selects an implemented location action. Global
`Permissions-Policy: geolocation=()` prevents supported browsers granting access, even if the user
wants to allow it. Location-assisted discovery and automatic photo location cannot operate as
intended. This does not establish that file-input camera capture is disabled.

**Fix/acceptance:** Permit same-origin geolocation where required, retaining explicit consent and a
manual fallback. Browser test allowed, denied and unavailable location states, including preserved
form input.

### F13 — High, confirmed end-to-end: property photo re-signing grants access to another owner's private object

**Location:**
[apps/web/lib/api/job-storage.ts:29](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/lib/api/job-storage.ts:29)
(one-year default), `:81` (`extractJobStoragePath`), `:113` (`resignJobStorageUrls`);
[apps/web/lib/validation/schemas-user.ts:338](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/lib/validation/schemas-user.ts:338);
[apps/web/app/api/properties/[id]/route.ts:62](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/properties/[id]/route.ts:62)
(GET) and `:197` (PUT).

**Journey/preconditions:** A logged-in homeowner can edit their own property's photos and knows
another private object's key, for example from an expired or previously shared URL. No administrator
role or access to the other property is required. Random object keys are not assumed enumerable.

**Expected/actual:** Access to one's own property should not authorize signing another property's
object. The schema accepts any URL, the writer stores it unchanged, and the reader extracts a
Job-storage key without checking URL origin or object ownership. Its privileged signer then issues a
fresh bearer URL, by default valid for a year.

**Reproduction:** Uploaded a valid synthetic PNG under owner A's private key. Owner B's direct
Storage download was denied. B logged into the web application and PUT an unrelated-origin URL
containing A's key into B's own property's photos. On a normal cold worker, GET of B's property
returned a signed URL that downloaded A's exact PNG bytes. PUT and GET both returned 200. All
accounts, objects and properties were synthetic; the report contains no signed URLs. The warm-worker
attempt initially failed because of F14, which is not a dependable safeguard.

**Impact:** Previously known or expired private-image references can be turned into renewed access
without the owner's permission, defeating property/photo isolation and revocation expectations.

**Smallest fix:** Store owned object references instead of trusting arbitrary URL paths. At write
and signing time, verify bucket/key association with an authorized property/job/upload; validate
exact configured origin for legacy URL conversion. Shorten bearer URL lifetime and enforce access
again on renewal. Origin validation alone does not repair same-origin cross-owner keys.

**Acceptance:** A legitimate owner can upload/view their own image. Another owner cannot attach,
re-sign or fetch its key, including an expired same-origin URL, an unrelated-origin URL with the
same path and a bare key. Repeat on warm and cold workers; direct Storage and web API decisions must
agree.

### F14 — High, confirmed SDK/runtime behavior: login changes the identity of the shared privileged client

**Location:**
[apps/web/lib/auth-manager.ts:84](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/lib/auth-manager.ts:84)
(`AuthManager.login`) and `:236` (registration);
[apps/web/lib/api/supabaseServer.ts:150](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/lib/api/supabaseServer.ts:150)
(lazy singleton and proxy); shared options disable persistence but do not prevent in-memory
sessions.

**Journey/preconditions:** A worker uses the shared `serverSupabase` instance for user login and
subsequently for privileged database/storage work. The SDK retains the user session in memory even
with `persistSession:false`.

**Expected/actual:** A service client should retain its fixed service identity; each login should
use a separate auth client. With identical SDK options and the actual local provider, the same
service client could read another user's property before sign-in and returned zero rows after
signing in as the unrelated account. The real warm web worker could not sign the other owner's
object after login; the cold worker could, proving identity-dependent operation in the application
path.

**Impact:** Server operations can unexpectedly run under the most recently signed-in user's RLS
identity. This causes intermittent failures and unreliable privileged operations across requests; it
is not proof that every request discloses the last user's records. It also complicates verification
of every service-role fallback. Registration uses the same shared client and should be isolated too.

**Smallest fix:** Use a fresh anon/auth client for sign-in/sign-up/password operations. Keep the
service client immutable and dedicated to server-authorized operations. Do not solve this with a
shared sign-out after login, which introduces another cross-request race.

**Acceptance:** Interleave two users' logins with privileged operations and assert the service
client's request identity never changes; session state is isolated. Run warm-worker, cold-worker and
concurrent request tests against real Supabase.

### F15 — Medium, confirmed: isolation tests can mistake missing counts for denied writes

**Location:**
[apps/web/**tests**/integration-real/cross-user-isolation.integration.test.ts:103](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/__tests__/integration-real/cross-user-isolation.integration.test.ts:103)
(invalid message fixture), `:203`, `:305` and `:308` (mutation assertions); installed
[node_modules/@supabase/postgrest-js/src/PostgrestTransformBuilder.ts:26](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/node_modules/@supabase/postgrest-js/src/PostgrestTransformBuilder.ts:26)
(actual SDK contract).

**Scenario/impact:** The original suite fails in setup because a message targets an unassigned
contractor. After correcting that in an audit-only copy, its positive assigned-contractor write
assertion fails: mutation `.select()` accepts only columns, not the supplied `{count,head}` options.
Thus `count` remains null. Denial assertions using `(count ?? 0)` can pass without establishing that
a write affected zero rows. This weakens test evidence, not the database's actual authorization
rules.

**Fix/acceptance:** Give messaging and unassigned-discovery separate valid fixtures. Assert actual
returned mutation rows and verify persisted values where appropriate, or request supported counts at
the mutation builder. In the audit copy, these corrections preserved the intended access
expectations and all four tests passed. Original tests were preserved; the initial suite failure
remains recorded.

### Architectural/operational risks requiring verification

1. **Reconciliation backlog coverage:**
   [apps/web/lib/services/payment/PaymentReconciliationService.ts:67](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/lib/services/payment/PaymentReconciliationService.ts:67)
   processes only the newest 100 rows, without a persisted cursor or pagination in this method.
   Verify eventual coverage of older mismatches. The earlier suspicion about `.neq(column, null)` is
   withdrawn: actual PostgREST testing on a nullable text column returned the same expected non-null
   row as `.not(column, 'is', null)`. It must not be cited as a confirmed defect.
2. **Deployment/upgrade parity:** Current migrations applied successfully to the disposable fresh
   stack and the critical flaws reproduced there. The original database remains behind. Validate a
   representative upgrade path and the eventual deployed effective ACLs/triggers; fresh-stack
   success alone does not establish deployment parity.
3. **Notification durability:** Queued and immediate/fire-and-forget paths coexist. No delivery,
   duplicate suppression, provider outage recovery or scheduler execution was established. Confirm
   bounded delivery time for signing, disputes and payment events, including retries and dead
   letters.
4. **AI and performance:** No representative model evaluation, load test or measured provider
   latency. The assessment route permits long synchronous work (route budget 300 seconds; model call
   timeout 150 seconds). Verify interruption/cancellation, cost accounting, retry duplication and
   high-load behavior before exposing it broadly.
5. **Unproven security boundaries:** Real cookie/bearer revocation, MFA step-up, password reset,
   CORS/CSRF combinations, upload content/ownership and deployed storage grants require live local
   integration tests. Suspicious patterns were not promoted to vulnerabilities without an
   established exploit path.

Optional improvements: broaden keyboard/focus and contrast checks beyond the public screens; align
request schemas and error handling across web/mobile; make operational recovery states
understandable in the UI. These are not substitutes for the fixes above.

## C. Journey readiness matrix

No complete sensitive journey is marked verified working. “Partially verified” means inspected
implementation plus component/SQL evidence, not a successfully completed user journey.

| Journey                                        | Status                 | Evidence / remaining verification                                                                                                                                                                                                             |
| ---------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration and email verification            | Partially verified     | Registration UI and local auth/profile-trigger tests; confirmed synthetic accounts used for other journeys. Verification-email delivery/link completion not exercised.                                                                        |
| Login/logout/reset/session expiry/MFA          | Partially verified     | Real web cookie login/logout passed; protected request after logout returned 401. Public reset navigation and auth tests passed; email/reset completion, expired sessions and MFA interaction remain unverified. F14 affects shared identity. |
| Profile creation and role isolation            | Confirmed failing      | SQL self-admin escalation; onboarding UI/provider completion untested                                                                                                                                                                         |
| Contractor verification and payout setup       | Static inspection only | Server/provider paths present; Connect test account, KYC failure/retry needed                                                                                                                                                                 |
| Property create/edit/photos/documents/sharing  | Confirmed failing      | Real own-property PUT/GET worked, but F13 returned another owner's private PNG. Direct Storage correctly denied that download. Sharing-role/document lifecycle remains partial.                                                               |
| Job drafts/create/publish                      | Partially verified     | Schemas/routes and draft isolation inspected/tested; no authenticated browser completion                                                                                                                                                      |
| Discovery/matching/cancellation                | Partially verified     | Reachable implementation; global geolocation restriction; full lifecycle/provider cancellation unverified                                                                                                                                     |
| Bid submission/edit/withdrawal/rejection       | Confirmed failing      | Direct accepted-state insertion and amount mutation; other branches static/selected tests                                                                                                                                                     |
| Bid acceptance                                 | Confirmed failing      | Forged state and static capacity/recovery defects; no complete two-client acceptance                                                                                                                                                          |
| Contract generation/review/access/signing      | Confirmed failing      | SQL forged signatures; nontransactional evidence persistence; PDF/display/device signing not end-to-end tested                                                                                                                                |
| Messaging/attachments/unread                   | Partially verified     | Real cross-user message/document read/write/delete isolation passed in the corrected diagnostic suite. Chat UI, realtime, unread synchronization and offline behavior remain unverified.                                                      |
| Notifications                                  | Static inspection only | Queue/provider code inspected; real delivery and scheduler unverified                                                                                                                                                                         |
| Payment initiation/authentication/confirmation | Confirmed failing      | Retry, key scoping, credit diagnostics; no Stripe challenge/test-mode completion                                                                                                                                                              |
| Escrow/receipts                                | Confirmed failing      | Fabricated held escrow and webhook interleaving; receipts not end-to-end verified                                                                                                                                                             |
| Scheduling/start/evidence/completion           | Partially verified     | Role/ownership and transition checks plus database lifecycle tests; fabricated funding affects start. A private PNG upload/download was exercised, but work-evidence UI and completion were not end-to-end verified.                          |
| Requested changes                              | Confirmed failing      | Completed → in_progress rejected by actual local trigger                                                                                                                                                                                      |
| Approval/payout release                        | Partially verified     | Selected tests passed; financial authority and webhook concurrency defects block trust; no provider transfer                                                                                                                                  |
| Refunds                                        | Confirmed failing      | Source-level partial accounting/state defect; provider execution unverified                                                                                                                                                                   |
| Disputes/admin intervention                    | Partially verified     | Routes/RPC boundaries inspected; local schema drift and F1 block assurance                                                                                                                                                                    |
| Reviews/contractor responses                   | Static inspection only | No separate-user end-to-end review/moderation exercise                                                                                                                                                                                        |
| Account deletion/retention                     | Static inspection only | Active escrow/job/dispute guards and external cancellation sequencing inspected; deletion/export/retention not executed                                                                                                                       |
| AI photo assessment/downstream output          | Static inspection only | Validation, consumers, fallbacks inspected; no inference or accuracy evaluation                                                                                                                                                               |
| Mobile protected API journeys                  | Confirmed failing      | Real local Supabase access token was rejected by the web proxy with 401; cookie login for the same account succeeded. Device UI and handoffs remain unverified.                                                                               |

Failure coverage actually exercised: persistent create-intent retry, cached-key collision, credit
application, webhook/release interleaving in mocks, illegal rework transition and direct cross-role
SQL. Interrupted mobile handoffs, provider challenges/outages, full concurrent multi-worker payments
and storage/network interruptions remain outstanding.

## D. What is implemented well

- Create-intent derives the accepted bid and checks actor/job/contract records rather than simply
  trusting a submitted amount
  ([apps/web/app/api/payments/create-intent/route.ts](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/app/api/payments/create-intent/route.ts)).
  F2 and F5 explain why that is insufficient today, not why this control is worthless.
- Release/refund code uses conditional escrow claims and records reconciliation cases when provider
  operations succeed but database writes fail. Existing release-helper tests cover meaningful
  failure cases. The webhook overwrite in F6 must be fixed to preserve those claims.
- The active Stripe webhook entrypoint verifies signatures and uses persisted event deduplication
  with failure states. Unused similarly named route helpers were not counted as protection.
- Cookie auth has hashed refresh-token rotation/family handling and revocation checks; logout cookie
  attributes are intentionally matched. These are useful foundations pending actual session/MFA
  integration tests and bearer alignment.
- Ordinary property/draft RLS hid another user's records before privilege escalation in the SQL
  experiment. Messaging implements participant predicates and stable tuple pagination rather than
  unrestricted thread reads.
- AI assessment includes user/context-scoped caching, budget checks, downstream URL validation,
  bounded fetch/model work, structured output validation, circuit breaking and abstention/confidence
  handling. The permissive top-level image warning is followed by validation; it was not misreported
  as a confirmed SSRF hole. Assessment displays include limitations. None of this proves model
  accuracy.

## E. Remediation order and completion criteria

### 1. Must fix before real users or real money

1. **Repair and verify database, object-signing and client authority (F1, F2, F13, F14).** This is
   the dependency for every API/UI assurance. Fresh and upgrade databases must pass anonymous,
   owner, contractor, admin and unrelated-user privilege tests with real REST/storage access.
2. **Restore payment ledger and state invariants (F3–F6, F9).** Scope replay keys, resume pending
   attempts, separate credits from principal, make webhook writes conditional, and account for
   remaining funds. Pass real local-database integration tests plus Stripe test-mode
   challenge/retry/refund/transfer tests. Include provider-success/database-failure crash points and
   prove eventual recovery without duplicate money movement.
3. **Repair rework and acceptance/signature recovery (F7, F10, F11).** Make cross-record transitions
   transactional or durably resumable. Demonstrate the complete signed-contract → paid → work →
   rework → approved → settled journey with separate participants.
4. **Align mobile authentication (F8).** Required before admitting mobile users; demonstrate
   successful protected requests and failed expired/revoked/other-user requests through proxy and
   route.

### 2. Must fix before broader public launch

- Establish reproducible full local services and migration parity; rerun integration/browser suites
  with separate accounts and adversarial resource IDs. Add storage policies/content/size/signed-URL
  tests and sharing-role tests; repair original integration evidence defects (F15).
- Resolve reconciliation query/backlog behavior, notification delivery/retries and F12 geolocation
  policy. Confirm operational alerts reach the responsible operator without contacting customers
  during tests.
- Complete account lifecycle, MFA/admin intervention, dispute, deletion/retention and
  accessibility/responsive journeys. Verify screen success corresponds to authoritative final state;
  preserve input and provide resumable pending/error states.
- Validate AI on a labeled, representative holdout set: hazardous-condition misses,
  uncertainty/abstention, severity, geography/property/image-quality slices and price-range
  coverage. Set release thresholds with domain reviewers; route uncertain/high-risk findings to
  humans. Do not use model confidence as measured accuracy.
- Measure realistic concurrency, queue delays and assessment latency/cost, with provider failures
  and interrupted clients. Exercise native payment handoffs, session refresh, deep links,
  background/resume and uploads on both supported mobile platforms.

### 3. Can follow after launch

Further UI polish, additional noncritical analytics, expanded model capabilities and broader
performance optimization can follow once measured requirements and the safety gates above pass. No
rewrite is warranted by this audit: the evidence supports targeted repairs to trust boundaries,
state transitions, recovery and tests.

## F. Candid engineering assessment

I would allow a synthetic-data internal demonstration with integrations disabled. I would not invite
real homeowners or contractors to enter private property information, sign contracts or move money
in this version. Even a controlled real-user pilot needs the database authority repairs first;
disabling Stripe alone does not protect personal data or contract integrity. A later restricted
pilot could exclude AI advice and mobile until their specific evidence exists, but it must still
complete the actual enabled journeys with separate users. Public readiness cannot be established
while those journeys remain unverified.

## Audit artifacts

Added application-adjacent files are only
[apps/web/**tests**/audit/readiness-payment-diagnostics.test.ts](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/__tests__/audit/readiness-payment-diagnostics.test.ts)
and
[apps/web/**tests**/audit/readiness-auth-webhook.test.ts](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/__tests__/audit/readiness-auth-webhook.test.ts).
Added audit files are this report, diagnostic SQL/scripts, isolated server/build launchers and
execution logs in `audit/2026-09-06`. SQL experiments end in ROLLBACK. The audit-only server was
stopped and its temporary output cleaned. The disposable Supabase project was stopped with no
backup; the original project was preserved. Copied migrations were removed after recording their
SHA-256 manifest and the isolated config. The Vitest diagnostics assert observed failures and should
be converted into expected-safe regression tests when fixing the defects. No production
configuration, application route or service was edited. Additional audit-only files include
[apps/web/**tests**/audit/readiness-storage-diagnostics.test.ts](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/__tests__/audit/readiness-storage-diagnostics.test.ts),
[apps/web/**tests**/integration-real/readiness-audit-cross-user.integration.test.ts](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/apps/web/__tests__/integration-real/readiness-audit-cross-user.integration.test.ts),
local HTTP diagnostics, launchers and completion logs. The cross-user copy is an isolated diagnostic
correction, not a modification of the original suite.

## Completion evidence and remaining release gates

The audit work available on this host is complete; remediation is not part of this audit. The fresh
local environment closed the original database/Auth/REST/Storage access gap. The remaining release
gates are real Stripe test-mode challenges/transfers/refunds and webhook delivery, email/reset/MFA
end-to-end behavior, native mobile/device handoffs, authenticated browser journey coverage, AI
evaluation and realistic load/recovery measurements. These were not substituted with mocked success.
No complete money-moving journey is marked verified.

The original 62 passing integration tests include database state/RLS exercises for bids, escrow,
payments, contract/review records, signup-trigger behavior, and compliance/notifications. They do
not exercise Stripe: the `payment-flow` title refers to local payment rows. Admin-created confirmed
fixtures bypass email verification. The corrected four-test copy adds meaningful
property/job/message/document/report isolation but does not establish immutable profile roles (F1
tests that separately).

### Usability, security and operating limits

Public pages were inspected at desktop and narrow mobile width: labeled form controls, public
navigation and role-oriented entry points were reachable; the narrow layout hid the large brand
panel and fit the cookie controls. These observations do not prove authenticated keyboard flow,
screen-reader quality or contrast compliance. The real HTTP probes establish server outcomes, not
complete UI journeys. No measured production latency is claimed from development compilation
timings.

Upload evidence is now stronger than static analysis: Storage rejected a disallowed text/plain
fixture, accepted a valid synthetic PNG, and denied an unrelated direct download. The web signing
path nevertheless disclosed it (F13). Content restrictions therefore work for those samples but
cannot substitute for object authorization. Other document formats, polyglots, size extremes,
interruption cleanup and signed-URL revocation remain acceptance tests. Cookie CSRF code and
protected-route authentication were inspected; no claim is made that all cross-origin combinations
or every redirect/SSRF/XSS surface were exhaustively exercised.

The AI pipeline has structured validation, bounded provider work and abstention behavior, but no
model invocation was performed and no empirical accuracy was inferred. Hazard misses, uncertainty
calibration, emergency escalation, photo-quality failures and price-range coverage require a labeled
evaluation plus domain review before users rely on assessments. Background notification and
reconciliation behavior requires scheduler/provider failure testing beyond unit tests.

The full-web lint run completed with 0 errors and 899 warnings across 2,352 files. The successful
production build and initial web/mobile type checks remain valid evidence for the original
application tree; a final web type check also covers the added diagnostic files. No application
fixes were applied.

## Final repair gate

Use the
[hosted Supabase verification](C:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean/audit/2026-09-06/HOSTED-SUPABASE-VERIFICATION.md)
together with this report. It corrects environment scope without discarding valid local
reproductions. The primary dependency is a canonical effective-permission contract verified on
fresh, upgraded, staging and production schemas; migration history alone failed to preserve that
contract. Then repair shared-client identity/object signing and financial recovery, and convert each
diagnostic into an expected-safe regression test. The supplied read-only authority snapshot was
executed successfully against production and still reports the identified unsafe client authority.
No application fixes or hosted mutations were performed.
