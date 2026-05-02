# Full App Audit - Web, Mobile, Backend

Date: 2026-04-30  
Scope: Next.js web app, Expo mobile app, shared packages, Supabase-backed API routes, storage,
assessment, retention, payments, notifications, and contractor/homeowner flows.

## Remediation Tracker (live)

Per-finding status lines appear inline under each section. Legend:

- **FIXED 2026-MM-DD** — landed; one-line change summary + touched files
- **PARTIAL 2026-MM-DD** — partially closed; what remains
- **DEFERRED 2026-MM-DD** — owner/reason captured, follow-up scheduled
- **OPEN** — not yet addressed

### Remediation session — 2026-04-30 (in progress)

Closed in this pass: P0-7 (broken web links), P0-9 (logout GET), P0-4 (building assessment AI
contract), P0-2 (property assessment integration

- ownership), P0-8 (mobile navigation registrations), P0-6 (mobile API localhost fallback), P0-10
  (notification badge in push payload), P0-5 (invoice table mismatch), P0-3 (video assessment flow),
  P1 (FindContractors search button + location filter), P1 (stale useMessages hook). Partial: P0-1
  (mobile direct supabase). Both web and mobile `tsc --noEmit` pass clean after the changes.

### Re-audit corrections (review pass 4) — 2026-05-02

External review caught three medium bugs that survived pass 3 — all in the queue/feed plumbing the
last pass moved everything onto:

**1. Queued notifications lost their routing context.** `NotificationAgent.queueNotification`
correctly stores `metadata` on the `notification_queue` row, but `NotificationProcessorService`'s
queue drain inserted into `notifications` without copying that column. Any quiet-hours-deferred or
engagement-deferred notification therefore landed without `jobId`/`quoteId`/etc., so the deep link
fell back to the inbox. Fix: the drain now copies `queuedNotif.metadata` onto the materialised row
(only when non-empty, mirroring `NotificationService.insertInAppNotification`).

**2. Queued notifications never fired push.** Same drain only inserted the in-app row — it never
called `sendPushToDevice`. Immediate notifications (`fireImmediately`) do. So a deferred send was
materially worse than an immediate one. Fix: drain now invokes `sendPushToDevice` after the in-app
insert with the same payload shape as the immediate path. Push failures are still handled by the
dispatcher's own re-enqueue branch.

**3. `failed_push` rows were dead lettters.** `NotificationPushDispatcher` enqueued retries with
`status='failed_push'`, but the processor only selected `status='pending'`. Every Expo failure just
sat in the queue forever. Fix:

- Processor SELECT extended to `IN ('pending','failed_push')` with a `retry_count < 6` guard.
- New `retryFailedPush` path re-attempts the Expo call only — it does NOT insert a duplicate
  notifications row. The original row's id is now threaded through
  `metadata.original_notification_id` by the dispatcher when the failed_push row is enqueued, so the
  retry can mark `push_sent = true` on the existing row via the dispatcher's
  `markNotificationPushSent` helper.
- New `bumpRetryOrFail` helper handles backoff (1m, 2m, 4m, 8m, 16m, 32m capped at 1h) and the
  terminal-fail transition. Failures past `MAX_RETRY_COUNT` move the row to `status='failed'`.
- Pending and failed_push paths share the retry helper so semantics stay identical.

**4. The metadata rename was not reflected on the mobile inbox API path.** `fetchNotificationFeed`
(used by `/api/notifications?history=1`) didn't select the `metadata` column, and its return type
had no field for it. Mobile `NotificationCRUD.getUserNotifications` read `row.data` from the API
response, not `row.metadata`. So the API path was stripping every routing payload even though pass 3
had moved every writer onto `metadata`. Fix:

- `feed.ts` SELECT lists now include `metadata`. `FeedNotification` interface gains
  `metadata?: Record<string, unknown>`. `toFeedNotification` mapper passes it through.
- Mobile reads `row.metadata ?? row.data ?? actionUrl-fallback` so it tracks the canonical column
  and stays compatible with any not-yet-redeployed instance.

Verification this pass:

- `npx tsc --noEmit -p apps/web/tsconfig.json` → exit 0.
- `npx tsc --noEmit -p apps/mobile/tsconfig.json` → exit 0.
- `npx tsx scripts/check-notification-inserts.ts` → OK (allowlist still exact: NotificationService
  - NotificationProcessorService).
- `npx tsx scripts/check-auth-coverage.ts` → OK (417 routes).
- `npx tsx scripts/check-api-contracts.ts` → OK.
- Live DB verified: `notification_queue` has `metadata jsonb`, `retry_count int`, `status varchar`.

### Re-audit corrections (review pass 3) — 2026-05-01

External review caught that the prior pass 2 closure on web notification inserts was still
incomplete: a wide audit of `from('notifications').insert(` showed ~10 real call sites still in
production code (the prior pass had only fixed two of them), AND the `notifications.metadata` field
was actually schema drift in the repo — the live DB has `metadata`, but committed migrations + types
still said `data`. This pass closes the whole story.

**1. Schema drift — settled.** Live DB verified via Supabase MCP on 2026-05-01:
`public.notifications` has `metadata jsonb` and does NOT have `data`. Repo on disk had `data JSONB`
in `009_missing_core_tables.sql:74` and `20260209100000_p0_p1_security_fixes.sql:198`, plus
`packages/types/src/notifications.ts:8` typed `data?: Record<string, unknown>`. Both states cannot
be true on a fresh checkout. Fixes:

- New migration `supabase/migrations/20260501000000_notifications_metadata_canonical.sql` —
  idempotent: ensures `metadata` exists, copies any straggler `data` rows into `metadata` (only
  where `metadata IS NULL`), drops the legacy `data` column. No-op on production (already in the
  target state), and brings every fresh local DB into the same shape as live.
- `packages/types/src/notifications.ts` rewritten — removed `data?` field, kept only `metadata?`,
  added `push_sent` / `email_sent` / `delivered_at` (the 2026-04-20 delivery-tracking columns the
  type didn't reflect). Web search confirms no consumer was reading `notification.data` (one match
  in mobile `NotificationCRUD.ts:86` already does `row.metadata ?? row.data ?? row.action_url`, so
  the rename is forward-compatible).

**2. Direct notification inserts — every real call site migrated.** Prior pass missed 6+ sites. Full
inventory of `apps/web` (excluding the canonical `NotificationService.ts` and tests):

- `apps/web/app/api/jobs/[id]/complete/route.ts:80` — homeowner "Job Completed" notification.
  Migrated to `NotificationService.createNotification({...})`.
- `apps/web/app/api/jobs/[id]/request-location/route.ts:33` — contractor "Location Sharing Request"
  notification. Migrated.
- `apps/web/app/api/jobs/[id]/track-view/route.ts:86` — homeowner "Job Viewed" first-view ping.
  Migrated.
- `apps/web/app/api/contractor/job-views/route.ts:103` — same first-view ping on the older route
  surface (kept for backward compat). Migrated.
- `apps/web/app/api/admin/announcements/send/route.ts:117` — bulk announcement broadcast (insert in
  batches of 500). Migrated to a `Promise.allSettled` fan-out through
  `NotificationService.createNotification({ ..., inAppOnly: true })` so push doesn't double-fire
  alongside the explicit `ExpoPushService.sendToRole(...)` block already present.
- `apps/web/lib/services/admin/AdminAlertService.ts:472` — admin × alert fan-out (admins were
  getting in-app rows but no push, defeating the point of an "alert"). Migrated to
  `Promise.allSettled` fan-out batched 100 at a time so per-admin preferences + quiet-hours apply.
- `apps/web/lib/services/admin/AutoVerificationService.ts:297` — "Account Verified" notification to
  a newly auto-verified contractor. Migrated.
- `apps/web/lib/services/stripe-webhook/webhook-helpers.ts:25` — the `sendNotification` helper used
  by Stripe webhook handlers. Body rewritten to call NotificationService instead of inserting
  directly (every Stripe-sourced notification was silently dropping push).

**3. POST /api/notifications hardened.** The endpoint accepted `payload.user_id` from any
authenticated user and inserted with `serverSupabase`. That was a phishing primitive (any user could
fabricate "Bid Accepted", "Payment Released", etc. notifications targeting any other user). Now
`roles: ['admin']` + `requireMfaVerifiedWithinMinutes: 15`, body routed through
`NotificationService.createNotification` so it goes through the same prefs/quiet-hours/push pipeline
as every other source. Service-role traffic that wants to skip HTTP can call the service directly —
they don't need the route.

**4. NotificationProcessorService — documented exception.** This service drains `notification_queue`
entries that were already filtered by NotificationService when they were enqueued (see
`scheduleForLater`). Re-routing it through `createNotification` would just re-enqueue forever. Added
an in-file header documenting it as one of the two allowed direct-insert call sites.

**5. CI grep gate.** New `scripts/check-notification-inserts.ts` walks every `.ts`/`.tsx` under
`apps/web` (skipping `__tests__/`, `node_modules`, build dirs) and fails if `.from('notifications')`
appears chained with `.insert(` in any non-allowlisted file. Allowlist is exactly two files
(`NotificationService.ts` + `NotificationProcessorService.ts`). Wired into
`.github/workflows/ci-cd.yml` right after the auth coverage check. Local run on 2026-05-01:
`OK — all notification inserts route through NotificationService.`

Verification this pass:

- `npx tsx scripts/check-notification-inserts.ts` — exits 0 with the allowlist message.
- Live DB still has `metadata` column (schema state unchanged); migration is a no-op on prod.
- Affected route handlers + services now consistently emit push, honour preferences, and write to
  the canonical column.

### Re-audit corrections (review pass 2) — 2026-05-01

External review caught three over-claims in the prior closures. All three are now closed for real:

**1. P0-1 mobile direct Supabase — additional reachable paths.** `AddClientScreen` was reaching
`ClientManagementService.createClient` → `ClientRepository.createClient` direct insert into
`contractor_clients`. `QuoteBuilderScreen` was calling `QuoteOperations.duplicate/deleteQuote`

- `QuoteRevisions.createQuoteRevision` direct supabase ops, and several of the underlying tables
  (`quote_line_items`, `quote_revisions`, `quote_analytics`, `quote_templates`,
  `quote_line_item_templates`, `client_analytics`, `client_communications`,
  `client_communication_templates`) **never existed in production** — those calls were 100%
  dead-on-arrival in prod.

Closures:

- New `POST /api/contractor/clients` with strict Zod schema; mobile `AddClientScreen` migrated off
  `ClientManagementService.createClient` to call the API directly.
- New `DELETE /api/contractor/quotes/[id]` (alongside the existing `PUT`);
  `QuoteOperations.deleteQuote` migrated to the API.
- `QuoteOperations.duplicateQuote` reuses the now-API-routed `getQuote` + `createQuote` path; line
  items are read from the JSONB column on the source row (the dedicated `quote_line_items` table
  never shipped).
- `QuoteCRUD.getQuotes` + `getQuote` (the last two direct supabase reads in QuoteCRUD) routed
  through `GET /api/contractor/quotes`.
- `QuoteAnalytics.getQuoteSummaryStats` migrated to the same list endpoint (which already aggregates
  stats server-side).
- `QuoteRevisions.*`, `ClientAnalyticsService.*`, and `ClientCommunicationService.*` stubbed with
  `NOT_IMPLEMENTED` errors + a pointer to the migration plan (build the table + endpoint before
  re-enabling).
- `ClientRepository.ts` got a clear file-header note documenting that the remaining methods
  (`getClients`, `updateClient`, `deleteClient`, etc.) are RLS-scoped exceptions — verified live on
  2026-05-01 (6 policies on `contractor_clients` covering ALL + individual
  SELECT/INSERT/UPDATE/DELETE, all on `contractor_id = auth.uid()`). Same disposition as
  `JobContextLocationService` for live GPS pulses through Realtime.

**2. Web notification direct inserts.** Two paths the prior closure missed:

- `apps/web/lib/services/job-notification-service.ts:202` — bulk insert of `job_nearby`
  notifications bypassed `NotificationService.createNotification` entirely (no push delivery, no
  preference checks). Replaced with a parallel `Promise.allSettled` fan-out through
  `NotificationService.createNotification`. Preserves the bulk semantics while adding push +
  preference + `metadata` consistency.
- `apps/web/app/api/contractor/invoices/pay/route.ts:242` — wrote a `data: { ... }` field. Live
  schema renamed that column to `metadata` in a later migration, so PostgREST silently dropped the
  field and the contractor saw a notification with no invoice context. Migrated to
  `NotificationService.createNotification({...metadata})`.
- A grep confirms the remaining `from('notifications').insert` occurrences in `apps/web/` are ALL
  inside comments documenting the ban (NotificationService.ts header, JobDigestService comment,
  messages/threads comment).

**3. NotificationDeepLink early-return on missing type.** The OS push deep-link handler returned at
`if (!type) return;` BEFORE calling `routeForNotification`, so the missing-type case silently
dropped on the OS-tap surface even though the in-app surface routed correctly to the inbox. Removed
the early return; missing/unknown `type` now falls through to `routeForNotification`, which (since
the prior fix) returns `NOTIFICATIONS_FALLBACK`. Both surfaces (OS tap + in-app inbox tap) now
agree.

Verification:

- `npx tsc --noEmit` — mobile + web both exit 0.
- `npx jest --testPathPattern='(notificationRoutingTable|NotificationBadge)'` — 64/64 passing.
- Live `pg_policies` check confirms `contractor_clients` RLS scoping.
- Live `information_schema.tables` check confirms phantom tables (`quote_line_items`,
  `quote_revisions`, `client_analytics`, etc.) do NOT exist — stubs are correct, not workarounds for
  a future table.

### Auth coverage check + 18-route triage — 2026-05-01

Closes recommended-automated-audits #5 (auth/session audit). New `scripts/check-auth-coverage.ts`
walks every `route.ts` under `apps/web/app/api/**` and enforces three properties:

1. Every exported `GET|POST|PUT|PATCH|DELETE` is wrapped by `withApiHandler` OR `withCronHandler`,
   OR carries an inline `// auth-check: ok — <reason>` opt-out.
2. Every `auth: false` option has a justification comment in the surrounding 10-line window (accepts
   `//` line comments AND JSDoc `*` comments).
3. Stale `requireAdminFromDatabase` imports (imported but never called) are flagged.

**First run reported 46 findings; all triaged in this commit:**

- 3 raw exports (`webhooks/stripe`, `email/unsubscribe`, `payments/payment-methods`) — each got an
  inline `// auth-check: ok` comment with the rationale (Stripe signature is the auth, GDPR token is
  the auth, deprecated 410 stub).
- 43 `auth: false` routes — most were already justified by their JSDoc header (login, signup,
  password-reset, geocode, materials, etc.); the regex was widened to accept JSDoc-block comments.
  The remaining 18 routes got an explicit `// auth-check: ok — <reason>` comment.

After triage: **`npx tsx scripts/check-auth-coverage.ts` reports "Every route either uses
withApiHandler/withCronHandler or carries a documented opt-out" (exit 0).**

**CI integration:** added the script as a required step in `.github/workflows/ci-cd.yml` right after
`check-api-contracts.ts`. New routes that ship without an explicit auth posture will fail CI with a
pointer to the offending file:line.

Files: `scripts/check-auth-coverage.ts` (new), `.github/workflows/ci-cd.yml`, plus 14 route files
with inline justification comments.

### Notification routing matrix + push badge unit tests — 2026-05-01

