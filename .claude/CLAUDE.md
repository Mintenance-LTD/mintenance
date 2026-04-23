# CLAUDE MANDATORY DEVELOPMENT CONTRACT (MDC) - MINTENANCE CODEBASE

## CODE QUALITY AUDIT (Last audited: 2026-04-23, live-DB verified via Supabase MCP)

**Current State: B / B- Grade (~75/100)** — unchanged from 04-16. Security baseline strong after the
7-sprint remediation, but three production-critical data anomalies persist and doc drift keeps
widening.

**2026-04-23 audit scope:** Full-stack re-inventory — every page + route + screen + package + live
DB via Supabase MCP on project `ukrjudtlvapiajkjbcrd` (331 public tables, 835 RLS policies, 174
migrations, 0 zero-policy tables). Compared against CLAUDE.md + 16 prior memory files to surface
drift.

**2026-04-16 audit scope (prior):** Feature-parity matrix (web↔mobile, 11 lifecycle phases), shared
API + DB wiring, notification delivery across 10 canonical events, contractor-tracking end-to-end.

Prior audit + remediation details in [docs/AUDIT_2026_04_13.md](../docs/AUDIT_2026_04_13.md) and the
plan file `C:\Users\Djodjo.Nkouka.ERICCOLE\.claude\plans\purring-jumping-raccoon.md`.

### Audit remediation summary (2026-04-13)

Seven-sprint branch `fix/mobile-audit-security-ux-features` closed:

- **8 P0 findings** (7 fixed, 1 ecosystem-blocked — PostGIS schema ownership)
- **~36 P1 findings** out of 41 (5 deferred with runbooks: PostGIS schema move, Job type
  consolidation, mobile TLS cert pinning, migration drift pull, web Sentry)
- **Sprint 0**: CI unblock + 4-tier severity atomic commit + 8 DB migrations pushed
- **Sprint 1**: DB-P0-1 (8 zero-policy tables) closed; DB-P0-3 documented as blocked
- **Sprint 2**: LFC-P0-1 (homeowner approval explicit gate) + LFC-P1-1 (escrow payee lock)
- **Sprint 3**: WFE-P0-1/2, WBE-P1-1/2, dashboard/bid null-safety, XC-P0-1 resolved
- **Sprint 4**: Mobile hardening — silent catches, photo retry, biometric verify, i18n
- **Sprint 5**: Idempotency fail-closed, webhook rate limit, dispute freeze, MFA audit logs, AI cost
  caps, prompt injection guard, Stripe Connect verified
- **Sprint 6**: Storage bucket policies, security types narrowed, api-client service-role guard,
  building-surveyor route partial split

### Verified Metrics (measured live 2026-04-23):

- **Web pages: 195** (Next.js App Router, under `apps/web/app/` excluding `/api`). 66/195 have
  `loading.tsx`, 64/195 have `error.tsx`. Largest page: `contractor/[id]/page.tsx` 671 lines.
- **Web API routes: 405** (`apps/web/app/api/**/route.ts`). **374/405 (92.3%)** wrapped in
  `withApiHandler`. 4 legitimate raw exceptions (stripe webhook raw body, email unsubscribe GDPR
  token, contract/reviews re-export aliases). 28 cron routes use `withCronHandler`.
- **Mobile .tsx files: 250** (~150-170 actual reachable screens; rest are nested components/modals).
  15 screens >500 lines. 135 services, 5 services >500 lines (VideoService 677, SyncManager 640,
  AuthService 617, RealtimeService 593, BusinessAnalyticsService 576).
- **Packages: 10, Apps: 4** (web, mobile, demo-video, sam2-video-service, sam3-service — CLAUDE.md
  previously claimed 5). All packages TypeScript strict ON.
- **`any` types in source**: ~0 in web pages (all in test mocks), **~169 in mobile** (concentrated
  in services + tests). CLAUDE.md previously claimed "~26" — accurate for web, undercount for
  mobile.
- **`console.*` in app code: 1 web** (`admin/retention/error.tsx:14`), **~76 mobile** (most in
  dev/util scaffolding). Previous "~27 total" claim was optimistic.
- **Largest web file: 704 lines** (`apps/web/lib/services/subscriptions/SubscriptionService.ts`).
  AssessmentOrchestrator is now **652 lines** (down from 905). 0 files >1,000 lines confirmed.
- **Build: PASSES clean** (Next.js production build, `ignoreBuildErrors: false`).
- **Hex color literals: 625+ across 117 web files** — pre-commit hook enforces incrementally, legacy
  hex bleeds through design-tokens adoption.
- **TypeScript strict mode: ON** in all packages + both apps.
- **Web tests: ~178/183 suites PASS (~97%)** — Vitest v4. **Mobile tests: 9,743/10,393 (93.8%)**.
- **Security: live 2026-04-23: 331 public tables, 330 RLS-enabled (99.7%), 835 RLS policies, 0
  zero-policy tables** (Sprint 1 fix holds). Only `spatial_ref_sys` lacks RLS (ecosystem-blocked).
  **174 migrations applied** (latest `20260422000002_onboarding_analytics_split`; local folder
  matches live count). Production data scale: 22 jobs, 16 bids, 15 contracts, 4 escrow, 75
  notifications, 69 messages, 10 profiles, 479 building_assessments. **Still 0 `user_push_tokens`, 0
  `contractor_locations`, 0 `vlm_shadow_comparisons`** — these three production flows have never
  fired despite multiple rounds of fixes.
- **Supabase imports: 0 direct `createClient` in source** — canonical `@/lib/api/supabaseServer`
  verified adopted everywhere. Previous "10 files" issue closed.
- **Storage buckets**: 5 public (avatars, contractor-portfolio, profile-images, training-images,
  mint-ai-training-public — all intentional), 6 private (contractor-documents, job-attachments,
  Job-storage, training-data, yolo-models, models_best_model_final_v2_v2.0). ✅ contractor-documents
  - job-attachments flipped private 2026-04-17.
- **Edge functions: 2 active** — setup-contractor-payout (verify_jwt:false, intentional dual-mode),
  test-payout (verify_jwt:true, neutralized). Both verified safe.

### What Changed Since Feb 13 Audit:

| Metric                  | Feb 13 State                             | 04-23 Actual                           | Trend                                |
| ----------------------- | ---------------------------------------- | -------------------------------------- | ------------------------------------ |
| Files >1,000 lines      | **17**                                   | **0**                                  | ✅ All split                         |
| Largest file            | **1,413 lines** (NotificationService.ts) | **704 lines** (SubscriptionService.ts) | ✅ Improved                          |
| withApiHandler routes   | **2/249 (< 1%)**                         | **374/405 (92.3%)**                    | ✅ Effectively complete              |
| Total routes            | 249                                      | **405** (+95 in 10 weeks)              | Growth real                          |
| Total pages             | —                                        | **195**                                | +14 since 04-16 claim                |
| Migrations              | —                                        | **174**                                | +28 since 04-16                      |
| RLS policies            | —                                        | **835**                                | +16 since 04-16                      |
| `any` types (web)       | 56                                       | **~0 in pages, ~169 in mobile**        | Mixed (web fixed, mobile leaky)      |
| `console.*` in app code | 42                                       | **1 web, ~76 mobile**                  | Mobile regressed or was undercounted |
| Supabase imports        | claimed "all standardized"               | **0 direct createClient** (resolved)   | ✅                                   |
| Web test pass rate      | —                                        | **~178/183 (~97%)**                    | Stable                               |

### What Changed in Feb 26 Session (this session):

| Task                         | Before          | After                                                                        |
| ---------------------------- | --------------- | ---------------------------------------------------------------------------- |
| OfflineManager.ts            | **1,090 lines** | **300-line facade** + 5 modules in `offline/` subdir                         |
| SustainabilityEngine.ts      | **945 lines**   | **43-line facade** + 5 modules in `sustainability/` subdir                   |
| ResourceManagementService.ts | **978 lines**   | **35-line facade** + 5 modules in `resource-management/` subdir              |
| payment-flow test failures   | **3 failing**   | **0 failing** (fixed rate limit body, contracts mock, stripe.customers.list) |
| auth-flow test failures      | **11 failing**  | **0 failing** (fixed fetch mock, password selector, text assertions)         |

### Real Priority Issues (as of 2026-04-23 audit):

1. ~~**HIGH**: 10 files using non-standard direct `createClient`~~ — **RESOLVED** (Sprint 3.6 /
   XC-P0-1). 2026-04-23 rescan confirms 0 direct `createClient` in source.
2. **P0 (new 04-23)**: 3 admin mutation routes missing MFA step-up —
   `/api/admin/maintenance/rotate-totp-secrets`, `/api/admin/migrations/apply`,
   `/api/admin/migrations/apply-combined`. A compromised admin session = total system compromise.
   Add `requireMfaVerifiedWithinMinutes: 15` to each.
3. **P0 (persistent)**: `user_push_tokens = 0` in prod despite 04-17 endpoint fix + 04-21 fail-loud
   Sentry wiring. Mobile push registration call chain still not completing on app launch. Needs
   traced end-to-end from `initializePushNotifications()` → `savePushToken()` call site.
4. **P0 (persistent)**: `contractor_locations = 0` in prod despite 04-16 SELECT-scope fix + 04-17
   BackgroundLocationTask wiring. Foreground tracking isn't being triggered on contractor accept.
5. **P1**: Reviews RLS — `reviews_select_policy` has `qual=true, roles={public}` (all reviews
   visible to anonymous users). Likely intentional for marketplace trust, but verify explicitly.
6. **P1**: Mobile `NotificationPushSender.sendPushNotification()` is a no-op stub (04-22 security
   fix removed client-side cross-user send). Server-side replacement not yet built —
   client-triggered CTA notifications silently drop.
7. **P1**: 5 files uncommitted in working tree from the 04-19 Mint AI session —
   `AssessmentGenerator.ts` lost its `frequency_penalty: 0.5` patch, production repetition risk when
   Mint AI goes out of shadow mode. Also `PropertyAssessmentScreen.tsx`, `AIAssessmentScreen.tsx`,
   `yolo-class-names.ts`, `upload-yolo-to-storage.ts`.
8. **P1**: 10+ "Coming soon" pages are routable dead-ends on web (contractor/connections, resources,
   social, team, video-calls, learn, admin/review-moderation, admin/api-documentation). Gate or
   redirect.
9. **P1**: Vector extension still in `public` schema — migration
   `20260419000004_move_vector_to_extensions` prepared but unapplied. Needs Postgres patch upgrade
   first.
10. **P1**: Postgres 17.4.1.074 patch upgrade pending (~5 min window via dashboard).
11. **P2**: Split remaining large files (web: SubscriptionService 704, ContinuousLearningService
    687, PredictiveAgent 669, LocationPricingService 667, AssessmentOrchestrator 652; mobile:
    DocumentsScreen 694, AISearchScreen 692, ExpensesScreen 679, VideoService 677).
12. **P2**: 625+ inline hex colors across 117 web files bypass the design-tokens system. Incremental
    pre-commit hook only catches new additions.
13. **P2**: Duplicate auth routes (`/auth/login` + `/login`, etc.) and dual payment-method flows
    (`AddPaymentMethodScreen` + `AddPaymentMethodV2Screen`) — consolidate.
14. **P2**: Only 1 Zod schema uses `.strict()` (`updateProfileSchema`); CLAUDE.md previously
    claimed 2. Silent mass-assignment risk elsewhere, partially mitigated by withApiHandler body
    validation.