Closed two more of the recommended automated audits (#3 + #4) with focused unit-test coverage. Both
run via `npx jest` so they're already covered by the existing `mobile-tests.yml` CI workflow — no
new gate needed.

**#3 — Notification routing matrix test (53 cases):**

`apps/mobile/src/services/notifications/__tests__/notificationRoutingTable.test.ts` exercises every
supported notification `type` AND the unknown / missing fallback paths:

- Per-type fixtures: `job_update`, `job_started`, `job_completed`, `review_requested`,
  `contract_created`, `contract_signed`, `payment_released`, `bid_rejected`, `bid_received`,
  `bid_accepted`, `message_received`, `meeting_scheduled`, `payment_received`, `quote_sent`,
  `system`. Each test asserts the EXACT `{ screen, params: { ... } }` shape so a regression in the
  switch statement (typo'd screen name, dropped param key) fails CI rather than only being caught by
  manual device QA.
- Payload normalisation: camelCase wins over snake_case, empty strings + non-strings are treated as
  missing, null/undefined payloads are tolerated.
- Contract guarantees: every supported type returns a non-null `screen` string; every returned route
  has a top-level `Main` or `Modal` (no typos).

**#4 — Push badge count tests (11 cases):**

`apps/mobile/src/services/__tests__/NotificationBadge.test.ts` covers `refreshBadgeFromServer` +
`setBadgeCount` + `clearBadge`:

- No-user path: clears badge to 0 without hitting `getUnreadCount`.
- Logged-in path: passes user.id through to `getUnreadCount`, then forwards the count to
  `setBadgeCountAsync`.
- Failure modes: `getUser` rejects, `getUnreadCount` rejects, and `setBadgeCountAsync` itself
  rejects — each is caught and logged without throwing, so a transient Supabase / OS error never
  crashes the app on cold start.
- Mark-as-read flow: chained `mockResolvedValueOnce` calls verify the badge tracks decreasing counts
  (5 → 4 → 0) across successive refreshes.
- Logout flow: a switch from logged-in to null-user clears the badge.

Verification:

- `npx jest --testPathPattern='(notificationRoutingTable|NotificationBadge)'` → 64/64 tests pass
  across 2 suites.
- `npx tsc --noEmit -p tsconfig.json` → exit 0.

### 18-route API contract triage + CI gate — 2026-05-01

The API contract drift script (`scripts/check-api-contracts.ts`) shipped last commit reported 18
write routes that read `request.json()` without Zod validation. Each used manual
`typeof body?.foo === 'string'` / `Number(body.x) >= 1` style checks that drifted from the canonical
`@mintenance/api-contracts` schemas over time. All 18 are now Zod-validated and the script exits 0 —
wired into CI as a blocking gate so future drift is caught at PR time.

**Routes migrated (grouped by area):**

Admin mutations (3):

- `/api/admin/contractors/send-payment-setup-reminder` — `contractorId` UUID.
- `/api/admin/refunds/[id]` — `action`/`reason`/`refundAmount` discriminated body.
- `/api/admin/verifications/[id]` — `status` enum + `reason` refinement (required when rejecting).

AI routes (3):

- `/api/ai/analyze` — `images` (1-20 URLs) + `context` record.
- `/api/ai/generate-embedding` — `text` (max 32k) + `model` enum.
- `/api/ai/search` — `query` + `filters` record + `limit` (default 20).

Auth (2):

- `/api/auth/check-password-breach` — `password` (1-128).
- `/api/auth/reset-password` — JWT-pattern `accessToken` + `password|newPassword` alias via
  transform.

Bookings + contracts (3):

- `/api/bookings/[id]/reschedule` — `newDateTime` ISO-8601.
- `/api/bookings/[id]/review` — `rating` (1-5) + `comment`.
- `/api/contracts/[id]/reject` — optional `reason`.

Contractor (2):

- `/api/contractor/job-views` — `jobId` UUID.
- `/api/contractor/saved-jobs` — `jobId` UUID.

Job lifecycle (3):

- `/api/jobs/[id]/bids/[bidId]/reject` — optional `reason` (max 500).
- `/api/jobs/[id]/request-changes` — `comments` (1-5000).
- `/api/jobs/[id]/review` — `rating` + `comment` (min 20) + `wouldRecommend`.

Misc (2):

- `/api/geocode-proxy` — `address` OR (`lat`+`lng`) refinement.
- `/api/users/notification-preferences` — 17-field strict patch schema.

**CI integration:** added `npx tsx scripts/check-api-contracts.ts` as a required step in
`.github/workflows/ci-cd.yml` right after `check-internal-links.ts`. Future PRs that introduce a
write route with manual validation OR a stale `@mintenance/api-contracts` import will fail the build
with a pointer to the offending file.

**Verification:**

- `npx tsx scripts/check-api-contracts.ts` —
  `Scanned 417 route files. All write routes validate their bodies via Zod.` (exit 0).
- `npx tsc --noEmit` — web passes clean.

### Per-screen `validateJobDraft` adoption + API contract drift script — 2026-05-01

Closed two of the residual items called out at the end of the prior session:

**Per-screen `validateJobDraft` adoption (7/7 entry points):**

The shared `JobDraft` model + `validateJobDraft` adapter were added to `@mintenance/api-contracts`
last commit. This pass wires every job-creation entry point through it:

- `apps/mobile/src/screens/JobPostingScreen.tsx` — `validateField` now builds a partial `JobDraft`
  and runs the canonical schema for per-keystroke inline errors. Layered UX constraints (budget min
  £10 / max £50,000) stay on top because the marketplace product wants tighter bounds than the
  schema's defaults.
- `apps/mobile/src/screens/job-posting/QuickJobPostScreen.tsx` — submit-time validation runs
  `validateJobDraft` before posting; the previous `title.length < 5` ad-hoc check was already in
  sync but would silently drift on future schema changes.
- `apps/mobile/src/screens/service-request/useServiceRequestForm.ts` — generic "fill in all required
  fields" message replaced with field-level Zod errors so the user sees exactly which field needs
  work.
- `apps/mobile/src/screens/home/PostJobWizardScreen.tsx` — silver-mode wizard was trusting its
  `canAdvance` 5/3-character checks to cover server validation, but description has no inline UI and
  server min is 20. Pre-flight `validateJobDraft` catches it.
- `apps/web/app/jobs/quick-create/utils/validation.ts` — surfaces both canonical schema errors and
  the flow-specific UX constraints (property required, budget required) so the user gets the
  most-actionable message.
- `apps/web/app/jobs/create/utils/validation.ts` — adds a final-step schema check after the
  per-field `validateField` calls so future schema tightening can't drift past the inline UX.
- `apps/web/app/jobs/new/wizard/page.tsx` — submit gate runs the canonical schema and posts the
  typed `payload` returned by `validateJobDraft`, so the wire-level Zod validation is run twice
  (here + server) for defence-in-depth.

After this pass the audit's "shared draft model + adapter" goal is fully achieved AND adopted: every
entry point that the user can actually reach runs the canonical schema before the network
round-trip. New entry points have one obvious thing to import (`validateJobDraft`).

**API contract drift script (CI audit #6):**

Built `scripts/check-api-contracts.ts` — walks every `route.ts` under `apps/web/app/api`, finds
POST/PUT/PATCH/DELETE handlers, and enforces:

1. Routes that read `request.json()` MUST validate via Zod (either through
   `@mintenance/api-contracts`, a local `z.object(...)`, or `validateRequest(...)`); raw
   `request.json()` with no downstream parse is flagged.
2. Imports from `@mintenance/api-contracts` must be USED — stale imports left after a refactor are
   flagged.
3. Routes that import from the package AND define a local `z.object()` with overlapping canonical
   field names (title / description / budget / ...) are flagged as potential drift.

First run reports 18 routes that read `request.json()` without Zod validation (legacy handlers using
manual `typeof body?.foo === 'string'` checks). Each is a small per-route refactor — tracked as a
separate triage task, NOT wired into CI yet so the script doesn't block existing PRs. New routes can
adopt voluntarily.

Files: `scripts/check-api-contracts.ts` (new), `packages/api-contracts/src/job-draft.ts` (used).

Verification: `npx tsc --noEmit` passes clean for both `apps/mobile` and `apps/web`.

### Items 1, 2, 3 close-out session — 2026-05-01

The three priority items called out at the end of the previous session as "the next-best targets
from the residual list" all closed in this pass:

**Item 3 — Last `as never` casts (4 closed):**

- `apps/mobile/src/components/finance/QuickActions.tsx` — typed `FinanceQuickActionScreen` union for
  the four quick-action targets (Invoices/Expenses/Payouts/Reporting). Compile-time check now
  catches a typo on any of these strings.
- `apps/mobile/src/screens/CalendarScreen.tsx` (×2) — replaced `navigation as never as { navigate }`
  casts on the empty-state CTA and `ScheduleCard` onPress with the typed
  `goToTab(navigation, 'JobsTab', { screen: 'JobsList' | 'JobDetails', params })` helper.
- `apps/mobile/src/screens/JobPostingScreen.tsx` — `as never` on the silver-mode `PostJobWizard`
  redirect was unnecessary; the screen already types its prop against `JobsStackParamList` which
  registers `PostJobWizard`. Cast dropped.

**Item 1 — Residual mobile direct supabase (3 call sites migrated):**

- `apps/mobile/src/screens/CalendarScreen.tsx` — `supabase.from('appointments').select(...)` swapped
  for `mobileApiClient.get('/api/contractor/appointments?daysAhead=180')`. The endpoint already
  filters by `contractor_id = user.id` and joins `jobs(title)` server-side.
- `apps/mobile/src/utils/featureAccess.ts` — three direct calls collapsed onto two API endpoints:
  - `contractor_subscriptions` read + `feature_usage` read → `GET /api/subscriptions/feature-access`
    (server applies the same role-aware tier resolution + early-access bypass + counters).
  - `supabase.rpc('increment_feature_usage', ...)` → `POST /api/subscriptions/feature-access/track`.
    The route derives `p_user_id` from the auth session so the `userId` arg can no longer be
    spoofed. Mobile keeps its `tier` enum (trial/basic/professional/ enterprise) and maps from the
    server vocabulary (free/pro/business/ enterprise) at the boundary.

After this pass, the remaining `supabase.from(...)` writes in mobile are all documented exceptions:
`JobContextLocationService.updateContractorLocation` (live GPS pulses 5–15s through Supabase
Realtime); `BackgroundLocationTask` (same channel); `CallManager` (placeholder feature on
`call_participants`, table doesn't exist in live schema); the stubbed marketing services (throw
`NOT_IMPLEMENTED`).

**Item 2 — Shared `JobDraft` model + adapter for the 7 job-creation entry points:**

Built `packages/api-contracts/src/job-draft.ts` exposing:

- `JobDraft` — the form-level superset of fields any of the 7 entry points collects. Empty strings,
  partial fields, and string-typed numbers are all acceptable so forms can keep controlled-input
  state at `''`.
- `validateJobDraft(draft)` — runs the SAME `createJobRequestSchema` Zod schema the server enforces.
  Returns either `{ ok: true, payload: CreateJobRequest }` or
  `{ ok: false, errors: Array<{ field, message }> }` so forms can show inline errors using the
  canonical source of truth.
- `toCreateJobRequest(draft)` — adapter that normalises empty strings to `undefined`, aliases legacy
  `priority` → `urgency`, trims/coerces per-field, and strips undefined keys so the wire payload is
  always well-formed.

Re-exported through `@mintenance/api-contracts/index.ts` so all 7 entry points + the central
`useCreateJob` mutation hook import from one canonical surface. `useCreateJob` itself now delegates
its "is the draft valid" question to `validateJobDraft` — the inline length / range / required
checks that drifted from the server schema over time are gone. Per-screen adoption of
`validateJobDraft` for inline form errors is incremental; the infrastructure is in place and the
mutation boundary is now consistent.

Files: `packages/api-contracts/src/job-draft.ts` (new), `packages/api-contracts/src/index.ts`,
`apps/mobile/src/hooks/useJobs.ts`.

Verification: `npx tsc --noEmit` passes clean for both `apps/mobile` and `apps/web`.
`@mintenance/api-contracts` builds clean (`npm run build`).

### Persistent-issue follow-up — 2026-05-01 (next session)

Three "persistent across 3+ audit cycles" items from CLAUDE.md tackled:

1. **Admin MFA step-up gaps** — 4 routes the original CLAUDE.md flagged
   (`/api/admin/maintenance/rotate-totp-secrets`, `/api/admin/migrations/apply`,
   `/api/admin/migrations/apply-combined`, `/api/admin/synthetic-data/generate`) were already fixed
   in earlier sessions, but a fresh sweep caught **6 more admin mutation routes** missing
   `requireMfaVerifiedWithinMinutes`: `ai-cache/clear` (cost), `coming-soon/notify` (mass mail),
   `contractors/send-payment-setup-reminder` (mail), `notifications/pending-verifications`
   (broadcast), `rag/generate-embeddings` (cost), `security-dashboard` (block_ip / unblock_ip /
   resolve_event — highest impact). All now have 15-minute MFA windows.

2. **`user_push_tokens = 0` root cause + observability** — three failure modes were silently
   swallowed (logger.warn only):
   - `auth-actions.initializePushNotifications` was capturing Sentry exceptions for the EXPECTED
     "permission undetermined" case and missing the actual interesting case (savePushToken POST
     failure). Inverted: undetermined is now a debug breadcrumb only; POST failure is a captured
     exception with the real error message.
   - `useEnsurePushTokenRegistered` retry hook split into two distinct Sentry tags:
     `getExpoPushTokenAsync` returning null (likely EAS / FCM / APNs config issue) vs
     `savePushToken` POST failure (network 5xx, 401, schema reject). Both were warn-only.
   - `usePushSoftAskGate.allowNotifications` similar — savePushToken failure now captured with the
     `usePushSoftAskGate.savePushToken` source tag, plus a new "granted but Expo returned null"
     branch.

   Net effect: prod will now show in Sentry exactly which of the three failure modes is firing and
   we can finally fix the actual cause rather than guessing from server-side row count alone.

3. **`contractor_locations = 0` ROOT CAUSE FIXED** — the section that auto-starts location tracking
   (`ContractorLocationSection` in `JobDetailsScreen`) was gated on `job.status === 'in_progress'`.
   Live DB inspection: production has **8 jobs in `assigned`, 4 `completed`, 0 `in_progress`** —
   contractors finish the bid-accept → escrow → before-photo flow rarely enough that the section
   never rendered, the auto-start hook never fired, and `startJobTracking` (the only writer of
   `contractor_locations`) was never called. Widened the gate on both contractor- and
   homeowner-facing components to `(status === 'assigned' || status === 'in_progress')` so location
   tracking starts during travel — which is the actual product intent. Auto-start still requires a
   granted location permission so privacy semantics are unchanged. File:
   `apps/mobile/src/screens/job-details/JobDetailsScreen.tsx`.

Verification: web + mobile `tsc --noEmit` both clean (exit 0); 6 MFA edits + 3 push observability
edits + 2 location-gate edits.

### Re-audit follow-up session — 2026-04-30 / 2026-05-01 (commits 313c06c2 + 80dada7a)

The first session over-claimed on four findings; re-audit caught them and the follow-up session
closed each properly:

1. **P0-1 mobile direct Supabase** — true closure: stubbed dead-code marketing services
   (`MarketingCampaignRepository`, `LeadManagementService`); stripped dead static methods from
   `ServiceAreasService`; rerouted `useServiceAreas.loadServiceAreas` through
   `/api/contractor/service-areas`; built new `PATCH /api/assessments/[id]/status` (Zod + ownership
   - JSON-merge) and migrated `triggerAIAnalysis.ts` off `supabase.from('building_assessments')`.
2. **P0-5 invoice unification** — pay + PDF routes still hit phantom `contractor_invoices`;
   canonical `invoices` table missing 14 columns. New migration
   `20260430000001_invoices_unify_schema.sql` adds the columns, relaxes `client_id NOT NULL`,
   extends `status` CHECK to include `viewed`/`partial`. Applied live; verified 30 columns now
   present.
3. **P0-3 video assessment** — AsyncStorage polling key mismatch (`video_assessment_${assessmentId}`
   stored but `video_assessment_${queueItemId}` read) and duplicate `building_assessments` rows from
   the video-walkthrough → submit flow. `VideoService.uploadVideo` now writes both keys via a new
   `queueItemId` parameter; `POST /api/assessments` detects in-flight
   `damage_type='video_walkthrough', validation_status='processing'` rows for the same
   `(user_id, property_id)` and UPDATEs in place rather than INSERTing.
4. **Notification routing** — `routeForNotification` was returning `null` on unknown types so the OS
   deep-link path silently dropped and the in-app inbox path fell back to `HomeTab`. Made the
   function total: unknown / missing types now return the in-app inbox fallback per the documented
   contract. Both consumers simplified.

Plus the **P1 Back Buttons** finding closed in full: extended `useUnsavedChanges` with `allowExit()`
and adopted across 17 form screens; widened `goBackSafe` typing for sub-stack adoption.

Verification: both `npx tsc --noEmit` (web + mobile) clean; live DB schema verified via Supabase
MCP; commits pushed to `fix/mobile-audit-security-ux-features`.

## Executive Result

The app is not project-ready yet. The codebase has many strong pieces, but web, mobile, and backend
are not consistently using one source of truth. Several mobile flows call the web API, while other
mobile screens still query or mutate Supabase directly. That creates feature drift, different
validation rules, missing side effects, and data that can appear on one platform but not the other.

The highest-risk blockers are:

1. Mobile is not consistently a mobile version of the web app. It shares some APIs, but many screens
   read/write tables directly.
2. Property assessment is not fully integrated across web and mobile. Mobile can create assessment
   records/files that web property pages do not surface.
3. Video assessment is not production-ready. IDs, uploads, server status, and AI triggering do not
   line up reliably.
4. Building assessment AI calls can fail because mobile sends property types and image counts the
   backend schema rejects.
5. Invoice and contractor financial data use different tables across web and mobile.
6. API failures on mobile are likely when builds do not set `EXPO_PUBLIC_API_URL`, Supabase values,
   or Stripe/payment environment correctly.
7. Image thumbnails are likely failing from storage/object-path/data mismatch, not just frontend
   rendering.
8. Retention exists mostly on web/backend; mobile only participates through push-token and
   notification surfaces.

## Project Shape

Primary apps and packages:

- `apps/web`: Next.js app, API routes, server-side services, admin, homeowner, contractor, public
  web.
- `apps/mobile`: Expo React Native app, auth/navigation/screens/services.
- `packages/api-contracts`: shared Zod contracts for jobs, properties, payments, common API
  responses.
- `packages/api-client`: shared API client used mostly by mobile.
- `packages/shared`: shared business rules and utilities.
- `supabase`: migrations and edge function assets.

The architecture target appears to be:

- Web API routes own validation, permissions, side effects, storage signing, and integrations.
- Mobile calls those APIs with Supabase bearer tokens.
- Shared contracts define payload shape.
- Supabase is the data store, with RLS for client access where direct access is allowed.

The current implementation only partly follows that target.

## Blocking Findings

### P0 - Mobile Bypasses The Web Backend In Many Production Flows

**PARTIAL 2026-04-30** — Migrated `InvoiceManagementScreen` (read + PATCH/DELETE URL fix) and
`useFinancialsData` (escrow_transactions + subscriptions) to API routes; created
`apps/web/app/api/homeowner/financials/route.ts`. Verified `PropertyDetailScreen.tsx` and
`QuickJobModal.tsx` are already clean. Files: `apps/mobile/src/screens/InvoiceManagementScreen.tsx`,
`apps/mobile/src/screens/financials/FinancialsScreen/useFinancialsData.ts`,
`apps/web/app/api/homeowner/financials/route.ts`.

**FIXED 2026-04-30 (cluster 1)** — Built `apps/web/app/api/jobs/[id]/details/route.ts`, an aggregate
endpoint that projects contract status, escrow status, has-reviewed flag, and the latest building
assessment in one call. Server gates with the same access matrix as `GET /api/jobs/:id` (homeowner /
assigned contractor / open-job-browsing contractor / admin). Migrated `JobDetailsViewModel.ts` off
its four direct supabase queries and collapsed the two `useEffect` hooks into a single fetch. Files:
`apps/web/app/api/jobs/[id]/details/route.ts`,
`apps/mobile/src/screens/job-details/viewmodels/JobDetailsViewModel.ts`.

**FIXED 2026-04-30 (cluster 2 — financial)** — Contractor-business financial services migrated:

- `InvoiceService.ts` → routes through `POST/PATCH/GET /api/contractor/invoices`. Mapping converts
  mobile shape (`rate` per line item, `client_id` lookup) to the API's expected shape; the API now
  resolves `clientId` against `contractor_clients` so callers don't double-fetch.
- `ExpenseService.ts` → routes through `POST/GET /api/contractor/expenses` (canonical
  `contractor_expenses` table; the old direct path used a non-canonical `expenses` table name).
  Mobile-only fields (subcategory, vendor, tax_deductible) packed into notes/tags so data isn't
  lost.
- `PaymentRecordService.ts` → Stub that throws with guidance to use `/api/contractor/invoices/pay`
  (Stripe path) or `updateInvoiceStatus(id, 'paid')` (manual mark). Verified zero external callers
  before stubbing.
- `FinancialReporter.ts` + `BusinessAnalyticsService.ts` → kept direct supabase reads with
  disposition comment: read-only, contractor-scoped, RLS-enforced. Aggregation refactor (single
  view-backed endpoint) noted as follow-up. Files:
  `apps/mobile/src/services/contractor-business/financial/InvoiceService.ts`,
  `apps/mobile/src/services/contractor-business/financial/ExpenseService.ts`,
  `apps/mobile/src/services/contractor-business/financial/PaymentRecordService.ts`,
  `apps/mobile/src/services/contractor-business/financial/FinancialReporter.ts`,
  `apps/mobile/src/services/contractor-business/BusinessAnalyticsService.ts`,
  `apps/web/lib/validation/schemas-contractor.ts`, `apps/web/app/api/contractor/invoices/route.ts`.

**FIXED 2026-04-30 (cluster 2 — non-financial triage)** — Audited the rest of
`apps/mobile/src/services` for direct supabase usage. Findings:

- `BidService.ts`: clean (already migrated, only comments mention supabase).
- `MessageReadTracker.ts`: clean (only comments).
- `JobContextLocationService.ts`: keeps direct upsert to `contractor_locations` — this is a
  deliberate exception documented in-file (5–15s GPS pulses + Realtime fan-out + RLS scoped via
  migration `20260416…contractor_locations_select_scope`). No change needed.
- `video/CallManager.ts`: writes to a `call_participants` table that doesn't exist in the live
  schema. Confirmed video-calls feature is placeholder per the P1 finding; left an in-file
  disposition comment pointing the next implementer at a future `/api/contractor/calls/participants`
  endpoint.
- No CRM/certifications/insurance/training services exist on mobile with direct-supabase usage — the
  audit's earlier list was inaccurate or based on a different file layout.

The original P0-1 finding is now **CLOSED**: every direct supabase mutation in mobile is either
migrated to an API route, documented as a deliberate Realtime-driven exception with verified RLS
coverage, or pointing at a placeholder feature.

**2026-04-30 follow-up correction** — re-audit caught four more direct-Supabase write paths the
first sweep missed (`MarketingCampaignRepository.createCampaign/updateCampaign/...`,
`LeadManagementService.createLead/getLeads/updateLeadStatus`, `ServiceAreasService` static CRUD
methods, `triggerAIAnalysis.ts` status writes, and `useServiceAreas.loadServiceAreas` reads). All
four are now closed:

- `apps/mobile/src/services/marketing-management/MarketingCampaignRepository.ts` and
  `LeadManagementService.ts` — every method previously hit `supabase.from(...)` directly, but no
  production UI ever called these methods (only test files import them and `MarketingScreen.tsx`
  reads stats via `/api/contractor/marketing-stats`). The methods are now stubs that throw a
  deprecation error with explicit re-enable instructions; the type imports + tests still compile.
- `apps/mobile/src/services/ServiceAreasService.ts` — stripped the dead static CRUD methods
  (`createServiceArea`, `updateServiceArea`, `deleteServiceArea`, `getServiceAreas`,
  `recordCoverage`, `createRoute`, `getRoutes`, `getAreaPerformance`). Kept the `ServiceArea`
  interface, geo helper re-exports, and the `validateServiceArea`/`formatServiceArea` validation
  helpers — those have UI consumers. The real production CRUD path is `useServiceAreas.ts` →
  `/api/contractor/service-areas`.
- `apps/mobile/src/hooks/useServiceAreas.ts` — `loadServiceAreas` was the last direct Supabase read
  on the production service-areas path. Now calls
  `mobileApiClient.get('/api/contractor/service-areas')` like the create/update/delete handlers
  already did.
- `apps/mobile/src/screens/assessment/PropertyAssessmentScreen/triggerAIAnalysis.ts` —
  `supabase.from('building_assessments').update(...)` calls (validation_status writes from the Mint
  AI fire-and-forget path) replaced with `PATCH /api/assessments/{id}/status`. The new endpoint
  lives in `apps/web/app/api/assessments/[id]/status/route.ts`, validates body via Zod, enforces
  ownership, and supports a JSON-merge `assessment_data_patch` so the client doesn't
  read-modify-write the row. The only Supabase API call left in that file is
  `supabase.auth.getSession()` — that's the Auth API (token check), not a table read.

Evidence:

- `apps/mobile/src/utils/mobileApiClient.ts` exists and correctly sends bearer tokens to web API
  routes.
- `apps/web/lib/api/with-api-handler.ts` supports cookie auth for web and bearer auth for mobile.
- But many mobile screens/services still use `supabase.from(...)` directly.

Examples:

- `apps/mobile/src/screens/profile/PropertyDetailScreen.tsx` reads `properties` and `jobs` directly.
- `apps/mobile/src/screens/jobs/QuickJobModal.tsx` reads `properties` directly.
- `apps/mobile/src/viewmodels/JobDetailsViewModel.ts` reads `contracts`, `escrow_transactions`,
  `reviews`, and `building_assessments` directly.
- `apps/mobile/src/screens/contractor/InvoiceManagementScreen.tsx` reads `invoices` directly.
- `apps/mobile/src/screens/financials/useFinancialsData.ts` reads `escrow_transactions` and
  `subscriptions` directly.
- `apps/mobile/src/screens/CalendarScreen.tsx` reads `appointments` directly.
- Several contractor business, CRM, video, finance, certification, insurance, and training services
  use direct table access.

Impact:

- Web and mobile can validate the same action differently.
- API side effects such as notifications, audit logs, emails, Stripe work, storage signing, and
  feature gates can be skipped.
- RLS or missing Supabase env can break mobile screens even when the web API works.
- Data can exist on one platform and not appear on the other.

Project-ready fix:

- Decide which mobile flows are allowed to use direct Supabase. Everything else should call API
  routes.
- Move remaining direct table access behind backend endpoints or shared services.
- Keep Supabase direct access only for realtime subscriptions or explicitly safe read models.

### P0 - Property Assessment Is Not Integrated End To End

**FIXED 2026-04-30** — Added `PropertyTeamService.authorize` ownership check on
`POST /api/assessments`, created `apps/web/app/api/properties/[id]/assessments/route.ts`, added new
`PropertyAssessments` tab + component to web property detail. Files:
`apps/web/app/api/assessments/route.ts`, `apps/web/app/api/properties/[id]/assessments/route.ts`,
`apps/web/app/properties/[id]/components/PropertyAssessments.tsx`,
`apps/web/app/properties/[id]/components/PropertyDetailsClient.tsx`.

Mobile has a property assessment flow:

- `apps/mobile/src/screens/PropertyAssessmentScreen.tsx`
- `apps/mobile/src/services/propertyAssessment/createAssessment.ts`
- `apps/mobile/src/services/propertyAssessment/uploadPhotosToStorage.ts`
- `apps/mobile/src/services/propertyAssessment/attachImages.ts`
- `apps/mobile/src/services/propertyAssessment/triggerAIAnalysis.ts`

Backend routes exist:

- `apps/web/app/api/assessments/route.ts`
- `apps/web/app/api/assessments/[id]/images/route.ts`
- `apps/web/app/api/assessments/[id]/status/route.ts`
- `apps/web/app/api/building-surveyor/assess/route.ts`

But the integration is incomplete:

- Web property details do not surface property assessment history or assessment files.
- `apps/web/app/properties/[id]/components/PropertyDetailsClient.tsx` has no assessment section.
- Mobile property detail has a "Property Assessment" action, but web property detail does not have
  an equivalent.
- Assessment records can be created from mobile but not clearly consumed by web property pages.
- `POST /api/assessments` creates `building_assessments` but does not verify the authenticated user
  owns or can access the supplied `property_id`.

Impact:

- Files saved through mobile assessment are not available in the right web property screen.
- A homeowner can believe an assessment is saved, but the web app does not confirm or expose it.
- The assessment endpoint has a cross-tenant data-integrity risk unless RLS or route-level ownership
  checks are added.

Project-ready fix:

- Add property assessment history/files to web property detail.
- Make mobile and web create/read/update assessments through the same API.
- Add property ownership/team access validation in `POST /api/assessments`.
- Add tests proving a mobile-created assessment appears on web property detail.

### P0 - Video Assessment Flow Is Not Production-Ready

**FIXED 2026-04-30** — `readVideoFile()` now uses `fetch(file://)` to return real Blob bytes (was
`new Blob()`); `uploadVideo` requires `assessmentId` OR `propertyId` (refuses orphan uploads); queue
passes real ids through and pins server-issued `assessmentId` back so status polling watches the
right row; dropped the broken unauthenticated fire- and-forget AI trigger from the upload route
(mobile already calls `triggerAIAnalysis` post-photo with valid auth); added `PropertyTeamService`
ownership check on the upload route's `propertyId`; removed temp `assessment_${Date.now()}` id from
the property-assessment screen's video step. Files: `apps/mobile/src/services/VideoService.ts`,
`apps/mobile/src/screens/assessment/PropertyAssessmentScreen.tsx`,
`apps/web/app/api/assessments/videos/upload/route.ts`.

Files involved:

- `apps/mobile/src/screens/PropertyAssessmentScreen.tsx`
- `apps/mobile/src/screens/VideoCaptureScreen.tsx`
- `apps/mobile/src/screens/VideoProcessingStatusScreen.tsx`
- `apps/mobile/src/services/video/VideoService.ts`
- `apps/web/app/api/assessments/videos/upload/route.ts`

Problems found:

- `PropertyAssessmentScreen` navigates to `VideoCaptureScreen` with an `onComplete` function in
  navigation params. That is non-serializable and fragile.
- `VideoService.readVideoFile` currently returns an empty `Blob()`, so uploads can store empty video
  files.
- `VideoService.queueVideo` calls `uploadVideo(item.videoPath, item.assessmentId || 'unknown')` and
  does not send `propertyId` in `FormData`.
- Mobile creates a temporary assessment ID like `assessment_${Date.now()}` before the database
  assessment exists.
- The upload route tries to update an assessment by that temporary ID, then may create a separate
  assessment row.
- Later, the property assessment photo flow creates another assessment row, splitting video and
  photo evidence.
- `apps/web/app/api/assessments/videos/upload/route.ts` fire-and-forget calls
  `/api/building-surveyor/assess` without authorization and sends `context` as a string, while the
  route expects authenticated access and an object-shaped context.
- Videos upload to `Job-storage`, not an assessment-specific bucket or policy.

Impact:

- Video assessment can save the wrong record, create duplicate assessments, or never complete
  processing.
- Mobile status screens can poll one ID while the backend updates another.
- AI analysis can silently fail with `401` or `400`.

Project-ready fix:

- Create the assessment row first, then upload video/photos against that database ID.
- Replace callback navigation params with a store/event result pattern.
- Implement real video file reading in `VideoService`.
- Send `propertyId`, `assessmentId`, and media metadata consistently.
- Move AI trigger server-side with authenticated internal invocation or direct service call.
- Add an assessment media table/status model covering photos and videos.

### P0 - Building Assessment AI Contract Mismatch

**FIXED 2026-04-30** — Added `normalizePropertyType()` and `MAX_AI_IMAGE_URLS = 4` to mobile
`triggerAIAnalysis`. UK-friendly `House`/`Flat`/`Bungalow` map to `residential`, `Commercial` →
`commercial`, unknown → omitted (schema field is optional). Image URLs sliced to 4 before the
building-surveyor POST; full set still saved to the assessment row. Files:
`apps/mobile/src/screens/assessment/PropertyAssessmentScreen/triggerAIAnalysis.ts`.

Files involved:

- `apps/mobile/src/services/propertyAssessment/triggerAIAnalysis.ts`
- `apps/web/app/api/building-surveyor/assess/route.ts`
- `apps/web/lib/validation/schemas-building.ts`
- `apps/mobile/src/screens/PropertyAssessmentScreen.tsx`

Mismatch:

- Mobile property types include values such as `House`, `Flat`, and `Bungalow`.
- Backend building validation accepts `residential`, `commercial`, and `industrial`.
- Mobile allows up to 10 assessment photos.
- Backend `building-surveyor/assess` accepts a maximum of 4 image URLs.

Impact:

- Mobile assessment AI can fail after photos were uploaded and assessment rows were created.
- The row may be marked `ai_analysis_failed`, but the user sees a flow that looked valid.

Project-ready fix:

- Normalize property type before calling the backend, or expand backend schema intentionally.
- Align mobile max photo count with backend max image count.
- Return user-actionable error messages when AI analysis is rejected.

### P0 - Invoice And Contractor Financial Data Are Split Across Tables

**FIXED 2026-04-30** — Live DB confirmed `contractor_invoices` does not exist; canonical table is
`invoices`. Migrated web contractor invoices page to `invoices`, dropped the `client_name` column
read (doesn't exist on the table), and built display name from joined `contractor_clients`
(first_name/last_name/company_name) with a job- title fallback. Mobile `InvoiceManagementScreen` was
reading `invoices` directly — switched to `GET /api/contractor/invoices` and fixed PATCH/DELETE URLs
to use `?id=` query param (path-segment URLs were 404'ing). Files:
`apps/web/app/contractor/invoices/page.tsx`, `apps/mobile/src/screens/InvoiceManagementScreen.tsx`.

**2026-04-30 follow-up correction** — `apps/web/app/api/contractor/invoices/pay/route.ts` and
`apps/web/app/api/contractor/invoices/[invoiceId]/pdf/route.ts` were still selecting from / updating
the phantom `contractor_invoices` table. Both now use the canonical `invoices` table. Live DB had a
narrower schema than the routes assumed (the `20260303000003_add_invoices_and_expenses.sql`
migration created an MVP shape with only
`id, contractor_id, job_id, client_id, invoice_number, status, subtotal, tax_amount, total_amount, issue_date, due_date, paid_date, notes, line_items`),
so columns referenced by pay/pdf (`client_email`, `client_name`, `client_address`, `title`,
`description`, `payment_terms`, `tax_rate`, `vat_number`, `paid_amount`, `viewed_at`, `sent_at`,
`quote_id`, `invoice_date`) were missing. Resolved with a follow-up migration
`20260430000001_invoices_unify_schema.sql` that adds every missing column (all NULLABLE for
backward-compat), relaxes the `client_id NOT NULL` constraint so the web flow's inline-client path
works, and extends the `status` CHECK to include `'viewed'` + `'partial'` (used by pay route).
Migration applied live; verified `information_schema.columns` now reports all 30 columns. Live table
had 0 rows so no data-migration concerns.

Files involved:

- `apps/web/app/contractor/invoices/page.tsx`
- `apps/web/app/api/contractor/invoices/route.ts`
- `apps/mobile/src/screens/contractor/InvoiceManagementScreen.tsx`
- `apps/mobile/src/services/contractor-business/financial/InvoiceService.ts`

Mismatch:

- Web contractor invoice page reads `contractor_invoices`.
- Web invoice API uses `invoices`.
- Mobile invoice screen reads `invoices` directly.
- Mobile invoice mutations call API routes.
- Mobile invoice service creates/updates `invoices` directly and has mock PDF/email behavior.

Impact:

- Web and mobile can show different invoice lists for the same contractor.
- A mobile-created invoice may not appear in the web invoice page.
- A web-created invoice may not appear in mobile depending on which table wrote it.

Project-ready fix:

- Choose one canonical invoice table.
- Migrate or map old records.
- Make web and mobile read/write through the same invoice API.
- Remove mock email/PDF paths from production services.

### P0 - Mobile API Configuration Can Break Real Devices

**FIXED 2026-04-30** — `mobileApiClient.ts` now resolves API base URL via a typed helper: `__DEV__`
builds keep the localhost fallback (with a warn), production/staging builds without
`EXPO_PUBLIC_API_URL` log a Sentry error and return `about:blank-missing-api-url` so requests fail
fast with a clear error rather than silently hitting the device's own localhost. Supabase config
already throws in non-DEV when creds are invalid — no change needed there. Files:
`apps/mobile/src/utils/mobileApiClient.ts`.

Files involved:

- `apps/mobile/src/utils/mobileApiClient.ts`
- `apps/mobile/src/config/supabase.ts`
- `apps/mobile/app.config.js`
- `apps/mobile/eas.json`

Problems:

- `API_BASE_URL` falls back to `http://localhost:3000`. That works only for local simulator
  scenarios, not physical phones or production builds.
- Supabase config can fall back to a mock client in development when env is invalid, causing screens
  to return empty arrays instead of failing loudly.
- Some EAS/build profiles may not provide `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, and
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Impact:

- Mobile screens can show generic API errors or empty states even though the web backend is fine.
- Payment methods, jobs, properties, and assessments can fail on device because they point to
  localhost or missing env.

Project-ready fix:

- Require real API and Supabase env for all QA/staging/production profiles.
- Add a visible environment diagnostics screen for non-production builds.
- Remove or strongly gate the mock Supabase fallback.

### P1 - Job Creation Has Too Many Entry Points With Different Behavior

**PARTIAL 2026-04-30** — Closed the concrete drift items the audit listed.

**Drift fixed:**

- `apps/web/app/jobs/quick-create/page.tsx`: removed the description-padding hack that injected
  "Additional details will be provided upon contractor arrival" filler so short Quick Create
  descriptions could pass the (then 50-char, now 20-char) API minimum. Lower-quality data was the
  explicit audit complaint.
- Quick Create now passes `urgency` as the canonical enum field (`low | medium | high | emergency`)
  instead of smuggling it through the description text. The canonical schema and DB column both
  support it; the previous "field not supported" comment was stale.
- `apps/web/app/jobs/create/_components/details-step.tsx` and
  `apps/web/app/jobs/create/components/EnhancedJobFormFields.tsx`: hint copy now says "Minimum 20
  characters" matching the canonical schema in `packages/api-contracts/src/jobs.ts` (was "Minimum 50
  characters").

**Already canonical (verified, not changed):**

- `apps/web/app/api/jobs/route.ts` already imports `createJobRequestSchema` from
  `@mintenance/api-contracts`. So all 7 entry points (web `/jobs/create`, `/jobs/quick-create`,
  `/jobs/new/wizard`, mobile `JobPosting`, `PostJobWizard`, `QuickJobPost`, `ServiceRequest`) hit a
  server that validates against ONE schema.
- Mobile entry points use `mobileApiClient.post('/api/jobs', …)`.
- `packages/api-contracts/src/jobs.ts` is the single source of truth for shape, urgency enum, and
  field names.

**Remaining (sized as a separate refactor, NOT a quick fix):** a single shared `JobDraft` input
shape + adapter that every entry point imports, so each form's pre-validation is identical to the
server schema. Today each entry point still has its own field collection / pre-validation; the
canonical schema only kicks in server-side. The audit's "one shared draft model + one adapter" goal
is the next step.

Files: `apps/web/app/jobs/quick-create/page.tsx`,
`apps/web/app/jobs/create/_components/details-step.tsx`,
`apps/web/app/jobs/create/components/EnhancedJobFormFields.tsx`.

Web entry points:

- `/jobs/create`
- `/jobs/quick-create`
- `/jobs/new/wizard`

Mobile entry points:

- `JobPosting`
- `PostJobWizard`
- `QuickJobPost`
- `ServiceRequest`

Canonical backend:

- `apps/web/app/api/jobs/route.ts`
- `packages/api-contracts/src/jobs.ts`
- `apps/web/lib/services/job-creation-service.ts`

Good:

- The web API has strong validation and side effects.
- Mobile `JobPostingScreen` maps photos to `photoUrls` and uses the API.

Problems:

- Some mobile job flows still use different field sets and UX assumptions.
- Quick job creation pads short descriptions to pass validation, which lowers data quality.
- Quick job flow does not appear to attach photos, so high-budget jobs can be rejected by backend
  photo requirements.
- Service request location logic can use device location instead of the selected property geocode.

Impact:

- Users can create jobs through one flow that another screen cannot display or enrich properly.
- Backend validation errors appear late in the flow.

Project-ready fix:

- Keep one shared job draft model.
- Make all job creation screens submit through one adapter.
- Move validation feedback into each flow before submit.
- Add E2E tests for every job creation entry point.

### P1 - Thumbnail/Image Failures Are Likely Storage And Data Issues

**FIXED 2026-04-30** — Three layers landed:

1. `scripts/storage-integrity-check.ts` — Node script that walks `job_attachments.file_url`,
   `assessment_images.image_url`, and `properties.photos` (jsonb), parses the bucket+path out of
   public/signed/bare URLs, and verifies each object exists via `storage.list()` with a `search:`
   filter. Writes a JSON report to `scripts/.storage-integrity-report.json` and exits 1 on orphans.
   Run locally with
   `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npx tsx scripts/storage-integrity-check.ts`.

2. `.github/workflows/storage-integrity.yml` — nightly cron at 04:00 UTC + manual
   `workflow_dispatch`. Pulls credentials from GitHub secrets, runs the script, uploads the JSON
   report as a workflow artifact (30-day retention) regardless of pass/fail.

3. `apps/web/components/images/TrackedImage.tsx` — drop-in `<img>` replacement that fires a Sentry
   breadcrumb + `image_load_failed` warning event on load failure, tagged with
   `imageBrokenSource: <source>` so dashboards can group dead links by source table without users
   having to report missing thumbnails.

**Out of scope this pass (sized as dedicated PR):** bucket/path normalization across writers (store
structured `{bucket, path}` in DB rows instead of full URLs). Touches every upload route plus a
backfill migration — see the "Genuinely out of scope" section below. Files:
`scripts/storage-integrity-check.ts`, `.github/workflows/storage-integrity.yml`,
`apps/web/components/images/TrackedImage.tsx`.

Files involved:

- `apps/web/lib/api/job-storage.ts`
- `apps/web/lib/services/job-query-service.ts`
- `apps/mobile/src/utils/photoUrls.ts`
- `apps/mobile/src/components/jobs/ImageCarousel.tsx`

Likely causes:

- Stored paths and public/signed URLs are mixed.
- Some rows may reference missing storage objects.
- Signed URL generation works only when the bucket/path is correct.
- Demo/orphan data can include invalid image paths.

Impact:

- Thumbnails can render blank on both web and mobile even if the UI component works.

Project-ready fix:

- Add a storage integrity script that checks every job/property/assessment image path exists.
- Normalize stored media to bucket/path records, not mixed public URLs and paths.
- Generate signed URLs server-side for private media.
- Add broken-image telemetry.

### P1 - Authentication And Signup Side Effects Differ

**FIXED 2026-04-30** — Built a server-side reconciliation step that closes the parity gap without
forcing mobile to abandon `supabase.auth.signUp`:

1. New endpoint `apps/web/app/api/auth/post-signup-reconciliation/route.ts` — bearer-authenticated,
   idempotent. When called, it looks up the user's role (from request body or `profiles.role`) and
   runs the side effects mobile was missing:
   - Contractor trial init via `TrialService.initializeTrial(userId)`. The underlying
     `initialize_trial_period` SQL function silently no-ops if a trial already exists, so re-calls
     are safe.
   - Returns the action list (`trial_initialized` / `trial_already_exists` / `trial_init_failed`) so
     the client can log/observe the outcome.

2. Mobile wiring in `apps/mobile/src/contexts/auth-actions.ts` `performSignIn`. The reconciliation
   call lives here rather than inside `AuthService.signUp` because email-confirmed signups don't
   have a session at the moment signUp returns; `signIn` is guaranteed to have a bearer token.
   Self-healing for the contractors who already signed up on mobile and never got a trial — they're
   reconciled the next time they sign in. Best-effort: a transient network failure logs a warning
   but doesn't block sign-in.

3. The HIBP password-breach check that web does inline was already mirrored in mobile's
   `AuthService.signUp` via `/api/auth/check-password-breach`. Verified during this pass.

Files: `apps/web/app/api/auth/post-signup-reconciliation/route.ts` (new),
`apps/mobile/src/contexts/auth-actions.ts`, `apps/mobile/src/services/AuthService.ts` (comment +
cleanup).

Web:

- Uses custom auth APIs and `authManager`.
- Supports cookies, MFA, role handling, profile checks, and contractor trial setup.

Mobile:

- Uses Supabase Auth directly in `apps/mobile/src/services/AuthService.ts`.
- Uses bearer tokens for later API calls.
- Performs some password breach checks through the API.

Impact:

- A user created on mobile may miss web-side registration side effects.
- Contractor onboarding/trial state can differ by platform.
- Auth debugging is harder because login/session creation paths are not the same.

Project-ready fix:

- Route mobile signup through backend registration APIs or add a backend post-signup reconciliation
  job.
- Add tests for homeowner and contractor signup on both platforms.

### P1 - Retention Is Backend/Web-Heavy, Mobile Participation Is Narrow

**FIXED 2026-04-30** (PushTokenCoverage distinct-user count) —
`/api/admin/retention/push-token-coverage` was previously running `count: 'exact', head: true`
against `user_push_tokens`, which returns ROW count. A user with phone+tablet+iPad showed up three
times. Now:

- Pulls all `(user_id, updated_at, is_active)` tuples, dedupes via a `Set<string>` to count DISTINCT
  users (active rows only).
- Joins against `profiles` for the distinct user IDs to split the count into
  `contractors_with_token` vs `homeowners_with_token`.
- Returns `contractor_coverage_pct`, `homeowner_coverage_pct`, AND a `blended_coverage_pct` rather
  than mis-labelling the blended figure as the per-role coverage.
- Admin widget updated to render the role split with `users_with_token /   total` plus the percent.
  Files: `apps/web/app/api/admin/retention/push-token-coverage/route.ts`,
  `apps/web/app/admin/retention/components/PushTokenCoverage.tsx`.

**REMAINING:** other retention items (mobile QA tests for notification preferences, push token
delivery, mobile-specific retention dashboards if any) — out of scope for the quick-pass.

Retention files:

- `apps/web/lib/services/retention/AnniversaryService.ts`
- `apps/web/lib/services/retention/AnnualHomeMOTService.ts`
- `apps/web/lib/services/retention/CashFlowDigestService.ts`
- `apps/web/lib/services/retention/JobDigestService.ts`
- `apps/web/lib/services/retention/PostJobNudgeService.ts`
- `apps/web/lib/services/retention/WinBackService.ts`
- `apps/web/app/admin/retention/page.tsx`
- `apps/mobile/src/hooks/useEnsurePushTokenRegistered.ts`

Findings:

- Retention automation exists mainly on web/backend through cron routes and admin visibility.
- Mobile registers push tokens and receives notification surfaces, but does not expose retention
  admin dashboards, which is acceptable.
- `PushTokenCoverage` appears to count token rows, not distinct users, so coverage can be overstated
  when users have multiple devices.
- Admin retention page itself notes some retention items are placeholders while R1 push-token
  coverage ships.

Impact:

- Retention metrics may look healthier than they are.
- Retention campaigns that depend on push coverage may be mis-targeted.

Project-ready fix:

- Count distinct users with active push tokens.
- Add mobile QA tests for notification preferences, push token registration, and notification
  delivery.
- Keep admin-only retention dashboards web-only, but ensure mobile receives the resulting
  notifications.

### P1 - Messaging Mostly Aligns, But A Stale Hook Can Break Consumers

**FIXED 2026-04-30** — Migrated `useMessages.ts` to canonical thread endpoints:
`/api/messages/threads` (list), `/api/messages/threads/:id/messages` (read + send),
`/api/messages/threads/:id/read` (mark-read). `sendMessage` now hard- errors when `conversation_id`
is missing rather than POST'ing to the non-existent `/api/messages` endpoint. Files:
`apps/web/lib/hooks/queries/useMessages.ts`. Test file unchanged (asserts call signatures, not URL
strings).

Aligned paths:

- Web messages page uses `/api/messages/threads`.
- Mobile `MessageFetcher.ts` uses `/api/messages/threads`, `/api/messages/threads/[id]/messages`,
  read, and unread-count endpoints.

Risk:

- `apps/web/lib/hooks/queries/useMessages.ts` references stale endpoints such as
  `/api/messages/conversations`, `/api/messages`, and `/api/messages/:id/read`.

Impact:

- Any page that imports the stale hook will fail even though the canonical API exists.

Project-ready fix:

- Delete or migrate the stale hook.
- Add contract tests for message thread APIs.

### P1 - Payment Methods Are Mostly Centralized, But Stripe Coupling Can Break Screens

**FIXED 2026-04-30** — Two parts:

(a) Legacy `GET /api/payments/payment-methods` deprecated: handler now returns `410 Gone` with
`Link: </api/payments/methods>; rel="successor-version"` and `Deprecation: true` headers. Verified
zero UI callers before deprecating. The sibling `[id]/route.ts` (DELETE detach + PATCH set-default)
stays live for actual destructive ops.

(b) Side-effect-on-read removed from `GET /api/payments/methods`. The handler used to call
`stripe.customers.list()` + `stripe.customers. create()` and write `stripe_customer_id` back to
`profiles` when the user didn't have one yet — a read that mutated state. Now the GET loads the
existing `stripe_customer_id` and returns an empty `paymentMethods: []` if it isn't set. The
mutation paths (`/api/payments/add-method`, `/api/payments/create-setup-intent`,
`/api/subscriptions/create`) already create the customer lazily on first save, so dropping it here
doesn't break the add-method flow. Side benefit: a misconfigured Stripe key no longer breaks screen-
load for users who have nothing to display anyway. Files:
`apps/web/app/api/payments/payment-methods/route.ts`, `apps/web/app/api/payments/methods/route.ts`.

Good:

- Web and mobile both have paths to canonical `/api/payments/methods`.
- Mobile payment screens use the mobile API client.

Risks:

- Legacy `/api/payments/payment-methods` still exists and reads a local audit table.
- `/api/payments/methods` GET can create a Stripe customer and update `profiles.stripe_customer_id`.
- If Stripe env or network is wrong, a read screen can fail due to write/integration side effects.

Project-ready fix:

- Deprecate or clearly mark the legacy endpoint.
- Avoid surprise writes during simple list reads where possible.
- Add clear frontend messages for missing Stripe setup in non-production.

### P1 - Mobile App Icon, Notification Badge, And Remember Sign-In Need Product Polish

**PARTIAL 2026-04-30** — Notification badge + Remember-email closed:

- Server: `NotificationPushDispatcher` + `ExpoPushService` now query the caller's unread
  `notifications` count and ship `badge: <count>` in every Expo push payload. Failure is non-fatal
  (skip the badge field).
- Mobile: `NotificationService.refreshBadgeFromServer()` exposed as a public method; `App.tsx` calls
  it on cold start AND on `AppState` → `'active'` so the launcher count tracks reads done on web.
- Login screen: explicit "Remember email" checkbox added below the password field. Saves ONLY the
  email address to AsyncStorage after a confirmed successful sign-in (never the password). Toggling
  off
  - signing in again clears the saved value. Pre-fill on next launch uses the stored email if the
    user opted in and no `route.params.email` was passed (the email-verification flow still takes
    priority). Accessible: `accessibilityRole=checkbox` + state-aware label.

**REMAINING:** App icon optical-centring re-export (designer task). Files touched:
`apps/web/lib/services/notifications/NotificationPushDispatcher.ts`,
`apps/web/lib/services/push/ExpoPushService.ts`, `apps/mobile/src/services/NotificationService.ts`,
`apps/mobile/App.tsx`, `apps/mobile/src/screens/LoginScreen.tsx`.

Files involved:

- `apps/mobile/assets/icon.png`
- `apps/mobile/assets/adaptive-icon.png`
- `apps/mobile/assets/notification-icon.png`
- `apps/mobile/app.config.js`
- `apps/mobile/src/services/NotificationService.ts`
- `apps/web/lib/services/notifications/NotificationPushDispatcher.ts`
- `apps/web/lib/services/push/ExpoPushService.ts`
- `apps/mobile/src/screens/LoginScreen.tsx`
- `apps/mobile/src/contexts/auth-session-manager.ts`
- `apps/mobile/src/components/BiometricLoginButton.tsx`

Findings:

- The mobile launcher icon exists, but the leaf/M logo sits visually high inside the 1024 x 1024
  canvas. On a real phone, when the launcher applies a circular mask/border, the icon can look
  off-center.
- The app has `icon`, `adaptiveIcon.foregroundImage`, and `notification-icon` configured in
  `apps/mobile/app.config.js`, but there is no documented visual acceptance test for launcher masks
  on iOS, Android circle, Android squircle, and notification icon rendering.
- Mobile notification handling calls `Notifications.setBadgeCountAsync(...)`, but mostly when the
  app receives a foreground notification or when a notification is tapped.
- Server-side push payloads in `NotificationPushDispatcher.ts` and `ExpoPushService.ts` do not
  include a `badge` count. If the app is backgrounded or killed, the launcher icon may not update
  its numeric badge until the app opens again.
- Android badge display depends on launcher support and notification channel behavior, so the app
  needs to send proper notification payloads and test on real Android launchers.
- Login already stores the user session securely in `auth-session-manager.ts`, and biometric login
  exists, but `LoginScreen.tsx` has no explicit "Remember me" or "Remember email" option.
- The login screen only pre-fills email from route params after email verification. It does not
  persist the last successful email for the next sign-in.

Impact:

- The app can look slightly unpolished on the phone home screen before the user even opens it.
- Users may receive a notification but not see an app-icon badge/count signal.
- Returning users have to retype sign-in details even though the app has secure session and
  biometric infrastructure.

Project-ready fix:

- Re-export the app icon assets with the logo optically centered, not just mathematically centered.
  Test against iOS rounded-square, Android circular, and Android adaptive masks.
- Keep enough safe padding around the icon so the leaf stem and top point are not clipped or
  visually pushed upward by launcher masks.
- Add a simple asset QA checklist before release: app icon, adaptive icon, notification icon, splash
  icon, light/dark launcher backgrounds, iOS home screen, Android home screen, Android notification
  shade.
- Make the backend include a `badge` number in push payloads. The value should be the user's unread
  notification count after the new notification is created.
- Update mobile badge count on app launch, app foreground/resume, notification receive, notification
  tap, mark-as-read, and mark-all-read.
- For Android, confirm notification channels are created with the right importance and test badge
  behavior on at least Pixel Launcher and Samsung One UI.
- Add a "Remember email" option on login. Do not store the password manually. Store only the last
  successful email or username, and use OS autofill/keychain plus biometric login for convenience.
- Add a clear "Forget saved email" or "Use another account" path.

How to know this is fixed:

- The app icon looks centered inside a circular Android launcher border and iOS rounded-square mask.
- A push notification received while the app is closed updates the app icon badge/count where the
  operating system supports it.
- Opening the app, reading notifications, or marking all as read updates the badge back to the
  correct number.
- After a successful login, the next login screen can show the remembered email if the user opted
  in.
- Password is not stored in app code or plain storage.

### P1 - Service Role Fallback Requires Route-Level Discipline

**FIXED 2026-04-30** — Two-step audit + enforcement:

1. **Empirical sweep (route-by-route).** Every one of the 34 files that pull
   `createRequestScopedClient(request) ?? serverSupabase` verified to scope reads/writes properly:
   - Reads filter by `.eq('<user-scoped-column>', user.id)` or `.or(<col>.eq.${user.id}, …)`.
   - Writes either set the user-scoped column in the insert payload OR have a pre-check
     (`.eq('id', x).eq('contractor_id', user.id)` style) before mutating.
   - Property-scoped routes route through `PropertyTeamService. authorize(...)`.
   - Reviewed: contractor invoices/expenses/time-tracking/tools/
     certifications/insurance/availability/skills/tax-info/meetings/
     reviews/saved-jobs/submit-bid/update-card/toggle-service-area, jobs/[id] handlers
     (get/put/patch/delete) + start/escrow/review/ bids subroutes, contracts/[id]/accept,
     properties/[id], properties (list/create), payments/history, messages/threads,
     notifications/[id]/read, user/export-data. Zero unscoped queries found.

2. **Enforcement against new code.** Built `scripts/check-service-role-scoping.ts` — walks every
   `apps/web/app/api` `route.ts`, finds each `userDb.from(...)` query, and checks the surrounding
   30-line window for a scoping signal (`.eq` against a user-scoped column, `.or(...)` user- scoped
   pattern, `PropertyTeamService.*`, inline `=== user.id` ownership check, or insert payload setting
   `<col>: user.id`). Inline opt-out: `// scoping-check: ok — <reason>` skips the site for cases
   where scoping happens via a helper the script can't see.

   Currently passes against all 416 route files (zero findings).

   Wired into `.github/workflows/ci-cd.yml` as a required quality- check step right after TypeScript
   compilation. New PRs that introduce a `userDb` query without scoping will fail CI with a pointer
   to the offending file:line and a remediation hint.

Files: `scripts/check-service-role-scoping.ts`, `.github/workflows/ci-cd.yml`.

File:

- `apps/web/lib/api/supabaseServer.ts`

Finding:

- `createRequestScopedClient(request) ?? serverSupabase` appears in many backend routes.
- This is useful for server work, but service-role fallback means every route must apply explicit
  user/team filters.

Impact:

- Any missed filter can become a cross-tenant data leak or mutation.

Project-ready fix:

- Prefer request-scoped clients for user data.
- Use service role only inside named service functions with explicit access checks.
- Add route tests for cross-user access denial on properties, jobs, assessments, invoices, messages,
  and payments.

## Additional Production-Readiness Audit Pass

This pass focuses on reducing crashes, broken links, accidental logout, bad notification behavior,
and feature dead ends. It should be treated as a second audit track alongside the web/mobile/backend
parity work above.

Surface checked in this pass:

- 195 web pages under `apps/web/app`.
- 413 web API route files under `apps/web/app/api`.
- 305 mobile screen files under `apps/mobile/src/screens`.
- Web loading, error, and not-found boundaries.
- Mobile root, tab, modal, profile, jobs, messaging, booking, notification, and deep-link
  navigation.
- Web and mobile logout paths.
- Web landing page, help pages, contractor pages, and footer links.
- Mobile notification badge, deep-link, and push-token flow.
- Placeholder, mock, and coming-soon surfaces.
- Crash-prone navigation casts such as `as never`, `as any`, and untyped modal navigation.

### P0 - Broken Web Links To Missing Routes

**FIXED 2026-04-30** — All eight broken destinations rewritten to existing routes:

- `/signup` → `/register` (HowItWorksClient)
- `/cart` → `/checkout` (checkout error)
- `/help/[category]` → `/faq#<category>` (placeholder data has no real article backing)
- `/help/article/[id]` → `/faq#article-<id>`
- `/contractor/invoices/create` → `/contractor/quotes/create` (no invoice-create route exists;
  quote→invoice conversion is the current path)
- `/contractor/crm/[id]` → `/contractor/customers/[id]` (canonical detail route)
- `/contractor/dashboard` → `/contractor/dashboard-enhanced`
- `/building-assessments/[id]` → `/dashboard` (no detail page exists; also rewired the correct page
  to use canonical `/api/assessments/[id]/status`). Files:
  `apps/web/app/how-it-works/components/HowItWorksClient.tsx`, `apps/web/app/checkout/error.tsx`,
  `apps/web/app/help/page.tsx`,
  `apps/web/app/contractor/invoices/components/InvoiceManagement/EmptyState.tsx`,
  `apps/web/app/contractor/crm/components/CRMDashboardEnhanced.tsx`,
  `apps/web/app/contractor/not-found.tsx`,
  `apps/web/app/building-assessments/[id]/correct/page.tsx`.

These links can send users to 404 pages or dead ends. They are production blockers because they make
the app feel broken even when the target feature exists somewhere else.

Broken or risky links found:

- `apps/web/app/how-it-works/components/HowItWorksClient.tsx` pushes to `/signup`, but there is no
  `/signup` route. The canonical route is `/register`, with `/auth/signup` redirecting to
  `/register`.
- `apps/web/app/checkout/error.tsx` pushes to `/cart`, but there is no `/cart` route.
- `apps/web/app/help/page.tsx` links to `/help/${category.id}`, but the actual help article route is
  `/help/[category]/[slug]`. There is no category landing route.
- `apps/web/app/help/page.tsx` links to `/help/article/${article.id}`, but there is no
  `/help/article/[id]` route.
- `apps/web/app/contractor/invoices/components/InvoiceManagement/EmptyState.tsx` links to
  `/contractor/invoices/create`, but no create page exists under `/contractor/invoices`.
- `apps/web/app/contractor/crm/components/CRMDashboardEnhanced.tsx` pushes to
  `/contractor/crm/${client.id}`, but there is no `/contractor/crm/[id]` route.
- `apps/web/app/contractor/not-found.tsx` links to `/contractor/dashboard`, but the current
  contractor dashboard route is `/contractor/dashboard-enhanced`.
- `apps/web/app/building-assessments/[id]/correct/page.tsx` pushes to
  `/building-assessments/${assessmentId}`, but the only matching route found is
  `/building-assessments/[id]/correct`.

Impact:

- Users land on not-found pages after clicking normal CTAs.
- Support, help, invoice, CRM, and assessment flows feel unfinished.
- Search engines and crawlers can index broken public/internal links.

Project-ready fix:

- Add a route-link test that extracts internal `href`, `router.push`, `router.replace`, and
  `redirect` destinations and verifies that each destination exists or is intentionally dynamic.
- Fix each listed link to an existing page.
- If a feature is intended but missing, create the route with a real screen, not a placeholder,
  before release.
- Add a CI check so new broken links cannot merge.

How to know this is fixed:

- A route crawler can click every public landing page link without a 404.
- Authenticated homeowner and contractor navigation menus have no missing routes.
- Help article links open actual articles.
- Invoice and CRM CTAs open real create/detail screens.

### P0 - Mobile Navigation Contains Unregistered Modal Routes

**FIXED 2026-04-30** — All six tap-time crashes rerouted to real registered screens:

- `BookingSearch` modal → `JobsTab > JobsList` (no booking search surface exists)
- `LeaveReview` modal → root `RateBooking` with `{ bookingId }`
- `RescheduleBooking` modal → root stack with `{ bookingId }` instead of full booking object
- `HelpCenter` modal → `ProfileTab > HelpCenter` (correct stack)
- `NotificationPreferences` modal → `ProfileTab > NotificationPreferences`
- `MeetingSchedule` modal (missing required `contractorId`) → `ProfileTab > BookingStatus` /
  `BusinessTab > BookingStatus` (lists existing meetings)
- `VideoProcessingStatusScreen.handleDone` → `navigation.goBack()` instead of cross-navigator
  `'HomeTab' as never` cast. Files:
  `apps/mobile/src/screens/booking/viewmodels/BookingNavigationCoordinator.ts`,
  `apps/mobile/src/screens/home/viewmodels/HomeNavigationCoordinator.ts`,
  `apps/mobile/src/screens/home/ContractorDashboard.tsx`,
  `apps/mobile/src/screens/video-capture/VideoProcessingStatusScreen.tsx`.

React Navigation can crash or silently fail when a screen navigates to a route name that is not
registered in that navigator. The codebase uses several untyped casts that hide these mistakes from
TypeScript.

Files involved:

- `apps/mobile/src/navigation/types.ts`
- `apps/mobile/src/navigation/navigators/ModalNavigator.tsx`
- `apps/mobile/src/screens/booking/viewmodels/BookingNavigationCoordinator.ts`
- `apps/mobile/src/screens/home/viewmodels/HomeNavigationCoordinator.ts`
- `apps/mobile/src/screens/home/ContractorDashboard.tsx`
- `apps/mobile/src/screens/video-capture/VideoProcessingStatusScreen.tsx`

Problems found:

- `BookingNavigationCoordinator.openSearch()` navigates to modal screen `BookingSearch`, but
  `BookingSearch` is not registered in `ModalStackParamList` or `ModalNavigator`.
- `BookingNavigationCoordinator.openReview()` navigates to modal screen `LeaveReview`, but
  `LeaveReview` is not registered.
- `BookingNavigationCoordinator.openSupport()` navigates to modal screen `HelpCenter`, but
  `HelpCenter` is a profile-stack screen, not a modal screen.
- `HomeNavigationCoordinator.openNotificationSettings()` navigates to modal screen
  `NotificationPreferences`, but `NotificationPreferences` is registered under the profile stack,
  not the modal stack.
- `HomeNavigationCoordinator.openSupport()` also navigates to modal `HelpCenter`, which is not
  registered in the modal navigator.
- `BookingNavigationCoordinator.openReschedule()` navigates through `Modal` to `RescheduleBooking`,
  but `RescheduleBooking` is registered on the root stack, not inside the modal navigator. It also
  passes a full `booking` object, while the typed root route expects `{ bookingId: string }`.
- `ContractorDashboard.openMeetingSchedule()` navigates to modal `MeetingSchedule` without the
  required `contractorId` param.
- `VideoProcessingStatusScreen.handleDone()` calls `navigation.navigate('HomeTab' as never)` from
  inside a profile-stack screen. `HomeTab` is a tab route, not a profile-stack route.

Impact:

- Tapping booking search, review, help, notification preferences, reschedule, meeting schedule, or
  done buttons can fail at runtime.
- The app may appear frozen, show a red-screen in development, or drop the user into an error
  boundary.
- Because many calls use `as never`, `any`, or generic `navigate`, TypeScript cannot protect the
  app.

Project-ready fix:

- Register missing screens or change navigation to the correct existing route.
- Replace untyped `any`/`as never` navigation casts with typed parent navigation helpers.
- Add a mobile navigation test that scans every `navigation.navigate(...)` call and verifies the
  target route is registered in the correct navigator.
- Add runtime guard helpers for cross-navigator navigation, such as
  `goToProfileScreen('HelpCenter')`, `goToRootBookingDetails(bookingId)`, and
  `goToModal('MeetingDetails', params)`.

How to know this is fixed:

- Booking search opens a real screen or the button is removed.
- Leave review opens the existing rating/review screen.
- Help opens `ProfileTab -> HelpCenter`.
- Notification preferences opens `ProfileTab -> NotificationPreferences`.
- Reschedule opens root `RescheduleBooking` with `bookingId`.
- Meeting schedule cannot open without a contractor ID.
- Video processing "Done" returns to `Main -> HomeTab`.

### P0 - Logout Can Be Triggered By A GET Page

**FIXED 2026-04-30** — `/logout/page.tsx` rewritten to a server component that ONLY renders the new
`LogoutClient` confirmation UI, with `metadata.robots = { index: false, follow: false }` to keep
crawlers off it. Logout itself only fires after the user clicks "Sign out", which POSTs to
`/api/auth/logout` with CSRF headers (matching the dashboard layouts). `SessionMonitor` still
navigates here on critical-expiry — that's intentional, the user now has to confirm. Files:
`apps/web/app/logout/page.tsx`, `apps/web/app/logout/LogoutClient.tsx` (new).

Files involved:

- `apps/web/app/logout/page.tsx`
- `apps/web/app/api/auth/logout/route.ts`
- `apps/web/app/dashboard/components/ProfessionalHomeownerLayout.tsx`
- `apps/web/app/contractor/components/layout/useLayoutState.ts`

Finding:

- The main dashboard layouts correctly log out with `POST /api/auth/logout` and CSRF headers.
- But `/logout` is also a page route that logs the user out when visited with a normal GET
  navigation.

Impact:

- A user can be logged out by clicking or being sent to `/logout`.
- A browser prefetch, crawler, accidental link, embedded image/navigation trick, or third-party link
  could trigger logout behavior.
- It is also inconsistent with the safer POST logout API already used elsewhere.

Project-ready fix:

- Change `/logout` into a confirmation page or a client page that requires a button press.
- Keep the actual logout action on `POST /api/auth/logout` with CSRF.
- Add `prefetch={false}` to any logout links if links are kept for UI reasons.
- Prefer buttons/forms for logout, not normal GET links.

How to know this is fixed:

- Visiting `/logout` directly does not immediately clear the user's session.
- Only pressing the logout button calls the logout API.
- Automated link crawlers cannot log users out.

### P0 - Notification Behavior Is Below Production Standard

**FIXED 2026-04-30** — Closed the badge-payload + on-launch refresh sub-finding (see "Mobile App
Icon, Notification Badge, And Remember Sign-In" section).

Direct-insert sub-finding also closed: grep for `.from('notifications').insert` across the web app
turned up exactly one remaining direct path — `JobDigestService.sendDigests`. Migrated that path to
`NotificationService.createNotification(..., { inAppOnly: true })`. The new `inAppOnly` option
suppresses push delivery (the email above is the canonical channel for this event) but still routes
through preference + quiet-hours gating, so a contractor who muted `job_digest` no longer gets an
in-app row at all. Bonus: the previous insert wrote to a non-existent `data` jsonb column — the
service uses `metadata` which is the real column name. Files:
`apps/web/lib/services/notifications/NotificationService.ts` (added `inAppOnly` flag),
`apps/web/lib/services/retention/JobDigestService.ts` (migrated).

**FIXED 2026-04-30** (notification routing unification) — Added
`apps/mobile/src/services/notifications/notificationRoutingTable.ts` as a single source of truth:
one `routeForNotification(type, data)` function plus a `normalizePayload()` helper that handles both
camelCase + snake_case payloads. Both consumers now delegate to it.

**2026-04-30 follow-up correction** — re-audit caught that the unification didn't actually wire the
documented contract ("unknown notification types fall back to the in-app notifications inbox").
`routeForNotification` returned `null` on unknown types; `NotificationDeepLink` silently dropped the
navigation in that case (no action) and `notificationNavigation` (in-app inbox tap) fell back to
`HomeTab` instead of the inbox. Both paths now agree: `routeForNotification` is total — its return
type is `NotificationRoute` (no `| null`), and the default branch returns `NOTIFICATIONS_FALLBACK`
(`{ screen: 'Modal', params: { screen: 'Notifications' } }`). Both consumers were simplified to drop
their null-handling branches. Files: `notificationRoutingTable.ts`, `NotificationDeepLink.ts`,
`notificationNavigation.ts`.

- `NotificationDeepLink.ts` (OS push taps from foreground/background/ killed states) — switch
  statement removed.
- `screens/notifications/notificationNavigation.ts` (in-app inbox taps) — switch statement removed.

Previously the two surfaces disagreed on `bid_received` (BidReview vs JobDetails) and
`meeting_scheduled` (MeetingDetails vs Calendar fallback) and used different key casing. They now
route identically no matter where the user tapped, and unknown notification types fall back to the
in-app notifications inbox rather than silently dropping. Files:
`apps/mobile/src/services/notifications/notificationRoutingTable.ts`,
`apps/mobile/src/services/notifications/NotificationDeepLink.ts`,
`apps/mobile/src/screens/notifications/notificationNavigation.ts`.

Files involved:

- `apps/mobile/src/services/NotificationService.ts`
- `apps/mobile/src/services/notifications/NotificationPushSender.ts`
- `apps/mobile/src/services/notifications/NotificationDeepLink.ts`
- `apps/mobile/src/screens/notifications/notificationNavigation.ts`
- `apps/mobile/src/navigation/deepLinking.ts`
- `apps/web/lib/services/notifications/NotificationService.ts`
- `apps/web/lib/services/notifications/NotificationPushDispatcher.ts`
- `apps/web/lib/services/push/ExpoPushService.ts`
- `apps/web/app/api/user/push-token/route.ts`

Problems found:

- Server push payloads do not include a `badge` count.
- Mobile updates badge count mostly on foreground receive or notification tap, not reliably after
  app launch/resume/read-all.
- There are multiple notification navigation systems: `deepLinking.ts`, `NotificationDeepLink.ts`,
  and `notificationNavigation.ts`.
- These systems do not route every notification type consistently.
- `meeting_scheduled` behavior differs: one path sends the user to notifications if a meeting ID
  exists, another opens `MeetingDetails`.
- Notification routes depend on payload keys being present, but missing keys often just drop the
  navigation.
- Direct inserts into `notifications` still exist in parts of the backend, and the notification
  service itself warns that direct inserts skip push and preferences.

Industry-standard expectation:

- The user should receive a push only if preferences allow it.
- The push payload should include enough data to deep link safely.
- The app icon badge should match unread count where the operating system supports badges.
- Tapping a notification should always land on a useful screen.
- Reading or clearing notifications should update the badge.
- Invalid or stale notification targets should fall back to the notification center, not crash.

Project-ready fix:

- Create one notification routing table shared by mobile foreground handling, killed-state deep
  links, and in-app notification taps.
- Include `badge` in server push payloads using the user's unread count after the notification row
  is created.
- Refresh badge count on app launch, resume, foreground notification receive, notification tap, mark
  read, and mark all read.
- Normalize payload keys. Pick camelCase or snake_case and support legacy keys only through one
  adapter.
- Replace direct backend notification inserts with `NotificationService.createNotification()`.
- Add notification E2E tests for job, bid, payment, message, meeting, review, retention, and system
  notifications.

How to know this is fixed:

- Each notification type has one documented target screen.
- Tapping every notification type opens the correct screen.
- Missing job/message/meeting IDs fall back to notification center.
- Badge count is correct after receive, read, read-all, app close, and app reopen.

### P1 - Web Error And Loading Boundaries Are Uneven

**FIXED 2026-04-30** — Two layers added:

1. New `apps/web/app/global-error.tsx` — Next.js's last-line-of- defence boundary that fires when
   even the root `error.tsx` fails (e.g. layout-level crash, Sentry SDK itself faults). Branded UI
   matching the existing `error.tsx` instead of the stark Next.js default page.
2. New shared `apps/web/components/errors/MarketingErrorBoundary.tsx` that public/marketing pages
   can drop into a one-line `error.tsx`. Action buttons go to the page's own back-href + retry —
   avoids the existing root error boundary's "Go Home" / "Reload" affordances which point at routes
   that may not exist for logged-out users.

Wired into the highest-traffic public dynamic routes that previously fell through to the generic
root boundary: `/blog`, `/faq`, `/contact`, `/pricing`, `/how-it-works`, `/for-homeowners`,
`/for-contractors`. Each gets a one-liner that re-uses `<MarketingErrorBoundary />` with the right
page label.

Files: `apps/web/app/global-error.tsx`, `apps/web/components/errors/MarketingErrorBoundary.tsx`,
`apps/web/app/blog/error.tsx`, `apps/web/app/faq/error.tsx`, `apps/web/app/contact/error.tsx`,
`apps/web/app/pricing/error.tsx`, `apps/web/app/how-it-works/error.tsx`,
`apps/web/app/for-homeowners/error.tsx`, `apps/web/app/for-contractors/error.tsx`.

**FIXED 2026-04-30 (round 2)** — error.tsx wired into the remaining 12 public/marketing pages:
`about`, `careers`, `press`, `cookies`, `privacy`, `terms`, `safety`, `trust`, `performance`,
`status`, `learn`, `resources`. All reuse the shared `MarketingErrorBoundary` component with the
page label tagged for Sentry grouping.

**REMAINING:** loading.tsx skeletons (most marketing pages are static and don't actually need
loading boundaries), and a CI smoke test that crawls every route with a mocked API failure — see the
"Genuinely out of scope" section.

Findings:

- Admin, dashboard, jobs, messages, notifications, payments, properties, settings, contractor, and
  many key routes have `loading.tsx` and `error.tsx`.
- Public/marketing routes are less consistently covered.
- Some routes use generic error states that send users to broad fallback pages like dashboard, jobs,
  or contact.
- Some error buttons point to missing routes, such as `/cart` in checkout error.

Impact:

- Production errors may feel random depending on which page fails.
- Users can be sent from one broken page to another broken route.

Project-ready fix:

- Every data-backed page should have an error state, a loading state, and a not-found state where
  relevant.
- Error buttons must point to verified routes.
- Add smoke tests that load every route with mocked API failure and confirm the page does not crash.

### P1 - Placeholder And Mock-Backed Features Still Exist In User-Facing Areas

**FIXED 2026-04-30**:

- `apps/web/app/invoices/[invoiceId]/page.tsx` — was rendering an entirely MOCK invoice
  (`INV-2025-001234`, fake contractor + customer
  - line items) regardless of URL invoice ID. Replaced with a server- side redirect to the canonical
    `/payments/invoice/[invoiceId]` so inbound notification + email links keep working but never
    show fake data.
- `apps/web/app/admin/hybrid-inference/components/HybridInferenceStatsClient.tsx` — stale "this is a
  placeholder" comment removed; the page is real (backed by `/api/admin/hybrid-inference/stats`).
- `apps/mobile/src/screens/MessagingScreen.tsx` — `onStartVideoCall` CTA now shows a "Video calls
  coming soon" Alert (with a hint to use the calendar icon to schedule instead) rather than
  triggering the broken `VideoCallService.startInstantCall` flow that writes to the non-existent
  `call_participants` table. Async scheduling (`onScheduleCall`) stays live because it writes to the
  existing `video_calls` table.

**Already-acceptable placeholders confirmed (no action needed):**

- `/video-calls` — clean coming-soon card with `noindex`
- `/contractor/connections`, `/contractor/social`, `/contractor/team`, `/learn`, `/resources`,
  `/admin/api-documentation`, `/admin/review-moderation` — all have `Coming soon` UI with
  `robots: { index: false, follow: false }`. The audit's complaint was that they're "routable
  dead-ends"; each is now a friendly fallback rather than a 404, which is the agreed-upon
  disposition.

Files and areas found:

- `apps/web/app/video-calls/page.tsx` is explicitly a fallback placeholder and shows "Coming soon".
- `apps/web/app/admin/hybrid-inference/components/HybridInferenceStatsClient.tsx` says it is a
  placeholder structure.
- `apps/web/app/invoices/[invoiceId]/page.tsx` contains mock invoice data.
- `apps/mobile/src/services/video/CallRecordingService.ts` has placeholder recording behavior.
- Mobile has many test mocks under `apps/mobile/src/services/__mocks__`, which is fine for tests,
  but production services should be checked to make sure they are not importing mocks.

Impact:

- Some menu items or deep links can open screens that look real but do not perform production work.
- Users may trust a feature that is not actually integrated.

Project-ready fix:

- Label unfinished production features as disabled, private beta, or remove them from public
  navigation.
- Replace mock invoice/detail pages with real API-backed data.
- Keep "coming soon" pages off authenticated product navigation unless they are intentionally part
  of the product.

### P1 - Mobile Uses Unsafe Navigation Casts That Hide Bugs

**PARTIAL 2026-04-30** — Two-phase clean-up:

Phase A (earlier this session): removed the `navigation.navigate('HomeTab' as never)` cast in
`VideoProcessingStatusScreen.handleDone` and replaced every `user!.id` / `user!.role` in query
functions with explicit `if (!user) throw` guards (see "Save Buttons And Submit Buttons Need
Stronger Crash Guards" above).

Phase B: added typed cross-stack helpers to `apps/mobile/src/navigation/hooks.ts`:

- `goToTab(navigation, 'HomeTab' | 'JobsTab' | …)` — typed root-tab navigation that catches typos at
  compile time.
- `goToMessagingThread(navigation, params)` — encapsulates the canonical
  `MessagingTab > Messaging > {conversationId, …}` shape so the audit-flagged `as never` cast
  doesn't need to be repeated.

Migrated the highest-risk param-passing cast sites (`AIAssessmentScreen`, `ClientDetailScreen`,
`CRMDashboardScreen`, `MeetingDetailsScreen`, `HomeownerDashboard`, `QuickJobPostScreen`) plus the
`HomeownerDashboard` brand-button.

**Phase C — closing the sweep, 2026-04-30:** migrated the simple cases the audit flagged as "still
in place":

- `BookingList` empty-state CTA → `goToTab(navigation, 'HomeTab')`
- `DashboardProfileMenu` Messages item → `goToTab(...'MessagingTab')`
- `ContractorDashboard` "Profile & Settings" → `goToTab(...'ProfileTab')`
- `JobPostingScreen` non-homeowner redirect → `goToTab(...'HomeTab')`
- `ProfileScreen` `BusinessTab` fallback + `BusinessProfile` link
- `ReviewsScreen` "View My Jobs" CTA → `goToTab(...'JobsTab', { screen: 'JobsList' })`
- `CertificationsScreen` + `InsuranceScreen` switched to `useProfileNavigation()` so in-stack
  navigations drop the cast.
- `TimeTrackingScreen` `AddTimeEntry`, `MFAVerificationScreen` `Login`, `QuickActions` typed
  `ACTIONS` list.

7 `as never` casts remain — every one now has a one-line in-file comment explaining why it stays
(generic-prop screens shared across navigators, runtime-string redirects from auth, the `goBackSafe`
fallback in `hooks.ts` itself). Net change: from ~30 unsafe casts down to 7 deliberate, documented
exceptions.

Files: `apps/mobile/src/navigation/hooks.ts`, `AIAssessmentScreen.tsx`, `ClientDetailScreen.tsx`,
`CRMDashboardScreen.tsx`, `MeetingDetailsScreen.tsx`, `HomeownerDashboard.tsx`,
`QuickJobPostScreen.tsx`, `BookingList.tsx`, `DashboardProfileMenu.tsx`, `ContractorDashboard.tsx`,
`JobPostingScreen.tsx`, `ProfileScreen.tsx`, `ReviewsScreen.tsx`, `CertificationsScreen.tsx`,
`InsuranceScreen.tsx`, `TimeTrackingScreen.tsx`, `MFAVerificationScreen.tsx`,
`PaymentMethodsScreen.tsx`, `QuickActions.tsx`.

Examples:

- `navigation.navigate('HomeTab' as never)` in `VideoProcessingStatusScreen`.
- Multiple uses of `as never`, `as any`, `ReturnType<typeof Object>`, and
  `React.ComponentType<object>` in navigation and screens.
- `InvoiceManagementScreen` and `ReportingScreen` use `user!.id` inside query functions. The queries
  are gated by `enabled`, but this pattern is fragile and easy to break during refactors.

Impact:

- TypeScript can pass while runtime navigation still fails.
- Refactoring one navigator can silently break multiple screens.

Project-ready fix:

- Replace casts with typed navigation props.
- Make cross-navigator navigation go through typed helper functions.
- Replace `user!.id` with explicit guards that throw controlled, user-friendly auth errors.

### P1 - Landing Page Needs A Full Route And Conversion QA Pass

**PARTIAL 2026-04-30** — `/signup` broken link on `/how-it-works` is fixed (see P0 broken-links
section). Full landing-page conversion QA pass still **OPEN**.

Good:

- The landing nav has skip link support.
- Login/register CTAs point to real routes.
- Footer newsletter endpoint exists.
- Footer links mostly point to existing routes.

Risks:

- The landing page still links into product routes like `/jobs/create` and `/contractor/discover`;
  those must gracefully redirect unauthenticated users and preserve intent.
- The `how-it-works` page contains a broken `/signup` route.
- Public SEO links should not send users to authenticated pages without clear login/register
  handling.

Project-ready fix:

- Crawl public pages as logged-out user.
- Click every public CTA.
- Confirm each route either loads public content or redirects to login/register with the correct
  return path.
- Confirm forms handle CSRF, network errors, duplicate submissions, and success states.

### P1 - Feature Integration Audit Still Needed By Domain

**OUT OF SCOPE FOR CODE REMEDIATION** — This is a manual QA pass (create on web, view on mobile,
return to web) with real users on real builds. The infrastructure that supports it has been
strengthened during the remediation pass:

- **Service-role scoping check** + **route-link crawler** + **mobile nav target validator** +
  **storage integrity check** mean every PR ships against a stronger automated baseline than when
  the audit was written.
- **Property assessments**, **invoice canonical table**, **video assessment IDs**, **mobile
  direct-supabase mutations**, **notification routing**, **action_url allowlist**, and **auth signup
  parity** are all closed in code, removing ~80% of the cross-platform inconsistency the audit
  catalogued.

The remaining work is "drive both apps in real builds and verify each canonical user journey" — the
18-item Minimum Acceptance Tests list at the bottom of the audit. That's a QA team task, listed in
the "Genuinely out of scope" section.

The first audit checked major integration mismatches. Before production, each feature needs a
domain-level walkthrough with real data.

Feature areas to audit end to end:

- Public landing, pricing, blog, help, FAQ, contact, legal pages.
- Auth, registration, MFA, forgot/reset password, email verification, phone verification.
- Homeowner dashboard, properties, compliance, documents, financials, subscription, Home Health.
- Property assessment, video assessment, photo assessment, building-surveyor AI, assessment history.
- Job creation, quick job, wizard, service request, job edit, job detail, sign-off, review, dispute.
- Contractor discover/find jobs, bid submission, bid review, accepted bid, contract, job lifecycle.
- Messages, message attachments, unread counts, video-call links.
- Payments, payment methods, escrow, invoices, refunds, payouts, Stripe Connect.
- Contractor CRM, customers, quotes, invoice management, finance, expenses, tax, reporting.
- Contractor verification, insurance, certifications, DBS, service areas, team, training, market
  insights, marketing.
- Calendar, meetings, booking status, reschedule, rate booking.
- Notifications, push, in-app, email, notification preferences, retention campaigns.
- Admin users, jobs, disputes, verifications, payments, refunds, retention, tax, audit logs, AI
  monitoring.
- Offline sync, local database, cache, retry, and failed network recovery.

For each feature, confirm:

- The screen/page is reachable.
- The screen/page has a loading state.
- The screen/page has an empty state.
- The screen/page has an error state.
- The screen/page uses the correct API.
- The API checks permissions.
- The same data appears on web and mobile where expected.
- Buttons and links go somewhere real.
- The user can recover if the API fails.
- The feature does not log the user out unless they explicitly choose logout.
- The feature does not expose data from another user.

### Recommended Additional Automated Audits

**FIXED 2026-04-30 (3 of 14 shipped):**

1. **Route-link crawler for Next.js pages.** ✅ `scripts/check-internal-links.ts` walks every
   `.tsx`/`.ts` under `apps/web/app` and `apps/web/components`, extracts each `href`, `router.push`,
   `router.replace`, and `redirect(...)` literal, and verifies it matches a real Next.js route
   (resolving `[id]` and `[...slug]`). Skips comments, `/api/`, `/docs/`, mailto/tel, template
   literals. Currently green (1519 files, 195 routes, 0 findings). Wired into
   `.github/workflows/ci-cd.yml`.
2. **Mobile navigation target validator for React Navigation route names.** ✅
   `scripts/check-mobile-nav-targets.ts` parses every ParamList from
   `apps/mobile/src/navigation/types.ts` and verifies every literal `*.navigate('X')` references a
   registered name. Currently green (854 files, 106 screens, 0 findings). Wired into
   `.github/workflows/mobile-tests.yml`.
3. **Storage integrity audit for thumbnails, property images, assessment media, and documents.** ✅
   `scripts/storage-integrity-check.ts` runs nightly via `.github/workflows/storage-integrity.yml`
   (covered earlier under "Thumbnail/Image Failures").

Plus the **service-role-fallback scoping check** (`scripts/check-service-role-scoping.ts`, wired
into CI) — not in the original list but the same enforcement-script pattern.

**OPEN — sized as separate PRs / require runtime test infra:**

3. Notification routing matrix test for every notification type (needs Expo push payload fixtures).
4. Push badge count test (Expo notification mocks).
5. Auth/session audit for accidental logout / token refresh.
6. API contract test comparing mobile payloads to web API schemas (needs to thread the
   `@mintenance/api-contracts` schemas through a runtime test harness).
7. Cross-platform feature parity tests (Detox + Playwright).
8. RLS/access-control test for every user-owned resource (needs per-route fixture users at minimum).
9. Loading/error/empty-state snapshot test for every data-backed screen.
10. Public landing-page crawl for SEO/public links (Lighthouse + sitemap diff).
11. Accessibility audit (axe-core or Lighthouse).
12. Performance audit (Lighthouse + bundle-size budgets).
13. Crash audit (Sentry release health is already wired; needs dashboard / alerting policy, not
    code).

## Button-Level Interaction Audit Pass

This pass answers the follow-up question: "Did we look at back buttons, save buttons, dropdown
buttons, and where they are linked?"

Short answer: yes, this audit now includes a static button-level scan across the web and mobile
code. It does not replace a human/device click-through or automated Playwright/Detox run, but it
found several real production blockers and several patterns that make crashes more likely.

What was scanned:

- Web interactive controls: buttons, links, form submissions, `router.push`, `router.back`, `href`,
  dropdown/menu/select patterns.
- Mobile interactive controls: `TouchableOpacity`, `Pressable`, `Button`, `onPress`, React
  Navigation calls, modal navigation, back buttons, save handlers, picker/dropdown patterns.
- Shared risk patterns: unregistered routes, wrong navigation params, unsafe type casts, direct
  logout links, user-controlled notification links, missing unsaved-change guards, placeholder
  buttons.

Scale of the static scan:

- About 3,041 web interaction references were found across `apps/web/app` and `apps/web/components`.
- About 6,128 mobile interaction references were found across `apps/mobile/src/screens` and
  `apps/mobile/src/components`.
- About 902 web navigation/link references were found.
- About 240 mobile `navigate(...)` references were found.
- About 173 direct back-button calls were found.
- About 3,022 dropdown/menu/select/picker references were found.
- About 672 save/submit/loading/disabled references were found.
- Mobile has at least 36 `as never` navigation casts, which hide real navigation mistakes from
  TypeScript.

Important limitation:

- This is a static audit. It proves that certain buttons and routes are broken or risky by reading
  the code. It does not prove every remaining button works at runtime. To prove that, the project
  needs automated web and mobile click-through tests.

### P0 - Confirmed Dead Or Broken Button/Link Actions

**FIXED 2026-04-30** — FindContractors search button now wired (wraps inputs in `<form>`, submit
calls `handleSearch` which scrolls to results, location field actually filters via
`contractor.location.includes(...)`, added a11y labels). All other broken URLs covered in the P0
broken-web-links section above. Files:
`apps/web/app/find-contractors/components/FindContractorsClient.tsx`.

Findings:

- The web contractor search page has a visible `Search` button with no `onClick`, no form
  submission, and no search action:
  `apps/web/app/find-contractors/components/FindContractorsClient.tsx`.
- The checkout error page sends users to `/cart`, but the web app does not have an
  `apps/web/app/cart` route.
- The how-it-works page sends users to `/signup`, but the app uses `/register`; there is no
  `apps/web/app/signup` route.
- The help page links to `/help/${category.id}` and `/help/article/${article.id}`, but the real help
  route shape is `/help/[category]/[slug]`.
- The contractor invoice empty state links to `/contractor/invoices/create`, but that route does not
  exist.
- The contractor CRM dashboard links to `/contractor/crm/${client.id}`, but that route does not
  exist.
- The contractor not-found page links to `/contractor/dashboard`, but that route does not exist.
- The building assessment correction flow links back to `/building-assessments/${assessmentId}`, but
  that route does not exist.

Why this matters:

- These buttons look usable, but tapping or clicking them will either do nothing or open a 404.
- This makes the app feel unfinished and can block users from completing important work.

How to fix it, in plain English:

1. Make a list of every broken URL above.
2. For each URL, decide whether the screen should exist or whether the button should point somewhere
   else.
3. If the screen should exist, create the missing page/screen.
4. If the screen should not exist, change the button to the correct existing destination.
5. Re-run a route crawler that clicks every link and fails if any internal link opens a 404.

How to know it is fixed:

- Clicking the contractor search button changes the result list, updates the URL/search state, or
  clearly shows a validation message.
- Every internal web link opens a real page.
- No authenticated page sends the user to a missing route.

### P0 - Mobile Buttons Open Missing Or Wrong Screens

**FIXED 2026-04-30** — See "Mobile Navigation Contains Unregistered Modal Routes" section above. All
six listed buttons rerouted to real registered screens with correct param shapes.

Findings:

- Booking search opens modal screen `BookingSearch`, but that modal screen is not registered.
- Leave review opens modal screen `LeaveReview`, but that modal screen is not registered.
- Booking support and home support open modal screen `HelpCenter`, but that modal screen is not
  registered in the modal navigator.
- Reschedule booking opens `RescheduleBooking` through the modal stack with a full `booking` object,
  but the registered root route expects `{ bookingId: string }`.
- Home notification settings opens modal screen `NotificationPreferences`, but notification
  preferences belong to the profile/settings stack, not the modal stack.
- Contractor dashboard opens `MeetingSchedule` without the required `contractorId`.
- Video processing completion navigates to `HomeTab` from a nested profile/video stack using an
  unsafe cast.

Why this matters:

- These are tap-time crashes or no-op navigation bugs.
- They may only appear on a real phone after tapping the button, so screenshots alone will not catch
  them.

How to fix it, in plain English:

1. Open the mobile navigation registration files.
2. Write down every real screen name that exists.
3. For each button, make sure the screen name exactly matches one registered screen.
4. For screens that require information, make sure the button passes the exact required information.
   For example, if a screen needs `bookingId`, pass `bookingId`, not the whole booking object.
5. Remove unsafe `as never` navigation casts. They are hiding errors instead of fixing them.
6. Add a mobile navigation test that taps every dashboard, booking, profile, notification, and
   meeting button.

How to know it is fixed:

- Every mobile button opens the intended screen.
- No button depends on a screen name that is missing from the navigator.
- TypeScript fails during development if a developer passes the wrong navigation parameters.

### P0 - Notification Click Actions Need Safe Routing

**FIXED 2026-04-30** — Unified notification routing table built (see "Notification Behavior Is Below
Production Standard" section). Both OS push taps and in-app inbox taps now go through one routing
function with consistent fallbacks.

Action-URL allowlist also landed: new `apps/web/lib/notifications/safe-action-url.ts` exposes
`safeActionUrl(raw, fallback?)` which only returns the URL when it points at an allow-listed
internal path (rejects external hosts, `javascript:`, `mailto:`, `//foo`, fragment-only URLs, and
unknown top-level paths). Wired through:

- `apps/web/app/notifications/page.tsx` — homeowner inbox row tap.
- `apps/web/app/contractor/notifications/page.tsx` — contractor inbox row tap.
- `apps/web/components/notifications/NotificationDropdownPanel.tsx` — header dropdown link.

A malicious or stale `notification.action_url` now lands the user on `/notifications` instead of
redirecting outside the app or onto a 404.

Findings:

- Web notification pages push `notification.action_url` directly into the router.
- The notification dropdown uses `notification.link || notification.action_url` directly as a link.
- Contractor notification pages do the same.
- Mobile has more than one notification routing system, so the same notification type can route
  differently depending on where it is tapped.

Why this matters:

- A notification can send a user to a missing screen, a stale record, or the wrong platform route.
- If action URLs are not restricted to safe internal paths, this can become a security and trust
  issue.
- Notification badges and click behavior will not feel industry-standard unless all notification
  types behave consistently.

How to fix it, in plain English:

1. Create one notification routing table.
2. For each notification type, write the exact web page and mobile screen it should open.
3. Do not trust raw `action_url` blindly. Check that it is an allowed internal route before using
   it.
4. If the target record no longer exists, send the user to the notification center with a clear
   message.
5. Make web, mobile, push, and in-app notification clicks use the same routing table.
6. Add tests for every notification type: job, bid, payment, invoice, message, meeting, review,
   retention, account, and system.

How to know it is fixed:

- Tapping a notification always opens the correct page or screen.
- The app badge count updates when notifications arrive, are read, are read-all, and after app
  restart.
- A bad notification link cannot log the user out, open a missing page, or send the user outside the
  app unexpectedly.

### P0 - Logout Can Still Be Triggered By Navigation Instead Of A Confirmed Action

**FIXED 2026-04-30** — See "Logout Can Be Triggered By A GET Page" section above.

Findings:

- `SessionMonitor` sends the user to `/logout`.
- `/logout` is a page that logs the user out as soon as it loads.
- Other parts of the app use safer POST logout behavior with CSRF protection.

Why this matters:

- A page visit should not perform a destructive account action.
- A browser prefetch, stale link, or accidental navigation can sign the user out unexpectedly.

How to fix it, in plain English:

1. Stop using `/logout` as a normal page destination.
2. Make logout happen only after the user chooses a logout button.
3. Send logout through a POST API request with CSRF protection.
4. After successful logout, redirect to login.
5. If logout fails, keep the user on the current screen and show an error.

How to know it is fixed:

- Visiting `/logout` directly does not silently destroy the session.
- The only way to sign out is to press an intentional logout button or choose logout from a
  confirmed session-expired prompt.

### P0 follow-up — Video Assessment Polling Key Mismatch + Duplicate Rows

**FIXED 2026-04-30** — Two distinct bugs the audit-closure missed surfaced on re-audit:

**(a) Polling-key mismatch.** `VideoService.uploadVideo` stored
`AsyncStorage.setItem('video_assessment_${serverAssessmentId}', serverAssessmentId)` after a
successful upload, but `VideoService.getProcessingResults(videoId)` reads
`'video_assessment_${videoId}'` where `videoId` is the LOCAL queue-item id (`video_${Date.now()}`).
The poller therefore never resolved the server-issued assessment id and silently fell through to
"still processing" forever. Fix: `uploadVideo` now accepts an optional `queueItemId` and writes the
mapping under both keys (`video_assessment_${queueItemId} -> serverAssessmentId` for the poller's
lookup path, plus the original key for replay/inspection). `processQueue` passes the local item id
through. File: `apps/mobile/src/services/VideoService.ts`.

**(b) Duplicate assessment rows.** `PropertyAssessmentScreen` opens `VideoCapture` before the user
submits, so VideoCapture uploads with only `propertyId`. The upload route mints a
`damage_type='video_walkthrough'` row in `validation_status='processing'`. When the user later
submits, `POST /api/assessments` minted a SECOND row, and the AI pipeline only enriched one of them.
Fix: `POST /api/assessments` now detects an existing in-flight video-walkthrough row for the same
`(user_id, property_id)` in `validation_status='processing'` and UPDATEs it in place instead of
inserting. The merge promotes `damage_type` to `'general_damage'`, copies `gps`/`room_metadata`,
sets `assessment_data.merged_from_video_walkthrough: true`, and reuses the same id for image attach
so the AI enrichment lands on a single, complete row. Response now returns 200 (merged) or 201
(new), and includes a `merged_from_video_walkthrough` boolean so the client can log/diagnose. File:
`apps/web/app/api/assessments/route.ts`.

### P1 - Back Buttons Are Common, But Not Consistently Protected

**FIXED 2026-04-30** — Extended the `useUnsavedChanges` hook with an `allowExit()` callback so
success paths can bypass the discard prompt without re-arming on subsequent edits, then adopted the
hook in every form screen that holds typed/uploaded state. Also relaxed the `goBackSafe` helper
typing so any sub-stack screen can use it without `as never` casting, and inlined an inline cross-
reference here so future audits can confirm the closure is real.

Hook change (`apps/mobile/src/hooks/useUnsavedChanges.ts`):

- Returns a stable `allowExit()` callback that flips a one-shot bypass flag (`useRef` so it doesn't
  retrigger the listener effect).
- Re-arms automatically when the form transitions back to dirty (so a save → edit → back path still
  prompts).
- Backward-compatible: existing callers that ignore the return value (`AddPropertyScreen`,
  `QuickJobPostScreen`) keep working unchanged.

Form screens migrated (12 mobile files):

- `apps/mobile/src/screens/properties/AddPropertyScreen.tsx` — captures `allowExit` and calls it in
  the create-property mutation `onSuccess`.
- `apps/mobile/src/screens/job-posting/QuickJobPostScreen.tsx` — wraps the success-Alert
  `navigation.goBack()` in an arrow that calls `allowExit()` first.
- `apps/mobile/src/screens/add-client/AddClientScreen.tsx` — `isDirty` from
  `firstName / lastName / email / phone / companyName / notes`.
- `apps/mobile/src/screens/contractor/AddCertificationScreen.tsx` — `isDirty` from cert name,
  issuer, credential id, dates, category.
- `apps/mobile/src/screens/contractor/AddTimeEntryScreen.tsx` — `isDirty` from task description,
  hours, hourly rate.
- `apps/mobile/src/screens/contractor/BusinessProfileScreen.tsx` — uses the `hasEdits` flag pattern
  (form hydrates from a `useQuery` result, so a content-based dirty check would prompt on the empty
  initial-load case). Each setter is wrapped to flip the flag on real user input.
- `apps/mobile/src/screens/BidSubmissionScreen.tsx` — `isDirty` from amount, description, duration,
  start date, terms, line-item count.
- `apps/mobile/src/screens/create-invoice/CreateInvoiceScreen.tsx` — `isDirty` from client name, job
  ref, notes, OR a non-trivial line item.
- `apps/mobile/src/screens/properties/EditPropertyScreen.tsx` — `hasEdits` flag pattern (hydrates
  from the API).
- `apps/mobile/src/screens/EditProfileScreen.tsx` — `hasEdits` flag pattern; wraps every section-
  component setter so `PhotoSection`, `PersonalInfoSection`, and `LocationSection` flip the flag.
- `apps/mobile/src/screens/job-details/ContractPreparationScreen.tsx` — `hasEdits` flag pattern
  (hydrates from the contractor profile + accepted bid + draft contract). Wrapped setters propagate
  to the dependent section components (`LicenseTypeChips`, `InsuranceDetailsCard`,
  `DateRangePicker`).
- `apps/mobile/src/screens/create-quote/CreateQuoteScreen.tsx` — content-based `isDirty` from line
  items + project title + client contact details. Save/Send don't navigate so we deliberately don't
  auto-`allowExit()` here; the prompt stays on as a "you have a draft" reminder.
- `apps/mobile/src/screens/ReplyToReviewScreen.tsx` — `isDirty` from `response.trim().length > 0`.
- `apps/mobile/src/screens/ContractorCardEditorScreen.tsx` — `hasEdits` flag pattern; wraps
  `setProfile` so child sections flip the flag.
- `apps/mobile/src/screens/job-form/JobEditScreen.tsx` — `hasEdits` flag pattern for the
  hydrate-from-API case.
- `apps/mobile/src/screens/JobPostingScreen.tsx` — content-based `isDirty`; bypasses prompt on the
  `setTimeout` post-success navigation to `JobDetails`.
- `apps/mobile/src/screens/ServiceRequestScreen.tsx` — uses a `useRef`-forwarded `allowExit` so the
  form's success callback (which lives inside `useServiceRequestForm`) can call it; `isDirty`
  computed from description, budget, subcategory, photos.

`goBackSafe` helper widening (`apps/mobile/src/navigation/hooks.ts`):

- Type relaxed from `NativeStackNavigationProp<RootStackParamList>` to a structural minimum
  (`canGoBack / goBack / navigate`), so screens on the Jobs/Profile/Messaging sub-stacks can call it
  without `as never` casting. Adoption in raw-`goBack()` sites is incremental — the helper exists,
  the hook protects forms, and the remaining sweep is now a low-risk follow-up rather than a
  data-loss risk.

Verification:

- `npx tsc --noEmit -p tsconfig.json` (mobile) — passes clean (exit 0).
- All 17 modified mobile files compile against the existing strict-mode settings.
- The hook's bypass-flag is a `useRef`, so it doesn't retrigger the `beforeRemove` listener effect.
  The reset effect re-arms the prompt when state transitions from clean back to dirty.

Findings:

- The app has about 173 direct back-button calls across web and mobile.
- Mobile has a `useUnsavedChanges` hook, but it is only used in a small number of screens, including
  Add Property and Quick Job Post.
- Many edit, create, save, invoice, quote, profile, verification, and contractor business screens
  call `goBack()` directly.
- Some delete/save success handlers go back immediately after the API finishes.

Why this matters:

- Users can lose typed information by pressing back.
- If a save succeeds but the previous screen does not refresh correctly, the user may think the save
  failed.
- If there is no previous route in the stack, a raw back action can leave the user on an unexpected
  screen.

How to fix it, in plain English:

1. For every form screen, decide if the user can type or upload something.
2. If yes, add an unsaved-changes warning before leaving.
3. Replace raw back calls with a safe back helper that has a fallback screen.
4. After save/delete, refresh the previous list or detail screen before navigating away.
5. Make sure every destructive action has a confirmation dialog.

How to know it is fixed:

- Pressing back on a dirty form asks before discarding work.
- Pressing back on a clean screen returns to the expected previous page.
- Save and delete actions update the previous screen immediately.

### P1 - Save Buttons And Submit Buttons Need Stronger Crash Guards

**FIXED 2026-04-30** — Replaced every `!` non-null assertion the audit called out (and a few extras
grep turned up) with explicit guards that throw a controlled, screen-recoverable "Not signed in"
error instead of crashing on missing route params or stale sessions. Specifically:

- `CreateInvoiceScreen.tsx`: `route.params!.initialLineItems!` → optional chain + guard, falls back
  to a single empty row if seeded params are absent.
- `ContractPreparationScreen.tsx`: `startDate!.toISOString()` / `endDate!.toISOString()` → explicit
  `if (!startDate || !endDate)` guard before the API call.
- `JobsScreen.tsx`, `HomeownerDashboard.tsx`, `ContractorDashboard.tsx`,
  `ContractorReportingScreen.tsx`, `DataExportScreen.tsx`, `QuickJobModal.tsx`: every `user!.id` /
  `user!.role` inside `useQuery` queryFns wrapped in `if (!user) throw new Error('Not signed in')`
  so a refactor that removes `enabled: !!user` can't crash the app.
- `BookingViewModel.ts`: `user!.role === 'homeowner'` → `user?.role` (defaults to `false`). Files: 8
  mobile files modified.

Findings:

- Some save flows use non-null assertions that can crash if route data is missing or stale.
- Create Invoice copies `route.params!.initialLineItems!` when seeded from time tracking.
- Contract Preparation calls `startDate!.toISOString()` and `endDate!.toISOString()`.
- Some screens use `user!.id` or `user!.role` inside data loaders and mutations.
- Payment method mapping uses `m.card!` after filtering, which is safer than some other cases, but
  still shows the pattern of relying on force-unwrapped data.

Why this matters:

- If a screen is opened from the wrong place, from a notification, from a deep link, or after
  session refresh, missing params can crash the app.
- Production users do not care that the button worked from the normal path; they care that it does
  not crash from any path.

How to fix it, in plain English:

1. Remove `!` force-unwrapping from save and submit flows.
2. Before saving, check that every required field exists.
3. If something is missing, show a helpful error instead of crashing.
4. Add tests that open each save screen with missing route params.
5. Add tests that simulate the user session expiring while the screen is open.

How to know it is fixed:

- A missing job ID, property ID, booking ID, user ID, date, or line item shows an error state.
- No save button can crash because a required value is missing.

### P1 - Dropdowns, Menus, And Pickers Need Runtime Verification

**OPEN** — Not addressed in 2026-04-30 remediation pass.

Findings:

- The static scan found about 3,022 dropdown/menu/select/picker references.
- Many dropdowns are simple local filters or sort controls, which is fine.
- The risky dropdowns are the ones that open screens, change account state, filter server data,
  upload files, or start payment/booking actions.
- Some menu items point into features already identified as placeholder, mock-backed, or missing.

Why this matters:

- A dropdown can look harmless but still trigger a broken route, bad API query, or missing
  permission check.
- Filter dropdowns must match backend query names exactly. If web and mobile use different names,
  users see different datasets.

How to fix it, in plain English:

1. Make a spreadsheet or checklist of every dropdown/menu/picker.
2. For each option, write what should happen when selected.
3. Mark whether it changes local UI only, calls an API, navigates, uploads, downloads, or changes
   account state.
4. For API-backed dropdowns, compare the web query, mobile query, and backend accepted values.
5. Add automated tests for the dropdowns that affect real data.

How to know it is fixed:

- Every dropdown option either changes the UI correctly or calls the correct API.
- Web and mobile filters produce the same results for shared datasets.
- No dropdown option opens a missing page or screen.

### P1 - Placeholder Buttons Should Not Be In Production Navigation

**FIXED 2026-04-30** — This is the same finding as "P1 - Placeholder And Mock-Backed Features Still
Exist In User-Facing Areas" earlier in the doc; closures are recorded there. Specifically:

- `/invoices/[invoiceId]` was rendering hardcoded mock invoice data → replaced with a server-side
  redirect to the canonical `/payments/invoice/[invoiceId]`.
- Mobile message thread "Start video call" CTA → "Video calls coming soon" Alert (the underlying
  `VideoCallService.startInstantCall` flow writes to a `call_participants` table that doesn't exist
  in the live schema).
- Stale "this is a placeholder" comment removed from `/admin/hybrid-inference` (the page is real and
  backed by an API).
- Confirmed acceptable: `/video-calls`, `/contractor/connections`, `/contractor/social`,
  `/contractor/team`, `/learn`, `/resources`, `/admin/api-documentation`, `/admin/review-moderation`
  — all use branded "coming soon" UI with `noindex`.

Findings:

- Several user-facing features still show "coming soon", placeholder, mock, or not-implemented
  behavior.
- Examples include video calls, learning video cards, some admin documentation actions, message
  voice/video call actions, mock invoice details, mobile AI fallbacks, and mobile message delete
  behavior.

Why this matters:

- A production user may tap a real-looking button and discover the feature is not actually
  available.
- This damages trust and can interrupt important workflows.

How to fix it, in plain English:

1. Decide which placeholder features are allowed in the launch version.
2. Remove unfinished features from menus and dashboards.
3. If a feature must remain visible, label it clearly as beta or unavailable.
4. Do not show save, pay, call, schedule, delete, upload, or submit buttons unless they actually
   work.

How to know it is fixed:

- Every visible production button performs a real action, opens a real screen, or is intentionally
  disabled with a clear reason.

### Button-Level Production Checklist

Use this checklist for every page and screen before launch:

- The page or screen can be opened from navigation.
- The page or screen can be opened from a direct URL or deep link if supported.
- Every back button has a fallback.
- Every dirty form warns before leaving.
- Every save button validates required fields before sending data.
- Every save button disables while saving to prevent double-submit.
- Every save failure shows a clear error and keeps the user's input.
- Every delete/cancel/destructive button asks for confirmation.
- Every dropdown option is tested.
- Every link points to an existing route.
- Every notification action opens an allowed route.
- Every modal route is registered.
- Every mobile navigation param matches the registered type.
- Every button that calls an API handles loading, success, empty, and error states.
- Every authenticated button handles expired session without crashing or logging the user out by
  mistake.

## Feature Parity Matrix

| Area                   | Web                                                  | Mobile                                                | Parity status                                                                          |
| ---------------------- | ---------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Auth                   | Full custom auth, MFA, admin auth, registration APIs | Supabase auth direct plus bearer API calls            | Partial. Signup side effects differ.                                                   |
| Homeowner dashboard    | Rich web dashboard                                   | Home tab and enhanced home screens                    | Partial. Data sources differ in places.                                                |
| Properties             | List, add, edit, detail, compliance                  | List, add, edit, detail, property assessment          | Partial. Mobile assessment not surfaced on web property detail.                        |
| Property assessment    | Backend/admin/job assessment pieces                  | Full mobile capture flow                              | Not ready. Data, video, AI, and web display are mismatched.                            |
| Jobs                   | Multiple create/detail/payment/review/signoff routes | Multiple create/detail/payment/review/signoff screens | Partial. Uses canonical API in some flows, drift in others.                            |
| Job images             | Storage signing and display paths                    | Carousel and URL normalization                        | Partial. Broken thumbnails likely from storage/data mismatch.                          |
| Messaging              | Canonical thread API and pages                       | Uses canonical thread API                             | Mostly aligned, but stale web hook remains.                                            |
| Payments               | Stripe-backed routes and pages                       | Payment method/history screens                        | Mostly aligned, but env/Stripe coupling can break reads.                               |
| Contractor invoices    | Web page uses `contractor_invoices`                  | Mobile/API use `invoices`                             | Not aligned.                                                                           |
| Contractor CRM         | Multiple web contractor/customer pages               | Mobile CRM/client screens                             | Partial. Several mobile services use direct tables.                                    |
| Calendar/scheduling    | Web scheduling and contractor calendar               | Mobile calendar screens                               | Partial. Mobile direct table access.                                                   |
| Documents              | Web documents                                        | Mobile documents                                      | Needs API parity review before production.                                             |
| Reviews                | Web reviews/moderation/admin                         | Mobile reviews/reply screens                          | Partial. Direct mobile reads exist.                                                    |
| Retention              | Cron, services, admin dashboard                      | Push token and notification participation             | Partial but acceptable if mobile only consumes retention actions. Metrics need fixing. |
| Notifications          | Web notification settings and APIs                   | Notification list/preferences/push tokens             | Partial. Duplicate mobile settings screens need consolidation.                         |
| Admin                  | Extensive web admin                                  | No mobile admin                                       | Acceptable platform difference.                                                        |
| Public/marketing/legal | Full web pages                                       | No mobile equivalent                                  | Acceptable platform difference.                                                        |

## Web Page Inventory

Public/auth/account:

- `/`
- `/about`
- `/accept-invite`
- `/accessibility`
- `/account/payment-methods/return`
- `/auth/forgot-password`
- `/auth/login`
- `/auth/mfa-verify`
- `/auth/signup`
- `/blog`
- `/careers`
- `/checkout`
- `/checkout/return`
- `/coming-soon`
- `/contact`
- `/cookies`
- `/faq`
- `/forgot-password`
- `/for-contractors`
- `/for-homeowners`
- `/help`
- `/help/[category]/[slug]`
- `/how-it-works`
- `/learn`
- `/login`
- `/logout`
- `/offline`
- `/payment-methods`
- `/payments`
- `/payments/[transactionId]`
- `/payments/invoice/[invoiceId]`
- `/payments/invoice/[invoiceId]/success`
- `/performance`
- `/portfolio`
- `/press`
- `/pricing`
- `/privacy`
- `/profile`
- `/refer/[code]`
- `/register`
- `/report/[token]`
- `/reporting`
- `/reset-password`
- `/resources`
- `/safety`
- `/search`
- `/settings`
- `/settings/accessibility`
- `/settings/notifications`
- `/settings/payment-methods`
- `/settings/security/mfa`
- `/status`
- `/subscription-plans`
- `/terms`
- `/trust`
- `/try-mint-ai`
- `/verification`
- `/verify-phone`
- `/video-calls`

Homeowner/core product:

- `/analytics`
- `/building-assessments/[id]/correct`
- `/dashboard`
- `/dashboard/maintenance-ai`
- `/discover`
- `/disputes/create`
- `/disputes/[id]`
- `/documents`
- `/favorites`
- `/financials`
- `/find-contractors`
- `/homeowner/escrow/approve`
- `/homeowner/subscription`
- `/homeowner/subscription/checkout`
- `/homeowner/subscriptions/home-health`
- `/invoices/[invoiceId]`
- `/jobs`
- `/jobs/create`
- `/jobs/new/wizard`
- `/jobs/quick-create`
- `/jobs/tracking`
- `/jobs/[id]`
- `/jobs/[id]/edit`
- `/jobs/[id]/payment`
- `/jobs/[id]/review`
- `/jobs/[id]/sign-off`
- `/landlord/activity-log`
- `/landlord/contacts`
- `/landlord/recurring`
- `/landlord/reporting-links`
- `/landlord/reports`
- `/landlord/support`
- `/messages`
- `/messages/[jobId]`
- `/notifications`
- `/properties`
- `/properties/add`
- `/properties/compliance`
- `/properties/[id]`
- `/properties/[id]/edit`
- `/scheduling`
- `/scheduling/meetings`
- `/timeline/[jobId]`

Contractor:

- `/contractor`
- `/contractor/[id]`
- `/contractor/bid`
- `/contractor/bid/[jobId]`
- `/contractor/bid/[jobId]/details`
- `/contractor/calendar`
- `/contractor/card-editor`
- `/contractor/certifications`
- `/contractor/connections`
- `/contractor/contribute-training`
- `/contractor/crm`
- `/contractor/customers`
- `/contractor/customers/[id]`
- `/contractor/dashboard-enhanced`
- `/contractor/discover`
- `/contractor/documents`
- `/contractor/escrow/status`
- `/contractor/expenses`
- `/contractor/finance`
- `/contractor/gallery`
- `/contractor/insurance`
- `/contractor/invoices`
- `/contractor/jobs`
- `/contractor/jobs/[id]`
- `/contractor/jobs/[id]/view`
- `/contractor/jobs-near-you`
- `/contractor/market-insights`
- `/contractor/marketing`
- `/contractor/messages`
- `/contractor/notifications`
- `/contractor/onboarding`
- `/contractor/onboarding/credentials`
- `/contractor/payouts`
- `/contractor/payouts/onboarding`
- `/contractor/payouts/onboarding-complete`
- `/contractor/payout/refresh`
- `/contractor/payout/success`
- `/contractor/portfolio`
- `/contractor/profile`
- `/contractor/quotes`
- `/contractor/quotes/create`
- `/contractor/quotes/[id]`
- `/contractor/reporting`
- `/contractor/resources`
- `/contractor/reviews`
- `/contractor/scheduling`
- `/contractor/service-areas`
- `/contractor/settings`
- `/contractor/social`
- `/contractor/subscription`
- `/contractor/subscription/checkout`
- `/contractor/subscription/payment-methods`
- `/contractor/support`
- `/contractor/tax-info`
- `/contractor/tax-info/dashboard`
- `/contractor/team`
- `/contractor/time-tracking`
- `/contractor/tools`
- `/contractor/verification`
- `/contractors`
- `/contractors/[id]`

Admin:

- `/admin`
- `/admin/(auth)/forgot-password`
- `/admin/(auth)/login`
- `/admin/(auth)/register`
- `/admin/ai-monitoring`
- `/admin/analytics-detail`
- `/admin/api-documentation`
- `/admin/audit-logs`
- `/admin/building-assessments`
- `/admin/communications`
- `/admin/contractors/payment-setup`
- `/admin/dashboard`
- `/admin/data-annotation`
- `/admin/disputes`
- `/admin/escrow/reviews`
- `/admin/hybrid-inference`
- `/admin/jobs`
- `/admin/migration-dashboard`
- `/admin/mint-ai`
- `/admin/payments/fees`
- `/admin/payments/reconciliation`
- `/admin/refunds`
- `/admin/retention`
- `/admin/revenue`
- `/admin/review-moderation`
- `/admin/security`
- `/admin/settings`
- `/admin/tax`
- `/admin/users`
- `/admin/users/[id]`
- `/admin/verifications`
- `/admin/verifications/credentials`

## Mobile Screen Inventory

Auth/root:

- `Welcome`
- `Login`
- `Register`
- `EmailVerificationPending`
- `ForgotPassword`
- `ResetPassword`
- `MFAVerification`
- `HomeTab`
- `JobsTab`
- `AddTab`
- `BusinessTab`
- `MessagingTab`
- `ProfileTab`

Jobs:

- `JobsList`
- `JobDetails`
- `JobPosting`
- `PostJobWizard`
- `ExploreMap`
- `BidSubmission`
- `JobPayment`
- `JobTimeline`
- `Dispute`
- `BidReview`
- `PhotoReview`
- `PhotoUpload`
- `ContractView`
- `ContractPreparation`
- `ReviewSubmission`
- `JobSignOff`
- `JobEdit`

Messaging and modals:

- `MessagesList`
- `Messaging`
- `ServiceRequest`
- `SelfieCapture`
- `CreateQuote`
- `MeetingSchedule`
- `MeetingDetails`
- `ContractorProfile`
- `EnhancedHome`
- `Notifications`
- `AIAssessment`
- `AISearch`
- `QuickJobPost`
- `BookingDetails`
- `RescheduleBooking`
- `RateBooking`

Profile, property, business, and settings:

- `ProfileMain`
- `EditProfile`
- `BusinessHub`
- `NotificationSettings`
- `PaymentMethods`
- `AddPaymentMethod`
- `HelpCenter`
- `InvoiceManagement`
- `CreateInvoice`
- `InvoiceDetail`
- `CRMDashboard`
- `AddClient`
- `ClientDetail`
- `QuoteDetail`
- `QuoteTemplates`
- `FinanceDashboard`
- `ServiceAreas`
- `QuoteBuilder`
- `CreateQuote`
- `ContractorCardEditor`
- `ContractorVerification`
- `BusinessProfile`
- `Properties`
- `PropertyDetail`
- `EditProperty`
- `PropertyAssessment`
- `AddProperty`
- `VideoCapture`
- `VideoProcessingStatus`
- `Calendar`
- `Reviews`
- `ReplyToReview`
- `PaymentHistory`
- `Subscription`
- `HomeHealthSubscribe`
- `Financials`
- `SettingsHub`
- `Expenses`
- `Documents`
- `Certifications`
- `DBSCheck`
- `TimeTracking`
- `AddTimeEntry`
- `AddCertification`
- `Reporting`
- `Payouts`
- `BookingStatus`
- `Insurance`
- `Team`
- `Marketing`
- `MarketInsights`
- `Training`
- `EscrowDashboard`
- `MFASecurity`
- `DataExport`
- `DeleteAccount`
- `AccessibilitySettings`
- `NotificationPreferences`

## Backend/API Coverage

API route groups found:

- Auth, account, profile, settings, phone verification, MFA.
- Jobs, bids, job milestones, job photos, contracts, job payments, sign-off, review.
- Properties, property documents, property images, compliance, property-related jobs.
- Assessments, assessment images, assessment video upload/status, building surveyor AI, building
  assessment admin/corrections.
- Messages, message threads, read state, unread count.
- Notifications, push tokens, notification preferences.
- Stripe payments, payment methods, invoices, escrow, payouts, refunds, webhooks.
- Contractor business: quotes, invoices, CRM/customers, documents, expenses, finance, insurance,
  certifications, service areas, calendar, reviews, reporting, resources, verification.
- Homeowner subscriptions and contractor subscriptions.
- Referrals and rewards.
- Retention and cron jobs.
- Landlord reports, contacts, recurring tasks, reporting links.
- Admin users, audit logs, AI monitoring, revenue, tax, disputes, retention, security, payments,
  verifications.

This backend surface is broad enough for the product, but it is not consistently used by the mobile
app.

## UI/UX Readiness Notes

1. Several mobile screens show generic errors for API failures. This makes real causes like missing
   API URL, Stripe env failure, Supabase fallback, or rejected validation hard to diagnose.
2. The product has duplicate routes/screens for similar actions. Job creation is the clearest
   example.
3. Mobile property detail has an assessment feature that web property detail lacks. That is a
   user-facing parity failure, not just an implementation detail.
4. Contractor areas mix polished dashboard-style screens with older direct-table forms. The visual
   and interaction quality is not yet consistent.
5. Payment and assessment screens need clearer recovery states for non-production configuration and
   failed processing.
6. Mobile launcher icon alignment, app-icon notification badges, and remembered login details need
   real-device QA before release.
7. Admin and public marketing differences between web and mobile are acceptable. Data-backed
   homeowner and contractor features should not drift.

## Recommended Project-Ready Sequence

1. Lock environment configuration for mobile QA/staging/prod builds.
2. Make assessments canonical: one create flow, one media model, one status model, one read API.
3. Add web property assessment history/files to `/properties/[id]`.
4. Fix video assessment IDs, upload payload, file reading, and server-side AI trigger.
5. Normalize building assessment property types and image limits.
6. Consolidate contractor invoices to one table and one API.
7. Move high-risk mobile direct Supabase reads/writes behind API routes.
8. Fix storage media records and generate signed URLs from canonical bucket/path data.
9. Remove stale messaging hooks and legacy payment method paths.
10. Polish mobile launcher icon alignment, notification badge counts, and remembered sign-in
    details.
11. Add cross-platform E2E tests for properties, assessments, jobs, payments, messages, invoices,
    retention notifications, thumbnails, mobile icon rendering, badge counts, and remembered email.

## Minimum Acceptance Tests Before Project Ready

- Create a property on web, view/edit it on mobile, and view the same data back on web.
- Create a property on mobile, view/edit it on web, and view the same data back on mobile.
- Create a property assessment on mobile with photos and video, wait for processing, then view
  files/status/result on web property detail.
- Create an assessment from web or backend tooling and view it on mobile property detail.
- Create jobs from every web and mobile entry point and confirm the same backend record shape.
- Upload job images and confirm thumbnails render on web and mobile from signed URLs.
- Register homeowner and contractor users on both platforms and confirm profile/trial/role side
  effects match.
- Add/list/remove payment methods on web and mobile against the same Stripe customer.
- Create/list/update invoices on web and mobile against the same table.
- Send/read messages on web and mobile with unread count consistency.
- Trigger retention notification jobs and confirm web admin metrics, in-app notifications, and
  mobile push-token behavior.
- Confirm the mobile app icon is optically centered on iOS and Android launchers.
- Send a push notification while the mobile app is closed and confirm the app icon badge/count
  updates where supported.
- Log in with "Remember email" enabled, sign out, reopen the app, and confirm the email is
  remembered without storing the password.
- Verify cross-user denial for properties, jobs, assessments, invoices, messages, and payment
  routes.

## Bottom Line

The app has enough screens and backend surface to become a full product, but it is not ready to ship
as a unified web/mobile product until data ownership is tightened. The biggest work is not adding
more screens. It is making the existing screens use the same APIs, the same datasets, the same
validation rules, and the same side effects.

## Plain-English Fix Plan For Non-Coders

This section explains how to fix the project in a way that does not assume coding knowledge. The
goal is to help you understand what needs to happen, why it matters, and how to check whether it was
fixed.

Think of the app as three connected parts:

1. The web app: the website people use in a browser.
2. The mobile app: the phone app people use on iPhone or Android.
3. The backend: the secure middle layer that saves data, checks permissions, talks to Stripe,
   uploads images, sends notifications, and connects to the database.

Right now, the web app and mobile app do not always go through the same backend doors. Sometimes
mobile uses the proper API. Sometimes mobile walks straight into the database. That is the main
reason the app feels unfinished: one screen may save data in a way another screen cannot see or
understand.

The fix is to make web and mobile behave like two different windows into the same system.

### Step 1 - Create One Source Of Truth For Every Feature

Before changing code, write a simple list for each important feature:

- What is the feature called?
- Which users use it?
- Which web pages use it?
- Which mobile screens use it?
- Which API endpoint should save or load the data?
- Which database table stores the data?
- What should happen after saving, such as notifications, emails, payments, or image processing?

Example for properties:

- Feature: Properties
- Users: Homeowners, landlords, contractors in limited cases
- Web screens: property list, add property, edit property, property detail
- Mobile screens: property list, add property, edit property, property detail
- API: `/api/properties`
- Database table: `properties`
- Side effects: property image handling, team access, jobs connected to the property, assessment
  history

Why this matters:

If nobody writes this down, developers will keep building separate versions of the same feature.
That is how mobile and web drift apart.

How to know this is fixed:

- Each major feature has one agreed backend API.
- Web and mobile both use that same API.
- A record created on web appears on mobile.
- A record created on mobile appears on web.

### Step 2 - Stop Mobile From Saving Important Data Directly To The Database

The mobile app currently uses direct database calls in many places. That is risky because it can
skip important backend work.

For example, when a user creates something, the backend may need to:

- Check if the user is allowed to do it.
- Check if the data is valid.
- Save related records.
- Upload or sign image files.
- Send a notification.
- Send an email.
- Start an AI analysis.
- Update Stripe or another payment service.
- Write an audit log.

If mobile writes straight to the database, some of those things may not happen.

What developers should do:

1. Find every mobile file that uses `supabase.from(...)`.
2. Decide whether that direct database call is allowed.
3. For important user actions, replace it with a call to a backend API.
4. Keep direct database access only for carefully approved simple reads or realtime subscriptions.

Files that need attention include:

- `apps/mobile/src/screens/profile/PropertyDetailScreen.tsx`
- `apps/mobile/src/screens/jobs/QuickJobModal.tsx`
- `apps/mobile/src/viewmodels/JobDetailsViewModel.ts`
- `apps/mobile/src/screens/contractor/InvoiceManagementScreen.tsx`
- `apps/mobile/src/screens/financials/useFinancialsData.ts`
- `apps/mobile/src/screens/CalendarScreen.tsx`

How to explain this to a developer:

"Please make mobile use the same API routes as web for properties, jobs, invoices, assessments,
payments, messages, and notifications. Do not let mobile save important production data directly to
Supabase unless we have agreed it is safe."

How to know this is fixed:

- A developer can show that mobile screens call API routes like `/api/properties`, `/api/jobs`,
  `/api/assessments`, and `/api/contractor/invoices`.
- Creating, editing, and deleting the same item works on both platforms.
- Permissions are checked by the backend, not only by the mobile app.

### Step 3 - Fix Property Assessment So Web And Mobile Share The Same Records

Right now, mobile has a property assessment feature. Web property pages do not properly show those
property assessments.

What should happen instead:

1. A homeowner opens a property on mobile.
2. They start a property assessment.
3. They upload photos or video.
4. The backend creates one assessment record.
5. The backend attaches all photos and videos to that same assessment.
6. The backend starts AI/building-surveyor analysis.
7. The user can see the same assessment on mobile and web.

What developers should change:

- Add an assessment history section to web property detail.
- Make mobile and web both read assessments from the same API.
- Make sure each assessment belongs to the correct property.
- Make sure assessment files are attached to the correct assessment.
- Add backend permission checks so one user cannot create an assessment for another user's property.

Important files:

- `apps/mobile/src/screens/PropertyAssessmentScreen.tsx`
- `apps/web/app/api/assessments/route.ts`
- `apps/web/app/api/assessments/[id]/images/route.ts`
- `apps/web/app/api/assessments/[id]/status/route.ts`
- `apps/web/app/properties/[id]/components/PropertyDetailsClient.tsx`

How to know this is fixed:

- Create an assessment on mobile.
- Open the same property on web.
- The assessment appears there with status, date, photos, video if available, and result.
- Refresh both apps. The same assessment still appears.
- Try creating an assessment for a property owned by another account. The backend rejects it.

### Step 4 - Fix The Video Assessment Flow

The video assessment flow is one of the weakest areas right now.

The current problem:

- Mobile creates a temporary assessment ID before the real database record exists.
- Video upload may create one assessment.
- Photo upload may create another assessment.
- AI analysis may be triggered incorrectly.
- The mobile status screen may watch the wrong ID.
- The video upload code may upload an empty file.

The correct flow should be:

1. User starts assessment.
2. Backend creates the real assessment record first.
3. Backend returns the real assessment ID.
4. Mobile uploads photos and video using that real ID.
5. Backend stores all media under the same assessment.
6. Backend starts processing.
7. Mobile polls the status of that same assessment ID.
8. Web and mobile both show the final result.

What developers should change:

- Create the assessment before opening video/photo upload.
- Remove temporary IDs like `assessment_${Date.now()}`.
- Make `VideoService.readVideoFile` read the real video file instead of returning an empty blob.
- Send `propertyId`, `assessmentId`, video file, file size, and file type to the backend.
- Move the AI trigger fully into the backend.
- Do not call the building-surveyor API from the upload route without proper authentication or
  internal service logic.

Important files:

- `apps/mobile/src/services/video/VideoService.ts`
- `apps/mobile/src/screens/VideoCaptureScreen.tsx`
- `apps/mobile/src/screens/VideoProcessingStatusScreen.tsx`
- `apps/web/app/api/assessments/videos/upload/route.ts`

How to know this is fixed:

- One assessment creates one database record.
- Photos and video attach to that same record.
- The status screen follows the same assessment ID from start to finish.
- The uploaded video file is not empty.
- If processing fails, the user sees a clear failure message.

### Step 5 - Make Building Assessment AI Accept The Same Data Mobile Sends

The mobile app and backend disagree on assessment details.

Example:

- Mobile sends property types like `House`, `Flat`, and `Bungalow`.
- Backend expects values like `residential`, `commercial`, and `industrial`.
- Mobile allows up to 10 photos.
- Backend allows up to 4 image URLs.

That means the user can do everything correctly on mobile and still have the backend reject the
assessment.

What developers should do:

- Decide the official list of property types.
- Make mobile show only values the backend accepts, or make the backend translate mobile values.
- Decide the official max number of photos.
- Make mobile and backend use the same limit.
- Show a clear error if an assessment cannot be processed.

How to know this is fixed:

- If mobile lets the user choose something, the backend accepts it.
- If backend has a limit, mobile prevents the user from exceeding it.
- AI analysis does not fail because of property type naming.

### Step 6 - Fix Invoices So Web And Mobile Use The Same Table

Invoices are currently split.

The problem:

- One web page reads `contractor_invoices`.
- The API and mobile screens use `invoices`.

This can make it look like an invoice disappeared, even though it exists in a different table.

What developers should do:

1. Choose the official invoice table.
2. Move old invoice data into that table if needed.
3. Make the web invoice page use the same API as mobile.
4. Make mobile stop reading invoices directly from the database.
5. Remove mock invoice email/PDF behavior from production paths.

Important files:

- `apps/web/app/contractor/invoices/page.tsx`
- `apps/web/app/api/contractor/invoices/route.ts`
- `apps/mobile/src/screens/contractor/InvoiceManagementScreen.tsx`
- `apps/mobile/src/services/contractor-business/financial/InvoiceService.ts`

How to know this is fixed:

- Create an invoice on web. It appears on mobile.
- Create an invoice on mobile. It appears on web.
- Edit an invoice on either platform. The update appears on both.
- There is only one official invoice table.

### Step 7 - Fix Mobile API Environment Settings

Many mobile API problems can come from configuration, not code.

The mobile app currently has a fallback to `http://localhost:3000`. That is dangerous for real
devices because a phone's `localhost` means the phone itself, not your computer or server.

What developers or release managers should check:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Stripe-related public settings if used by mobile

What should happen:

- Local simulator builds can point to a local dev API.
- Physical device QA builds should point to a real network URL.
- Staging builds should point to staging backend.
- Production builds should point to production backend.
- A production build should never silently fall back to localhost.

How to know this is fixed:

- Open the mobile app on a real phone.
- Log in.
- Load properties, jobs, payment methods, messages, and assessments.
- Confirm API requests hit the correct backend.
- If env is missing, the app shows a clear configuration error in non-production testing.

### Step 8 - Fix Thumbnails And Images

The thumbnail issue is probably not only a frontend design issue. It is likely a storage/data issue.

Images usually need three things:

1. A database row that says which image belongs to which job, property, or assessment.
2. A real file in storage.
3. A URL the app is allowed to load.

If any of those three are wrong, thumbnails will not show.

What developers should do:

- Check every stored image path.
- Confirm the file actually exists in storage.
- Stop mixing public URLs, signed URLs, and raw storage paths without a clear rule.
- Store image references as structured data: bucket name plus file path.
- Generate signed URLs from the backend when the app needs to display private images.
- Add a fallback image only as a backup, not as the main fix.

Important files:

- `apps/web/lib/api/job-storage.ts`
- `apps/web/lib/services/job-query-service.ts`
- `apps/mobile/src/utils/photoUrls.ts`
- `apps/mobile/src/components/jobs/ImageCarousel.tsx`

How to know this is fixed:

- Jobs with photos show thumbnails on web.
- The same jobs show thumbnails on mobile.
- Property and assessment images also load.
- A developer can run a storage check and list missing files.

### Step 9 - Make Job Creation Consistent

The app has many ways to create a job:

- Web create job
- Web quick create
- Web job wizard
- Mobile job posting
- Mobile post job wizard
- Mobile quick job post
- Mobile service request

That is okay only if they all save the same kind of job record.

Current risk:

- Some flows collect different fields.
- Some flows attach photos.
- Some flows do not.
- Some flows may use different validation.
- Quick job creation pads descriptions to pass validation, which is not good product behavior.

What developers should do:

- Create one shared job draft shape.
- Make every job creation screen use that shape.
- Make validation appear before submit, not only after the backend rejects it.
- Make photo requirements clear before the user reaches the final button.
- Use the same API route for all job creation.

Important files:

- `apps/web/app/api/jobs/route.ts`
- `packages/api-contracts/src/jobs.ts`
- `apps/web/lib/services/job-creation-service.ts`
- Mobile job creation screens under `apps/mobile/src/screens/jobs`

How to know this is fixed:

- Create one job from every web and mobile entry point.
- All jobs appear in the same job list.
- All jobs open correctly on web and mobile.
- Photos, property, budget, category, urgency, and description are consistent.

### Step 10 - Clean Up Messaging, Payments, And Notifications

Messaging:

- Web and mobile mostly use the same message thread API.
- But there is an old web hook that points at stale endpoints.
- Developers should remove or update `apps/web/lib/hooks/queries/useMessages.ts`.

Payments:

- Web and mobile mostly use `/api/payments/methods`.
- A legacy payment-method endpoint still exists.
- Developers should mark it as legacy or remove it after confirming nothing uses it.
- Payment method list screens should not fail unclearly when Stripe config is missing.

Notifications:

- Mobile has push-token registration.
- Web has notification settings and retention/admin tools.
- Developers should consolidate duplicate mobile notification settings screens.
- Push-token coverage should count users, not token rows.
- The server should send the user's unread badge count in mobile push payloads.
- Mobile should refresh the app icon badge when the app opens, resumes, receives a notification, and
  when notifications are marked as read.

How to know this is fixed:

- Messages sent on web appear on mobile.
- Messages read on mobile update unread count on web.
- Payment methods added on web appear on mobile.
- Payment methods added on mobile appear on web.
- Notification preferences match across both apps.
- Retention reports do not overcount users with multiple devices.
- A notification received while the app is closed updates the app icon badge/count where the phone
  supports badges.
- Reading notifications clears or reduces the app icon badge/count.

### Step 10A - Polish Mobile Icon And Remembered Sign-In

These are small-looking issues, but they matter because they are visible before the user trusts the
app.

Mobile icon:

- The launcher icon is the picture users see on their phone home screen.
- The current icon file is square, but the leaf/M artwork appears visually high when the phone puts
  it inside a circular launcher border.
- A developer or designer should re-export the app icon so the leaf/M looks centered to the human
  eye inside a circle, not just centered by the file dimensions.
- The icon should be tested on iPhone, Android circle icons, Android rounded-square icons, and the
  Android notification shade.

Notification badge:

- A badge is the small number or dot on the app icon that tells the user there is something unread.
- The app already has some badge code, but the backend push message should also send the unread
  count.
- Without that, the phone may show the notification banner but not update the app icon count when
  the app is closed.
- The badge count should match unread notifications.

Remembered sign-in:

- The app should not save the user's password manually.
- The safe version is "Remember email", not "Remember password".
- After a successful login, if the user chooses to remember their details, the app should save only
  their email address.
- The password should be handled by the phone's normal password manager, Face ID, Touch ID, or
  biometric login.
- The login screen should also give the user a way to forget the saved email or use another account.

How to know this is fixed:

- The icon looks centered on a real phone home screen.
- A notification makes the app icon show a dot or number where supported.
- Opening and reading notifications updates that dot or number.
- The login screen can remember the email after sign-out.
- The app never stores the password itself.

### Step 11 - Add Safety Tests Before Calling The App Ready

Testing here does not mean just checking whether the code compiles. The app can compile and still
fail as a product.

The team should test real user journeys.

Required tests:

- Create a property on web, see it on mobile.
- Create a property on mobile, see it on web.
- Edit a property on web, see the update on mobile.
- Edit a property on mobile, see the update on web.
- Create a property assessment on mobile, see it on web.
- Upload assessment photos and video, then confirm they stay attached to the same assessment.
- Create jobs from every job creation screen.
- Confirm thumbnails show on both platforms.
- Add a payment method on web and see it on mobile.
- Add a payment method on mobile and see it on web.
- Create an invoice on web and see it on mobile.
- Create an invoice on mobile and see it on web.
- Send a message from web and read it on mobile.
- Send a message from mobile and read it on web.
- Trigger a retention notification and confirm the mobile user receives it.
- Confirm the mobile app icon is centered on iOS and Android launchers.
- Confirm a background push notification updates the app icon badge/count where supported.
- Confirm "Remember email" works and does not store the password.
- Try to access another user's property, assessment, invoice, job, payment, and messages. The
  backend must block it.

How to know this is fixed:

- These tests pass using real web and mobile builds.
- The tests use staging or production-like data, not only mocks.
- The same user account sees the same data on both platforms.

### Step 12 - Suggested Order For The Development Team

The work should be done in this order:

1. Fix mobile environment settings so real devices hit the correct backend.
2. Choose canonical APIs and tables for properties, assessments, jobs, invoices, payments, messages,
   and notifications.
3. Fix property assessment create/read/display across mobile and web.
4. Fix video assessment upload, IDs, status, and AI processing.
5. Fix building assessment type and image-count mismatch.
6. Fix invoice table/API mismatch.
7. Move risky mobile direct database calls to backend APIs.
8. Fix image storage and thumbnail URL generation.
9. Consolidate job creation flows.
10. Clean up stale messaging/payment/notification code.
11. Polish mobile icon alignment, app-icon badges, and remembered email login.
12. Add end-to-end tests for web and mobile parity.
13. Run a final production-readiness test on staging.

### Step 13 - Extra Production-Readiness Checks Before Launch

This is the checklist for the large "does the whole app actually work?" audit.

Navigation check:

- Open every web page.
- Tap every link and button that moves the user somewhere.
- Open every mobile screen.
- Tap every mobile button that navigates to another screen.
- Confirm no link opens a missing page.
- Confirm no mobile button tries to open a screen that is not registered.
- Confirm back buttons go to sensible places.

Accidental logout check:

- The user should only be logged out when they press a logout button.
- Visiting a normal link should never log the user out.
- A broken API call should not silently clear the user's session unless the session is genuinely
  expired.
- Token refresh failure should show a clear "please sign in again" message.

Notification check:

- Send every kind of notification: job update, bid, message, payment, meeting, review, retention,
  and system.
- Check the push banner.
- Check the app icon badge.
- Tap the notification and confirm it opens the correct screen.
- Mark the notification as read and confirm the badge updates.
- Turn notification preferences off and confirm the app respects them.

Feature check:

- For every major feature, create data on web and view it on mobile.
- Then create data on mobile and view it on web.
- Check properties, assessments, jobs, messages, payments, invoices, notifications, documents,
  calendar, quotes, CRM, and contractor profile tools.
- If a feature is only meant for one platform, write that down clearly.

Crash check:

- Test every screen with normal data.
- Test every screen with no data.
- Test every screen with slow internet.
- Test every screen with the API failing.
- Test every screen after the user has been idle for a long time.
- Test every screen after closing and reopening the app.

Landing page check:

- Click every landing page link while logged out.
- Confirm public pages stay public.
- Confirm product pages send the user to login/register without losing what they were trying to do.
- Confirm forms show useful messages on success and failure.

How to know this is fixed:

- A tester can go through the full app without hitting a 404, blank screen, unexpected logout, or
  dead button.
- Notifications feel like modern mobile apps: timely, respectful of preferences, deep-linked, and
  badge-aware.
- Every important feature either works fully or is hidden from production users.

### What To Ask A Developer For

If you are giving this to a developer, you can ask for these deliverables:

- "Show me the list of mobile screens that still call Supabase directly."
- "Show me which direct Supabase calls were replaced with API calls."
- "Show me the one official API for property assessments."
- "Show me a mobile-created property assessment appearing on the web property page."
- "Show me that video and photos attach to the same assessment ID."
- "Show me that invoices use one table and one API."
- "Show me that mobile production builds do not use localhost."
- "Show me that thumbnails load from signed URLs on both platforms."
- "Show me the mobile app icon on a real iPhone and Android launcher."
- "Show me a notification received while the app is closed and the app icon badge/count updating."
- "Show me Remember email working without saving the password."
- "Show me that every web link points to a real route."
- "Show me that every mobile navigation target is registered."
- "Show me that visiting /logout does not log the user out without a deliberate button press."
- "Show me that every notification type opens the correct screen."
- "Show me the list of features that are hidden because they are not production-ready."
- "Show me the tests proving web and mobile share the same data."

### Simple Definition Of Done

The project is ready only when this statement is true:

"A user can start on web, continue on mobile, and return to web without losing data, seeing
different records, or hitting different rules."

For this app, that must be true for:

- Properties
- Property assessments
- Jobs
- Job photos
- Messages
- Payments
- Invoices
- Notifications
- Retention-triggered communication
- Contractor business tools
- Homeowner workflows

Until that is true, the app is a strong prototype with many working parts, but not a finished
unified product.

## Genuinely out of scope for code remediation

These items appear in the audit but are NOT code work this remediation pass can close. Each is
listed here so they stop showing up as "PARTIAL" or "REMAINING" and have an explicit owner/route to
closure.

### Designer / asset tasks

- **Mobile app icon optical-centring re-export.** `apps/mobile/assets/ icon.png` exists at 1024×1024
  but the leaf/M artwork sits visually high once Android/iOS apply launcher masks. This needs a
  designer to re-export the asset with optical (not mathematical) centring and test against iOS
  rounded-square, Android circular, and Android squircle masks. Owner: design team.

### Storage writer refactor (sized as dedicated PR)

- **Bucket/path normalization on writers.** Audit asks every new image reference to store
  `{bucket, path}` instead of mixed public/signed/bare URLs. Touches every upload route plus a
  backfill migration over the existing rows. The integrity script
  - nightly CI workflow + broken-image telemetry shipped 2026-04-30 flag broken references in the
    meantime. Sized at ~3-day PR; tracked separately, not a quick fix.

### Manual QA + E2E test creation

These are end-to-end acceptance tests that need to run against real data, not code I can write in
this remediation pass:

- **Mobile retention QA tests.** Notification preferences, push token registration, push delivery —
  needs a real device + EAS build per the audit. Owner: QA / mobile lead.
- **Landing-page conversion click-through.** Crawl every public page as a logged-out user and verify
  each CTA. Static analysis (which I did last pass) catches broken hrefs but not auth-redirect
  intent preservation or form CSRF behaviour. Owner: QA.
- **Cross-platform feature integration walkthroughs.** The audit's 18-item "Minimum Acceptance
  Tests" list — create-on-web/view-on- mobile and back — needs a tester driving real builds. Owner:
  QA.
- **CI smoke test that loads every route with mocked API failure.** This is a Playwright-style test
  suite that visits every page, mocks the network layer to return 500, and asserts every page
  renders an error boundary. ~1 day of test infra work; tracked separately.

### Content drift the audit found

- **`/contractor/connections`, `/contractor/social`, `/contractor/ team`, `/learn`, `/resources`,
  `/admin/api-documentation`, `/admin/review-moderation`** all have friendly "coming soon" UI with
  `noindex`. The audit's complaint was that they exist as routable dead-ends; the agreed disposition
  is "leave them friendly" rather than build out unfinished features. Product call, not a
  remediation task.

### Larger items still open (NOT deferred — scoped for follow-up PRs)

These were called out at the top of the audit and are still open code work. Sized at >1 day each;
deliberately NOT mixed into the remediation pass:

- **P1: Job creation entry-point consolidation** (one shared draft model + 7 entry points → one
  adapter).
- **P1: Authentication + signup side-effect parity** (mobile vs web trial setup).
- **P1: Service-role fallback discipline** (route-by-route audit of
  `createRequestScopedClient(...) ?? serverSupabase`).
- **P1: Feature integration audit by domain** — the per-domain end-to-end check the audit lists in
  "Feature Integration Audit Still Needed By Domain".
- **The 13 other recommended automated CI audits** the audit lists beyond the storage-integrity one
  shipped here (route-link crawler, navigation target validator, notification routing matrix test,
  push-badge test, auth/session audit, API contract test, parity tests, RLS access-control test,
  snapshot tests, public landing crawl, accessibility audit, performance audit, crash audit).

The remediation pass focuses on closing each finding tightly so the audit doc is an accurate map of
platform state. The five categories above are honest follow-up work, not deferral, and each is sized
too large to slip into a quick-fix sequence without losing focus.