15. **P2**: `sanitize-postgrest.ts` helper exists but 0 callers — 15 `.ilike()`/`.or()` routes
    inline ad-hoc regex sanitization instead. Either adopt the helper or delete it.
16. **P2**: 8 auth routes use raw `x-forwarded-for` in logging (not enforcement). Replace with
    `getClientIp()` for consistency.
17. **P2**: 6 orphan mobile screens unclear reachability (HelpCenter, ServiceRequest, ServiceAreas,
    PerformanceDashboard, MeetingDetails, PropertyAssessment) — wire into nav or delete.
18. **P2**: No `turbo.json` — CI build uses manual npm workspace ordering, no caching.
19. **P3 (deferred)**: PostGIS schema move (Option A accepted — functions patched, extension stays
    in `public`), mobile TLS cert pinning (runbook in `docs/MOBILE_CERT_PINNING_RUNBOOK.md`),
    SQLCipher for `mintenance_local.db`, CSP nonce rollout (scaffold ready behind `ENABLE_CSP_NONCE`
    flag), Sentry `beforeSend` scrub on mobile, Job type snake_case/camelCase consolidation
    (PKG-P1-4).

### 2026-04-23 — Full-Stack Re-Audit (live-DB + every page/route/screen)

**Scope:** Inventory of every page (195), API route (405), mobile screen (250 .tsx files), package
(10), and comparison against live Supabase (331 tables, 835 policies, 174 migrations). Focus on
drift detection vs prior CLAUDE.md claims.

**Live DB deltas since 04-16:**

- Tables: 324 → **331** (+7)
- RLS policies: 819 → **835** (+16)
- Migrations: 154 → **174** (+20)
- Local migration folder matches live DB ✅
- Zero-policy tables: still **0** ✅

**Still-broken production chains (persistent across 3+ audit cycles):**

1. **`user_push_tokens = 0`** — mobile push token registration still never fires in prod despite
   04-17 endpoint fix, 04-21 Sentry fail-loud wiring. `initializePushNotifications()` +
   `savePushToken()` exist but call chain from app-launch post-login is incomplete.
2. **`contractor_locations = 0`** — live tracking still never fires despite 04-16 SELECT-scope fix
   and 04-17 BackgroundLocationTask wiring. Foreground `JobContextLocationService.start()` isn't
   being triggered on contractor job accept.
3. **`vlm_shadow_comparisons = 0`** — Mint AI shadow mode gated off (`VLM_ROUTING_MODE=shadow_only`
   but `USE_MINT_AI_VLM=false`). Intentional until env flip.

**New P0 findings (not in prior audits):**

1. **Admin MFA gaps**: `/api/admin/maintenance/rotate-totp-secrets`, `/api/admin/migrations/apply`,
   `/api/admin/migrations/apply-combined` — all wrapped in `withApiHandler` with `roles: ['admin']`
   but no `requireMfaVerifiedWithinMinutes`. Rotating TOTP secrets or executing arbitrary SQL
   without step-up is high-impact. Also applies to `/api/admin/synthetic-data/generate`.
2. **Uncommitted Mint AI session work** — 5 files in working tree from 2026-04-19 session
   (`AssessmentGenerator.ts`, `yolo-class-names.ts`, `upload-yolo-to-storage.ts`,
   `PropertyAssessmentScreen.tsx`, `AIAssessmentScreen.tsx`). `AssessmentGenerator.ts` lost its
   `frequency_penalty: 0.5` patch — production repetition loop risk once Mint AI routes traffic.

**New P1 findings:**

3. **`reviews_select_policy` is `qual=true, roles={public}`** — all reviews publicly readable by
   anonymous users. Likely intentional for marketplace trust but should be explicitly confirmed.
4. **`sanitize-postgrest.ts` helper exists but 0 callers** — 15 `.ilike()`/`.or()` routes inline
   ad-hoc regex instead.
5. **Mobile `sendPushNotification()` is a no-op stub** after 04-22 cross-user phishing fix. No
   server-side replacement built — client-triggered CTA notifications silently drop.
6. **10+ "Coming soon" dead-end pages** on web (contractor/connections, resources, social, team,
   video-calls, learn, admin/review-moderation, admin/api-documentation). Routable but
   non-functional.
7. **8 auth routes use raw `x-forwarded-for` in logging** (not rate-limit enforcement) — consistency
   issue, replace with `getClientIp()`.

**Drift corrections from prior CLAUDE.md state:**

| CLAUDE.md claim        | 04-23 reality                  | Delta                                        |
| ---------------------- | ------------------------------ | -------------------------------------------- |
| 181 web pages          | **195**                        | +14                                          |
| ~310 API routes        | **405**                        | +95                                          |
| withApiHandler 93.5%   | **92.3%** (374/405)            | Still strong                                 |
| 154 migrations         | **174**                        | +20                                          |
| 324 tables / 819 RLS   | **331 / 835**                  | +7 / +16                                     |
| 157 mobile screens     | **~150-170 reachable**         | Inflated count valid if counting nested .tsx |
| Largest file 905 lines | **704** SubscriptionService.ts | AssessmentOrchestrator down to 652           |
| ~26 any types          | **~0 web, ~169 mobile**        | Mobile underreported                         |
| ~27 console.\*         | **1 web, ~76 mobile**          | Mobile underreported                         |
| 9 onboarding gates     | **10** (+AlwaysLocation 04-22) | +1                                           |
| 2 Zod `.strict()`      | **1**                          | Over-reported                                |
| 10 direct createClient | **0**                          | Resolved                                     |
| 5 apps                 | **4**                          | Over-reported                                |

**Resolved since 04-16 (no longer in priority list):**

- ✅ `contractor_locations.SELECT` RLS scoped (migration `20260416223651`)
- ✅ `contractor-documents` + `job-attachments` buckets flipped private (migration `20260416223952`)
- ✅ `user_notification_preferences` table created (migration `20260417000616`)
- ✅ Notification `data` column bug in `bid-acceptance` + `refunds/[id]` (fixed in
  NotificationService)
- ✅ Public bucket broad-listing on avatars/portfolio/profile-images (migration `20260417001856`)
- ✅ Web `BeforeAfterSlider` added to homeowner approval flow
- ✅ Web + mobile notification inbox Realtime subscriptions wired
- ✅ Mobile `BackgroundLocationTask` side-effect imported in `App.tsx`
- ✅ 7 security PRs shipped 04-22 (XFF spoof, CSRF timing-safe, JWT algo pin, logger redaction
  expanded, Zod `.strict()` on updateProfile, CSP nonce scaffold, ML-ops tables admin-only,
  training-images bucket scoped, Android `allowBackup=false`, chunked SecureStore, screen-capture
  guards on 8 auth/payment screens)
- ✅ Mint AI v2 deployed to Modal — 78% damageType accuracy, 98% pipe_leak, shadow mode wired
- ✅ Mobile HIBP parity via `/api/auth/check-password-breach` endpoint

### 2026-04-17 — Audit Remediation Sprint (16-item run)

Worked items 1–16 from the 2026-04-16 audit in a single sprint. Verified against live DB (project
`ukrjudtlvapiajkjbcrd`).

**Migrations applied live (4):**

- `contractor_locations_select_scope` — scoped SELECT to contractor-own OR homeowner-of-active-job
  via EXISTS on jobs
- `private_doc_buckets` — `contractor-documents` + `job-attachments` flipped `public=false`; 4 web
  caller files swapped from `getPublicUrl` to `createSignedUrl`
- `user_notification_preferences` — table + RLS (select/insert/update own, service_role full) +
  updated_at trigger
- `tighten_public_bucket_listing` — dropped three "Anyone can view …" broad-SELECT policies on
  storage.objects (avatars, contractor-portfolio, profile-images). Public URL access still works via
  CDN; listing via SDK now blocked

**Application-code fixes:**

- `NotificationService.ts` had a latent bug: inserted to non-existent `data` column on
  `notifications`. Corrected to `metadata`; also moved `action_url` to its top-level column. Events
  3 (bid_accepted) and 9 (escrow_released) refactored to use the service instead of direct DB insert
- Mobile `savePushToken` was hitting the wrong endpoint with the wrong payload
  (`/api/notifications` + `{action, user_id}` instead of `/api/user/push-token`
  - `{pushToken, platform}`). Root-cause fix for 0-row `user_push_tokens`
- `EscrowAutoReleaseService.releaseEscrow` now fires `escrow_auto_released` notifications to both
  parties (was silent)
- Mobile `HomeownerDashboard` got a "Post a New Job" CTA in the hero (the screens existed but had no
  entry point)
- Web homeowner approval flow got a `BeforeAfterSlider` (web port of the mobile component) above the
  existing photo grids
- Web + mobile notification inboxes now subscribe to Supabase Realtime on `notifications` — live
  updates, no refresh needed
- Mobile contractor tracking gained a TaskManager-backed background location channel at
  `apps/mobile/src/services/BackgroundLocationTask.ts`, wired into
  `JobContextLocationService.start/stop` and side-effect-imported from `App.tsx` so cold-start
  resumes work

**Audit false-alarm downgrades:**

- `setup-contractor-payout` edge function: `verify_jwt: false` is intentional (dual-mode: web API
  route calls with service-role key + verified `user.id`; the function internally calls
  `verifyAuth(req)` + ownership check for direct client calls). Not a real P0.
- "Mobile homeowner screens missing": both `JobPostingScreen` and `BidReviewScreen` existed and
  called the correct endpoints; the real gap was a missing entry point on the homeowner dashboard.

**Dashboard / runbook items (still pending human action):**

- `docs/SUPABASE_DASHBOARD_CHECKLIST.md` — HIBP leaked-password toggle + Postgres patch upgrade
- `docs/RUNBOOK_extensions_schema_migration.md` — new runbook for moving
  `postgis`/`vector`/`pg_trgm` out of `public` (Sprint 6.8 dedicated PR)

**Advisor state after remediation** (re-run 2026-04-17):

- Cleared: 3 × `public_bucket_allows_listing`
- Unchanged (planned): 1 × `rls_disabled_in_public` (spatial_ref_sys), 3 × `extension_in_public`, 1
  × `auth_leaked_password_protection`, 1 × `vulnerable_postgres_version`

### 2026-04-16 — Live-DB + Full-Stack Audit Findings (NEW)

Full details in session transcript. Below is the open-issue list surfaced by the 2026-04-16 audit
that are NOT covered by Sprints 0-6. Listed in priority order.

**P0 — Security / privacy (must fix before production):**

1. **`contractor_locations.SELECT` RLS policy is `USING (true)`** — any authenticated user can read
   every contractor's live GPS. INSERT/UPDATE are correctly scoped to `auth.uid() = contractor_id`,
   but SELECT was never scoped. Table has 0 rows today; becomes a data leak the moment mobile
   tracking starts writing. Fix: scope to `contractor_id = auth.uid()` OR
   homeowner-with-active-assigned-job via `EXISTS` subquery on `public.jobs`.
2. **Edge function `setup-contractor-payout` runs with `verify_jwt: false`** (version 20, active).
   Payout-onboarding endpoint has no platform-level auth. Audit internal logic + flip JWT
   verification on.
3. **`contractor-documents` storage bucket is PUBLIC** (20MB limit, accepts PDF/Word/Excel/zip).
   Contains sensitive contractor onboarding documents. Also `job-attachments` bucket is PUBLIC
   (accepts images + PDFs up to 10MB). Both should be private + served via signed URLs.
4. **Notifications: 2/10 canonical events silently drop on mobile**
   ([bid-acceptance/route.ts:113](apps/web/app/api/agents/bid-acceptance/route.ts),
   [admin/refunds/[id]/route.ts:146](apps/web/app/api/admin/refunds/[id]/route.ts)) use direct
   `serverSupabase.from('notifications').insert()` bypassing
   `NotificationService.createNotification()` — no push, no email. Fix: replace with service call.
5. **Mobile push token never registered in prod** (`user_push_tokens` live row count = 0). Endpoint
   `/api/user/push-token` exists, table + RLS exist, mobile has `getExpoPushTokenAsync()` in
   `notificationsBridge.ts` but no app-launch hook POSTs to the registration endpoint. Every push
   notification to mobile therefore silently drops.

**P1 — Feature completeness:**

6. **4/10 canonical notification events not implemented:** payment-secured-in-escrow, job-started,
   homeowner-requested-changes, 7-day-auto-release.
7. **`user_notification_preferences` table does not exist** — migration
   `20260215000001_notification_system_fixes.sql` was intended to create it. Users have no
   opt-in/opt-out control.
8. **`notifications` table has no delivery-tracking columns** (`push_sent`, `email_sent`,
   `delivered_at`) — no DB visibility into multi-channel delivery.
9. **Mobile missing homeowner screens:** bid acceptance UI, job creation flow. Homeowner on mobile
   must switch to web for both.
10. **Web missing `BeforeAfterSlider`** in homeowner review flow. Mobile has `BeforeAfterSliderView`
    in
    [HomeownerPhotoReviewScreen.tsx:30](apps/mobile/src/screens/job-details/HomeownerPhotoReviewScreen.tsx).
11. **Supabase Auth: leaked-password protection disabled** (HIBP check).
12. **Postgres 17.4.1.074 has outstanding security patches.** Schedule upgrade.

**P2 — UX / robustness:**

13. **No Supabase Realtime subscriptions on notification inbox** (web + mobile) — users see stale
    data until refresh.
14. **No background location task on mobile** — tracking stops when contractor minimizes app. Need
    `expo-location` TaskManager for true "contractor-is-coming" UX.
15. **Public-bucket broad listing** flagged by advisor on `avatars`, `contractor-portfolio`,
    `profile-images` (public access isn't needed for object URLs).

**P3 — known / documented blockers:**

16. `postgis 3.3.7`, `vector 0.8.0`, `pg_trgm 1.6` installed in `public` schema (Sprint 1 blocker
    per CLAUDE.md — ecosystem ownership issue).

**CLAUDE.md claim corrections (from live data):**

- `withApiHandler 290/310 (93.5%)` — a re-count via grep on 2026-04-16 suggests significantly more
  routes without `withApiHandler` than the 20 documented exceptions. Needs an accurate re-count
  before trusting the 93.5% figure.
- "334 tables with RLS, 806 policies" → live: 323/324 RLS-enabled, 819 policies. Close but update.
- 146 migrations → live: 154 applied.
- The "10 files with direct `createClient`" HIGH priority was already resolved; confirmed no
  non-standard `createClient` on 2026-04-16 scan (modulo intentional factories at
  `lib/api/supabaseServer.ts` and `lib/supabase.ts`).

## SECTION 1: ABSOLUTE VERIFICATION REQUIREMENTS - NO FALSE RESULTS

### ZERO TOLERANCE FOR FALSE CLAIMS

**BEFORE making ANY claim, you MUST:**

1. **RUN the actual command** - No assumptions
2. **CAPTURE real output** - No summaries
3. **SHOW evidence** - No hiding failures
4. **VERIFY it works** - No theoretical fixes

**VERIFICATION PROTOCOL FOR EVERY CHANGE:**

```bash
# 1. Type check
npx tsc --noEmit [file] 2>&1

# 2. Lint check
npx eslint [file] 2>&1

# 3. Test check
npm test -- [file].test.ts 2>&1

# 4. Build check
npm run build 2>&1

# MUST show ALL outputs, even failures
```

## SECTION 2: MANDATORY CODE STANDARDS - BUILD WILL FAIL

### HARD LIMITS (NO EXCEPTIONS):

| Metric                    | Maximum     | Current State (2026-04-23)                             | Priority |
| ------------------------- | ----------- | ------------------------------------------------------ | -------- |
| File size                 | 300 lines   | 704 lines max (0 files >1K; ~15 web + 15 mobile >500)  | MEDIUM   |
| Function size             | 50 lines    | 200-400+ line route handlers remain                    | MEDIUM   |
| Class methods             | 7           | Still large in some services                           | MEDIUM   |
| `any` types (web source)  | 0           | ~0 in pages (excl. test mocks)                         | OK       |
| `any` types (mobile)      | 0           | ~169 (services + tests)                                | MEDIUM   |
| console.\* (web app code) | 0           | 1 (`admin/retention/error.tsx:14`)                     | LOW      |
| console.\* (mobile)       | 0           | ~76                                                    | MEDIUM   |
| Hex literals (web)        | 0           | 625+ across 117 files (design-tokens adoption partial) | MEDIUM   |
| Web test suites           | 80% pass    | ~97% (~178/183) — Vitest v4                            | OK       |
| Mobile test coverage      | 80% pass    | 93.8% (9,743/10,393)                                   | OK       |
| withApiHandler            | 100% routes | 92.3% (374/405; 4 legit exceptions + 28 cron handlers) | OK       |
| Supabase canonical import | 100% files  | 100% (0 direct createClient in source)                 | OK       |
| Zod `.strict()` schemas   | 100%        | 1 / 112 (updateProfileSchema only)                     | MEDIUM   |
| RLS coverage              | 100%        | 99.7% (330/331; `spatial_ref_sys` ecosystem-blocked)   | OK       |

## SECTION 3: MANDATORY SUB-AGENT USAGE RULES

### CRITICAL: Sub-Agent Invocation Requirements

#### 1. Codebase Context Analyzer (MANDATORY - MUST BE CALLED FIRST)

**YOU MUST** invoke the `codebase-context-analyzer` agent BEFORE:

- Fixing any bug (no matter how small)
- Modifying any feature
- Adding new functionality
- Refactoring existing code
- Making performance optimizations
- Addressing security issues
- Making any database changes
- Modifying API endpoints
- Changing component behavior
- Updating styles or UI elements
- Modifying configuration files
- Changing business logic

**How to invoke:**

```
Use Task tool with subagent_type: "general-purpose"
Prompt: "Act as the codebase-context-analyzer agent defined in .claude/agents/codebase-context-analyzer.md. Analyze [specific area/bug/feature] in the mintenance codebase and provide a comprehensive context analysis following the exact structured format specified in the agent definition. Include all sections: Scope Summary, Current Implementation, Dependencies Map, Similar Patterns, Risk Analysis, Recommended Approach, and Additional Context."
```

#### 2. Specialized Agent Usage Rules

**ALWAYS** use the appropriate specialized agent for domain-specific work:

- **UI/UX work** → `ui-designer` agent (AFTER context analyzer)
- **Testing** → `testing-specialist` agent (AFTER implementation)
- **Security** → `security-expert` agent (WITH context analyzer for security issues)
- **Performance** → `performance-optimizer` agent (AFTER context analyzer)
- **Mobile** → `mobile-developer` agent (AFTER context analyzer for mobile changes)
- **Frontend** → `frontend-specialist` agent (AFTER context analyzer for React/TypeScript)
- **DevOps** → `devops-engineer` agent (FOR deployment/CI/CD issues)
- **Database** → `database-architect` agent (AFTER context analyzer for DB changes)
- **API Design** → `api-architect` agent (AFTER context analyzer for API work)
- **Property Assessment** → `ai-building-engineer` or `building-surveyor-ai` agent

#### 3. Multi-Agent Workflow (MANDATORY SEQUENCE)

For ANY code modification, follow this exact sequence:

1. **FIRST (ALWAYS)**: `codebase-context-analyzer` - Get full context and impact analysis
2. **SECOND**: Relevant specialized agent(s) - Implementation based on context
3. **THIRD**: `testing-specialist` - Verify changes don't break anything
4. **FINAL**: `codebase-context-analyzer` - Final review before marking complete

**Example for bug fix:**

```
1. Context Analyzer → "Analyze authentication bug in login flow"
2. Frontend Specialist → "Fix the bug following context analyzer recommendations"
3. Testing Specialist → "Write/update tests for the fix"
4. Context Analyzer → "Final review of authentication bug fix"
```

#### 4. Parallel Agent Execution

When multiple independent analyses are needed, run agents in parallel:

```
Single message with multiple Task tool invocations:
- Task 1: Context analysis for area A
- Task 2: Security review for area B
- Task 3: Performance check for area C
```

#### 5. Agent Review Requirements

**BEFORE marking any task complete or committing code:**

1. Run `codebase-context-analyzer` for final review
2. Ensure ALL recommendations from agents were followed
3. Document any deviations with justification
4. Verify no new issues were introduced
5. Confirm all existing tests still pass
6. Check that new tests were added if needed

#### 6. No Exceptions Policy

**NEVER skip agent invocation**, even for:

- "Simple" one-line fixes (often have hidden dependencies)
- "Urgent" hotfixes (proper analysis prevents cascading failures)
- "Obvious" changes (context reveals non-obvious impacts)
- "Documentation only" changes (may affect API contracts)
- "Style only" changes (may break component rendering)
- "Config only" changes (may affect multiple environments)

#### 7. Agent Output Integration

**YOU MUST**:

- Read ENTIRE agent output before proceeding
- Follow ALL recommendations unless technically impossible
- Document in code comments WHY if you deviate
- Include agent insights in commit messages
- Reference specific risks identified by agents
- Create TODOs for any deferred recommendations

#### 8. Failure Protocol

If an agent identifies HIGH RISK or recommends NOT proceeding:

1. STOP immediately
2. Present the risks to the user
3. Get explicit approval before continuing
4. Document the decision in the code

### ENFORCEMENT RULES

1. **Any code change without context analysis = INCOMPLETE TASK**
2. **Any bug fix without testing verification = POTENTIAL REGRESSION**
3. **Any feature without specialized agent review = TECHNICAL DEBT**
4. **Any deployment without final review = PRODUCTION RISK**

### COMMIT MESSAGE FORMAT

All commits MUST include agent analysis reference:

```
fix: [issue description]

Context Analysis: [key findings from context analyzer]
Implementation: [approach taken based on agent recommendations]
Testing: [verification performed]
Risk: [any remaining risks identified]

Reviewed by: codebase-context-analyzer
Specialized agents: [list of other agents used]
```

## PROJECT-SPECIFIC RULES

### Database Commands

- npx supabase db diff --local

### Code Quality Requirements

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files over creating new ones
- NEVER proactively create documentation files (\*.md) unless explicitly requested
- ALWAYS use agents to understand existing patterns before adding new code

### Mintenance-Specific Contexts

- This is a multi-tenant platform for property maintenance
- Web app (Next.js) and Mobile app (React Native) share code
- Supabase backend with PostgreSQL and Row Level Security
- Stripe integration for payments
- Real-time features via Supabase subscriptions
- Three user types: homeowners, contractors, admin

### CANONICAL JOB LIFECYCLE WORKFLOW (Updated 2026-02-14)

This is the complete user workflow from job creation to payment. All features MUST respect this
flow.

**Phase 1: Job Creation (Homeowner)**

1. Homeowner navigates to `/jobs/create`
2. Fills in: title, description, category, urgency, location, budget range, photos
3. `POST /api/jobs` creates job with status `posted`
4. System notifies nearby contractors (within radius) via notifications table

**Phase 2: Bidding (Contractors)** 5. Contractors see job on dashboard / get notification 6.
Contractor views job details at `/contractor/jobs/[id]` 7. Contractor submits bid: amount, message,
estimated timeline 8. `POST /api/jobs/[id]/bids` creates bid with status `pending` 9. PricingAgent
scores bid competitiveness (optional AI feature) 10. Homeowner receives notification of new bid

**Phase 3: Bid Acceptance (Homeowner)** 11. Homeowner views bids on job page `/jobs/[id]` 12.
Homeowner accepts a bid → `POST /api/jobs/[id]/bids/[bidId]/accept` 13. Winning bid status →
`accepted`, all other bids → `rejected` 14. Job status → `assigned`, `contractor_id` set on job 15.
System auto-creates draft contract (`contracts` table, status `draft`) 16. System auto-creates
message thread between homeowner and contractor

**Phase 4: Contract Signing (Both Parties)** 17. Both parties view contract at `/jobs/[id]`
(ContractManagement component) 18. Homeowner signs → contract status `pending_contractor` 19.
Contractor signs → contract status `pending_homeowner` (or `accepted` if homeowner already
signed) 20. Both signed → contract status `accepted` 21. `POST /api/contracts/[id]/sign` handles
signing logic

**Phase 5: Payment into Escrow (Homeowner)** 22. After contract accepted, homeowner sees "Pay Now"
button 23. `POST /api/jobs/[id]/payment-intent` creates Stripe PaymentIntent 24. Homeowner completes
payment via Stripe Elements 25. `POST /api/jobs/[id]/confirm-payment` confirms payment 26. Escrow
record created: status `pending` → `held` 27. Contractor notified that payment is secured in escrow

**Phase 6: Job Start (Contractor) - REQUIRES PHOTO EVIDENCE** 28. Contractor navigates to
`/contractor/jobs/[id]` 29. JobPhotoUpload component shows "Upload Before Photos" mode 30.
Contractor takes/uploads photos of current damage (uses device camera or gallery) 31.
`POST /api/jobs/[id]/photos/before` uploads to Supabase Storage 32. PhotoVerificationService
validates quality (brightness, sharpness, resolution) 33. Geolocation captured from browser
(Haversine distance check, 100m threshold) 34. Photos stored in `job_photos_metadata` table with
`photo_type: 'before'` 35. "Start Job" button becomes enabled (requires >= 1 before photo) 36.
Contractor clicks "Start Job" → `POST /api/jobs/[id]/start` 37. API validates: contractor assigned,
status is `assigned`, before photos exist 38. Job status: `assigned` → `in_progress` 39. Homeowner
notified: "Work has started on your job"

**Phase 7: Work Execution (Contractor)** 40. Contractor performs physical work at the property 41.
Can communicate with homeowner via message thread

**Phase 8: Job Completion (Contractor) - AUTO-TRIGGERED BY PHOTOS** 42. Contractor returns to
`/contractor/jobs/[id]` 43. JobPhotoUpload component shows "Upload After Photos" mode 44. Contractor
takes/uploads photos of completed work 45. `POST /api/jobs/[id]/photos/after` uploads to Supabase
Storage 46. PhotoVerificationService validates quality + category-specific requirements 47. Photos
stored in `job_photos_metadata` with `photo_type: 'after'` 48. **Auto-completion triggers**: job
status `in_progress` → `completed`, `completed_at` set 49. Homeowner notified: "Job Completed -
Review Required" with link to job page

**Phase 9: Homeowner Review (Homeowner)** 50. Homeowner navigates to `/jobs/[id]` 51.
HomeownerPhotoReview component renders with BeforeAfterSlider 52. Draggable slider shows before
photo overlaid on after photo for comparison 53. If multiple photo pairs: thumbnail navigation to
cycle through them 54. **Option A - Approve**: Homeowner clicks "Approve Work" 55.
`POST /api/jobs/[id]/confirm-completion` sets `completion_confirmed_by_homeowner: true` 56. Triggers
escrow release process 57. **Option B - Request Changes**: Homeowner clicks "Request Changes" 58.
Textarea appears for comments describing needed fixes 59. `POST /api/jobs/[id]/request-changes`
creates notification to contractor 60. Contractor notified with homeowner's comments and link back
to job 61. **Safety net**: If homeowner doesn't respond within 7 days, auto-release triggers

**Phase 10: Payment Release (System)** 62. After homeowner approval (or 7-day timeout): 63. Escrow
status: `held` → `release_pending` 64. System calculates platform fee (percentage of job amount) 65.
Stripe Transfer created to contractor's connected account 66. Escrow status: `release_pending` →
`released` 67. Contractor notified: "Payment released for [job title]" 68. Homeowner notified:
"Payment processed for [job title]"

**Phase 11: Review (Both Parties - Optional)** 69. Both parties can leave star ratings (1-5) and
text reviews 70. Reviews stored in reviews table linked to job 71. Contractor's average rating
updated on profile 72. Homeowner's rating tracked for contractor reference 73. Job lifecycle
complete

**Key Status Transitions:**

```
Job:      posted → assigned → in_progress → completed (also: disputed, cancelled)
Bid:      pending → accepted/rejected
Contract: pending_contractor → pending_homeowner → accepted (created on bid acceptance)
Escrow:   pending → held → release_pending → completed (code uses 'completed' not 'released')
```

**Enforcement Gates:**

- Can't start job without before photos (`/api/jobs/[id]/start` checks `job_photos_metadata`)
- Job completion auto-triggered by after photo upload (no manual "complete" button)
- Payment release requires homeowner approval (with 7-day auto-release safety net)
- Contract must be signed by both parties before payment
- Escrow must be funded before job can start

## VERIFICATION CHECKLIST

Before ANY code is written or modified:

- [ ] Context Analyzer has been run
- [ ] Dependencies have been mapped
- [ ] Similar patterns have been identified
- [ ] Risks have been assessed
- [ ] Specialized agent has reviewed (if applicable)
- [ ] Testing strategy is defined
- [ ] Impact on other components is understood

This is NOT optional. These rules ensure code quality, prevent regressions, and maintain consistency
across the entire mintenance platform.

## QUALITY ENFORCEMENT RULES

### NO SHORTCUTS POLICY

- NEVER assume success without verification
- ALWAYS run actual commands/tests to verify claims
- NEVER report "would work" - only report "did work"
- ALWAYS show actual output/results, not theoretical outcomes
- NEVER mark tasks complete without evidence

### VERIFICATION REQUIREMENTS

Before ANY status report:

- [ ] Run the actual test/build/command
- [ ] Capture and show REAL output
- [ ] Verify with multiple methods when possible
- [ ] Check edge cases, not just happy path
- [ ] Document any failures honestly

### BANNED PHRASES (without proof)

NEVER use these without actual verification:

- "should work"
- "would fix"
- "appears to be"
- "likely resolves"
- "seems correct"
- "looks good"
- "probably works"

ALWAYS use evidence-based language:

- "verified by running X, output: [actual output]"
- "test output shows Y: [actual results]"
- "confirmed with Z: [specific evidence]"
- "ran [command], result: [actual result]"

## MANDATORY VERIFICATION PROTOCOL

For ANY claim about code/system state:

1. Use Read tool to show actual code (with line numbers)
2. Use Bash tool to run actual commands (show full output)
3. Use Grep/Glob to prove file existence (show results)
4. Use testing tools to verify functionality (show test output)

**NEVER rely on assumptions or memory** **ALWAYS verify with actual file/command output**

### AGENT OUTPUT REQUIREMENTS

ALL agent responses MUST include:

- **Evidence**: Actual file paths, line numbers, code snippets
- **Verification**: Commands run and their output
- **Limitations**: What was NOT checked
- **Confidence**: Low/Medium/High with justification

**Example of GOOD agent report:** ✅ "Found 3 instances in [auth.ts:42](auth.ts#L42), verified by
grep output: [shows actual grep results]" ✅ "Ran `npm test`, all 47 tests passed: [shows test
summary]" ✅ "Checked 5 files, found issue in 2: [lists specific files and line numbers]"

**Example of BAD agent report:** ❌ "Should be fixed" (no evidence, no verification) ❌ "All tests
pass" (didn't actually run tests) ❌ "No issues found" (didn't show what was checked) ❌
"Implementation complete" (didn't verify functionality)

## ANTI-BIAS RULES

### Completeness Bias Prevention

- NEVER report "all tests pass" without running them and showing output
- NEVER claim "no issues found" without thorough scan and listing what was checked
- NEVER say "implementation complete" without verification of functionality
- ALWAYS list what was NOT checked, untested scenarios, potential edge cases

### Optimism Bias Prevention

- Report failures FIRST, successes second
- Assume code is broken until proven working
- List risks before benefits
- Show actual errors in full, don't summarize or hide them
- Highlight what could still go wrong

### Shortcut Detection

If you're tempted to:

- Skip a verification step → STOP, run it anyway
- Assume based on file name → STOP, read the actual file
- Mark complete based on plan → STOP, verify actual outcome
- Summarize errors → STOP, show full error output
- Say "looks good" → STOP, define what "good" means and verify it

## POST-TASK AUDIT (MANDATORY)

After EVERY task, before marking complete:

### Audit Questions (answer with evidence):

1. **What EXACTLY did I change?** (show diffs with git diff or file comparison)
2. **What did I run to verify?** (show command output verbatim)
3. **What could still be broken?** (list untested scenarios)
4. **What assumptions did I make?** (list and challenge each one)
5. **What would prove me wrong?** (then run that test)

### Audit Checklist:

- [ ] Re-read original request - did I answer it precisely?
- [ ] Run relevant tests - show actual output (not summary)
- [ ] Check for side effects - verify related code still works
- [ ] Look for edge cases - test at least one explicitly
- [ ] Verify file changes - use git diff or Read tool to confirm
- [ ] List what was NOT verified - be explicit about gaps

### Evidence Requirements

Every completion report MUST include:

1. **Commands Run**: Exact commands with full output
2. **Files Modified**: List with git diff or before/after comparison
3. **Tests Executed**: Test names and results (pass/fail counts)
4. **Verification Method**: How you confirmed it works
5. **Remaining Risks**: What could still fail
6. **Not Tested**: Scenarios that were NOT verified

### Example of COMPLETE Task Report:

```
✅ Task: Fix authentication bug in login flow

Evidence:
- Modified: apps/web/src/lib/auth.ts (lines 42-56)
- Verified with: git diff apps/web/src/lib/auth.ts
- Ran: npm test -- auth.test.ts
- Result: 12/12 tests passed
- Edge cases tested: empty password, SQL injection, XSS
- Not tested: rate limiting, OAuth flows
- Remaining risk: Password reset flow not verified

Commands executed:
$ npm test -- auth.test.ts
PASS apps/web/src/__tests__/auth.test.ts
  ✓ validates email format (23 ms)
  ✓ rejects empty password (18 ms)
  [... full output ...]

$ git diff apps/web/src/lib/auth.ts
[shows actual diff]
```

## FAILURE REPORTING REQUIREMENTS

When something doesn't work:

1. Show the FULL error message (not summarized)
2. Show the exact command that failed
3. Show relevant file contents that may be causing issue
4. List what you tried that didn't work
5. Explain what you don't understand
6. Ask for clarification rather than guessing

NEVER say "there's an error" - ALWAYS show the actual error. NEVER say "it failed" - ALWAYS show why
it failed. NEVER hide errors to appear more competent.
