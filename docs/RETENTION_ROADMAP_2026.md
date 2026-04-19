# Mintenance Retention Roadmap 2026 — 90-Day Plan

**Status:** Draft / proposed **Date:** 2026-04-17 **Owner:** gloire@mintenance.co.uk **Baseline
commit:** `8fed54ed` on branch `fix/mobile-audit-security-ux-features` **Source brief:**
[`Mintenance_Demographics_Mentality_Retention_2026-04-17.pdf`](../../Mintenance_Demographics_Mentality_Retention_2026-04-17.pdf)
**Supersedes:** none (this is the first formal retention roadmap) **Related docs:**
[SUPABASE_DASHBOARD_CHECKLIST.md](./SUPABASE_DASHBOARD_CHECKLIST.md),
[RUNBOOK_extensions_schema_migration.md](./RUNBOOK_extensions_schema_migration.md),
[AUDIT_2026_04_13.md](./AUDIT_2026_04_13.md)

---

## Purpose

Align the Mintenance platform to the 2026-04-17 strategy paper (demographic flaws, user-mentality
research, customer retention). Turn the PDF's 24 retention moves — sequenced across 7 sprints / 90
days — into concrete engineering work, grounded in the actual codebase at commit `8fed54ed`.

## Already shipped on 2026-04-17 (commit `8fed54ed`)

Do not re-plan these:

- `contractor_locations` RLS privacy fix (migration `contractor_locations_select_scope`)
- `contractor-documents` + `job-attachments` buckets flipped private + 4 caller files use
  `createSignedUrl`
- Broken notification events 3 (bid_accepted) + 9 (escrow_released) refactored to
  `NotificationService.createNotification()`
- `NotificationService` latent bug fixed (was inserting non-existent `data` column → corrected to
  `metadata` + top-level `action_url`)
- Mobile `savePushToken` hit wrong endpoint → `/api/user/push-token` with `{pushToken, platform}`
- Event 10 (7-day auto-release) now fires notifications to both parties
  (`escrow-release-notifications.ts`)
- `user_notification_preferences` table created with RLS + trigger (NOT yet consumed by
  NotificationService — see R2)
- `HomeownerDashboard` mobile got a "Post a New Job" CTA in the hero
- `BeforeAfterSlider` component ported to web, integrated in `HomeownerApprovalClient`
- Web + mobile notification inboxes subscribe to Supabase Realtime
- Mobile background location via `TaskManager` (`BackgroundLocationTask.ts`)
- Three broad "Anyone can view" storage SELECT policies dropped
- `SUPABASE_DASHBOARD_CHECKLIST.md` + new `RUNBOOK_extensions_schema_migration.md`

## Table of contents

1. [Codebase reality check](#section-1--codebase-reality-check)
2. [Sprint-by-sprint plan (R1 → R7)](#section-2--sprint-by-sprint-plan-r1--r7)
3. [Cross-cutting infrastructure](#section-3--cross-cutting-infrastructure)
4. [Items that are NOT primarily engineering](#section-4--items-that-are-not-primarily-engineering)
5. [Sequencing / dependency graph](#section-5--sequencing--dependency-graph)
6. [Retention dashboard spec](#section-6--retention-dashboard-spec)
7. [Honest priority reco](#section-7--honest-priority-reco)

---

## Section 1 — Codebase reality check

**Escrow in homeowner-facing UI strings.** `grep -i escrow` hits **~300 occurrences across 75
files** in `apps/web/app` and **~56 files** in `apps/mobile`. Not all are homeowner-facing (admin +
contractor + API routes carry the word too and must be preserved per task #1). The homeowner-facing
strings cluster in:

- `apps/web/app/homeowner/escrow/approve/components/HomeownerApprovalClient.tsx`
- `apps/web/app/jobs/[id]/components/JobDetailsProfessional.tsx`, `JobLifecycleTimeline.tsx`,
  `contract/ContractScope.tsx`, `ContractManagement.tsx`
- `apps/web/app/jobs/[id]/payment/page.tsx` (3 hits)
- `apps/web/app/payments/components/TransactionList.tsx`, `PaymentsStatsCards.tsx`,
  `apps/web/app/payments/page.tsx`
- `apps/web/app/dashboard/page.tsx`, `apps/web/app/for-homeowners/page.tsx`,
  `apps/web/app/terms/page.tsx`, `apps/web/app/faq/components/FAQPageClient.tsx`,
  `apps/web/app/about/components/AboutPageClient.tsx`,
  `apps/web/app/how-it-works/components/HowItWorksFeatures.tsx`, `apps/web/app/safety/page.tsx`
- Mobile: `apps/mobile/src/screens/job-details/EscrowInfoModal.tsx`, `jobDetailsStyles.ts`,
  `ContractPreparationScreen.tsx`, `JobSignOffScreen.tsx`, `PaymentScreen.tsx`,
  `components/onboarding/OnboardingSwiper.tsx`, `screens/payment/components/EscrowInfoCard.tsx`,
  `PaymentSummaryCard.tsx`

**Landing pages (`for-homeowners`, `for-contractors`).** Both are pure TSX (`page.tsx` only, no
MDX/CMS). They render through a shared `@/components/marketing/MarketingFeaturePage` component
driven by an inline `FEATURES: MarketingFeature[]` array. No comparison-table component exists yet —
`components/marketing/` contains only `MarketingFeaturePage.tsx`.

**`NotificationService.createNotification` vs `user_notification_preferences`.** Confirmed: it does
NOT consult `user_notification_preferences`. File
`apps/web/lib/services/notifications/NotificationService.ts` (277 lines) only delegates to
`NotificationAgent.shouldSendImmediately` and then inserts into `notifications` + pushes via Expo.
The table exists (migration `20260417000005_user_notification_preferences.sql`, shipped today) but
is unused.

**EmailService.** `apps/web/lib/email-service.ts` is a class with static methods. Templates live in
`apps/web/lib/email-templates/` split into `contracts.ts`, `jobs.ts`, `messages.ts`,
`newsletter.ts`, `payments.ts`, `quotes-bids.ts`, `tenant.ts`, `shared.ts`, `types.ts`, plus a
consolidating `email-templates.ts` re-export. Three providers with priority Brevo > SendGrid >
Resend. Unsubscribe footer + token infra already present.

**Admin dashboards.** `apps/web/app/admin/` has 26 sub-routes (`dashboard`, `analytics-detail`,
`disputes`, `escrow/reviews`, `refunds`, `payments/fees`, `contractors/payment-setup`, `users`,
`security`, `audit-logs`, `settings`, etc.). `/admin/dashboard` redirects to `/admin` (the canonical
dashboard). A new "Retention" tab should live at `apps/web/app/admin/retention/page.tsx` mirroring
the `admin/analytics-detail` pattern (`page.tsx` + `loading.tsx` + `error.tsx` + `types.ts`).

**Live DB schema — relevant facts (verified via Supabase MCP, project `ukrjudtlvapiajkjbcrd`).**

- `contracts`: no `homeowner2_signed_at` column; only `contractor_signed_at` +
  `homeowner_signed_at`. `terms jsonb` exists.
- `jobs`: has `property_id` (FK to `properties`), `postcode`, `city`, `latitude`, `longitude`,
  `completion_confirmed_by_homeowner`. **No `tenancy` / `is_rental` flag.**
- `profiles`: has `notification_preferences jsonb` (legacy) AND the newer
  `user_notification_preferences` relational table. `settings jsonb` exists (good home for
  Silver-mode flag).
- `reviews`: **`response` column already exists** — right-of-reply is UI + API only, no migration.
- `disputes`: has `status`, `resolution`, `resolved_at`, `created_at` — avg resolution time is
  computable today.
- `properties`: has `year_built`, `postcode`, `photos jsonb`, `org_id` — everything needed for
  Annual Home MOT.
- `organizations` + `organization_memberships` with `org_role text` — **multi-user contractor orgs
  already have a schema.** Only needs UI + invite flow + role-gate on endpoints.
- `homeowner_subscriptions` — Stripe-backed subscriptions table already exists. No need for a new
  `home_health_subscriptions` table; reuse this + `recurring_maintenance_schedules` (has
  `property_id`, `category`, `frequency`, `next_due_date`, `last_completed_at`).
- `property_tenants` table exists with `user_id`, `lease_start`, `lease_end`, `invitation_token` —
  landlord mode partially in place (see `apps/web/app/api/landlord/{contacts,recurring}` +
  `apps/web/lib/services/property-team/PropertyTeamService.ts`).

**Mobile theme / font scaling.** `apps/mobile/src/theme/index.ts` exports
`useAccessibleFontSize(baseFontSize, maxScale=1.3)` using `PixelRatio.getFontScale()`. Dark-mode
state lives in `theme/darkModeState.ts`. No Silver-mode / extra-large toggle exists. Settings hub is
at `apps/mobile/src/screens/settings/SettingsHubScreen.tsx`.

**Cron infrastructure.** `apps/web/lib/cron-handler.ts` exports `withCronHandler(name, fn, config)`
with rate-limit + `requireCronAuth` + logging to `cron_job_runs`. **24 crons already live** under
`apps/web/app/api/cron/*`, including `anniversary-recognition`, `win-back-campaign`,
`low-activity-contractor-nudge`, `contractor-job-digest`, `retention-cleanup`,
`recurring-job-creator`, `compliance-expiry-reminders`. The Friday cash-flow digest and Annual MOT
drop into this pattern directly.

**Disputes.**
`apps/web/app/admin/disputes/{page.tsx, components/DisputesTable.tsx, DisputesClient.tsx, ResolveDisputeDialog.tsx}` +
`apps/web/lib/services/disputes/{DisputeWorkflowService.ts, DisputeDocumentationService.ts, MediationService.ts}`.
`apps/web/app/api/disputes/{create, [id]}`. Everything for task #11 already exists — needs only (a)
public expose on contractor profile and (b) SLA metric.

**Contract-signing — "fully accepted" rule.**
`apps/web/app/api/contracts/[id]/accept/route.ts:95-99` — "accepted" = BOTH `contractor_signed_at`
AND `homeowner_signed_at` set (single homeowner signature suffices). This is the gate task #4
modifies.

**Reviews UI + reply.** `apps/web/app/api/contractors/[id]/reviews/route.ts` returns reviews but
DROPS the `response` column from the SELECT. `jobs/[id]/review/page.tsx` lets the reviewer write; no
reply endpoint exists.

**Referrals.** Migration `20260401000002_waitlist_referral_system.sql` exists (waitlist-only). No
`/api/referrals/*` routes. Task #8 needs either extend that schema or add `postcode_referrals`
table.

**Reality checks that contradict the PDF.**

- The PDF calls Home Health a "new subscription"; the schema already has `homeowner_subscriptions` +
  `recurring_maintenance_schedules`. We wire those up, not create parallel tables.
- The PDF implies multi-user contractor accounts need new infra; `organizations` +
  `organization_memberships` with `org_role` already exist. Ship is 70% UI, 30% backfill.
- `reviews.response` already exists — right-of-reply is mostly UI.

---

## Section 2 — Sprint-by-sprint plan (R1 → R7)

### R1 Days 1–14 — "Trust infrastructure"

**Goal:** A homeowner landing on mintenance.com today sees "Protected Payment" (not "escrow")
everywhere a homeowner would see it, finds a public `/trust` page, and a contractor sees "No lead
fees, ever" above the fold on `/for-contractors`.

| #   | Move                                                      | Files                                                                                                                                                                                                                                                                   | DB   | API                                                                                                                                                                        | Acceptance                                                                                                                                                                                                                                                                                                                                                                                           | Size |
| --- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | Rename escrow→Protected Payment (homeowner surfaces only) | Create `packages/shared/src/copy/payment-terms.ts` exporting `PROTECTED_PAYMENT = 'Protected Payment'`; edit ~25 homeowner-facing files listed in §1 to import the constant. Keep DB columns, API paths (`/api/escrow/*`), contractor screens, admin screens unchanged. | None | None                                                                                                                                                                       | `grep -i "escrow" apps/web/app/homeowner apps/web/app/for-homeowners apps/web/app/faq apps/web/app/payments apps/web/app/about apps/web/app/safety apps/web/app/how-it-works apps/web/app/terms` returns zero visible strings (comments + imports OK). Mobile Silver-mode `OnboardingSwiper.tsx`, `EscrowInfoModal.tsx`, `PaymentSummaryCard.tsx`, `EscrowInfoCard.tsx` display "Protected Payment". | L    |
| 15  | "No lead fees, ever" + comparison table                   | `apps/web/components/marketing/NoLeadFeesSection.tsx` (new, ~120 lines), `apps/web/components/marketing/CompetitorComparisonTable.tsx` (new, ~180 lines). Insert into `for-contractors/page.tsx` (above existing `FEATURES`).                                           | None | None                                                                                                                                                                       | Above-fold headline in `/for-contractors` reads "No lead fees, ever"; comparison table shows Mintenance vs Checkatrade / MyBuilder / Rated People with four rows (membership fee, per-lead fee, £/yr exposure at 10 leads/mo, payment protection).                                                                                                                                                   | M    |
| —   | Public `/trust` page                                      | `apps/web/app/trust/page.tsx` + `components/trust/TrustStats.tsx` + `components/trust/RlsBadge.tsx`. Pull live counts via a static `export const revalidate = 3600` fetch to an internal `/api/stats/trust` route that sums tables + RLS coverage.                      | None | New `apps/web/app/api/stats/trust/route.ts` (`withApiHandler({ auth: false })`) that queries `information_schema.tables` + `pg_policies` server-side via `serverSupabase`. | `/trust` loads in <1s, shows "324 public tables • 99.7% RLS • SOC2 roadmap" as live numbers. Linked from site footer.                                                                                                                                                                                                                                                                                | M    |
| 13  | Push-token telemetry confirmation                         | No file changes — add a read-only admin report at `apps/web/app/admin/retention/components/PushTokenCoverage.tsx` that queries `SELECT COUNT(DISTINCT user_id) FROM user_push_tokens` vs active contractor count.                                                       | None | None (reads existing tables)                                                                                                                                               | Admin can see push-token coverage % rising week-over-week after today's fix landed.                                                                                                                                                                                                                                                                                                                  | S    |

**Dependencies:** None. Zero external partnerships.

**Out of scope:** Mobile copy tokenisation beyond the 4 screens above (hand off to R3 with Silver
mode); animation/redesign of landing pages; SOC2 evidence.

**Risks:** Pre-commit 500-line limit on `for-contractors/page.tsx` — split comparison table into its
own component early. Legal needs to sign off the exact phrasing of the comparison table (competitor
facts must be citable) — flag in §4.

---

### R2 Days 15–28 — "Notifications that matter"

**Goal:** Every canonical event reaches the right user through the right channel, a contractor
receives a Friday cash-flow digest, and the onboarding flow explains that Protected Payment protects
contractors too.

| #   | Move                                                            | Files                                                                                                                                                                                                                                                                                                                                                                                                                               | DB   | API                                                                                                              | Acceptance                                                                                                                                                                                                      | Size                                                                                             |
| --- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --- |
| —   | Wire `user_notification_preferences` into `NotificationService` | Edit `apps/web/lib/services/notifications/NotificationService.ts` — before the insert/queue branch, look up prefs (`push_enabled`, `email_enabled`, `in_app_enabled`, `disabled_types`, `quiet_hours_start/end`, `timezone`). Add `checkPreferences(userId, type)` helper. Split into `NotificationService.ts` (facade, <200 lines) + `NotificationChannels.ts` + `NotificationPreferenceResolver.ts` to stay under 500-line limit. | None | None                                                                                                             | Setting `push_enabled=false` stops pushes; `disabled_types ?                                                                                                                                                    | ARRAY['win_back']`suppresses win-back. Quiet hours delay push until`quiet_hours_end` in user TZ. | L   |
| —   | Settings UI for preferences (web + mobile)                      | `apps/web/app/settings/notifications/page.tsx` + `components/NotificationPreferencesForm.tsx`; mobile `apps/mobile/src/screens/settings/NotificationPreferencesScreen.tsx`.                                                                                                                                                                                                                                                         | None | New `apps/web/app/api/user/notification-preferences/route.ts` (GET/PATCH) with `withApiHandler({ auth: true })`. | User can toggle push/email/in-app + quiet hours + per-type mute. Round-trips persist.                                                                                                                           | M                                                                                                |
| 16  | Friday cash-flow digest                                         | New cron `apps/web/app/api/cron/contractor-cashflow-digest/route.ts` (Friday 09:00 UTC) + `apps/web/lib/services/contractor/CashFlowDigestService.ts`. Email template in `apps/web/lib/email-templates/cashflow-digest.ts`.                                                                                                                                                                                                         | None | None                                                                                                             | Contractor with ≥1 escrow settlement in the week gets email "This week you earned £X, £Y releases Monday". In-app notification fires via `NotificationService.createNotification({ type: 'cashflow_digest' })`. | M                                                                                                |
| 21  | "Protected Payment protects you too" onboarding beat            | Mobile `apps/mobile/src/components/onboarding/OnboardingSwiper.tsx` — add slide 5 specifically for contractor role (condition on role). Web contractor-only modal on first dashboard visit: `apps/web/app/contractor/dashboard-enhanced/components/ProtectedPaymentExplainerModal.tsx`.                                                                                                                                             | None | None                                                                                                             | New contractor sign-up sees the slide once; persist dismissal on `profiles.settings`.                                                                                                                           | S                                                                                                |

**Dependencies:** None. Email provider keys already configured.

**Out of scope:** Annual Home MOT email (R5); win-back redesign (ships later). Home Health
subscription UI (R5).

**Risks:** `NotificationService.ts` hits 500-line limit after preference-resolver merge — plan the
facade split on day 1 of the sprint, not day 10. Timezone logic for quiet hours needs to resolve
from `user_notification_preferences.timezone` not server TZ.

---

### R3 Days 29–42 — "Close the 65+ gap"

**Goal:** A 65+ homeowner can post a job using 20pt fonts and a linear 3-step wizard; a second
homeowner on a property must co-sign before a contract becomes `accepted`.

| #   | Move                                               | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | DB                                      | API                                                                                 | Acceptance                                                                                                                                                              | Size |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 5a  | Silver-mode theme + toggle                         | Mobile `apps/mobile/src/theme/silverMode.ts` (new) exports larger scale (`baseFontSize*1.35`, `touchTarget=56`). Extend `apps/mobile/src/theme/index.ts` with `isSilverMode` getter mirroring `isDarkMode` pattern (`darkModeState.ts`). Web: `apps/web/lib/theme-silver.ts` + `app/providers.tsx` wraps a `SilverModeContext`. Settings toggle in `SettingsHubScreen.tsx` + `apps/web/app/settings/accessibility/page.tsx`.                                                                                                                                                                                                                                                                                  | None (uses `profiles.settings` jsonb)   | New `apps/web/app/api/user/settings/route.ts` PATCH for `settings.silverMode=true`. | Toggling "Silver mode" scales all `useAccessibleFontSize` consumers to 1.35×; CTA heights ≥56px. Persists across sessions.                                              | L    |
| 5b  | Step-by-step wizard for job posting                | Mobile `apps/mobile/src/screens/home/PostJobWizardScreen.tsx` (new, 3 steps — what, where, when). Web `apps/web/app/jobs/new/wizard/page.tsx`. Existing single-form remains for non-Silver users.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | None                                    | Reuses existing `/api/jobs` POST.                                                   | In Silver mode, tapping "Post a new job" enters wizard by default; each step has back/next, one field per screen.                                                       | L    |
| 5c  | "Contractor takes before-photos on arrival" opt-in | Mobile `apps/mobile/src/screens/job-details/components/ContractorTakesPhotosCard.tsx`. Flag stored in `jobs.requirements->>'contractor_before_photos'`. Existing photo upload (`apps/web/app/api/jobs/[id]/photos/before/route.ts`) already supports contractor uploads — just surface the UI prompt.                                                                                                                                                                                                                                                                                                                                                                                                         | None (reuses `jobs.requirements jsonb`) | None (existing route)                                                               | Homeowner in wizard sees "Let the contractor take before-photos" checkbox; contractor sees "Take before-photos on arrival" CTA.                                         | S    |
| 4   | Second-homeowner approval gate                     | New table + flow. Migration `20260421000001_contract_second_homeowner.sql` creates `contract_signatories(id, contract_id FK, user_id FK, role text CHECK in ('primary_homeowner','second_homeowner','contractor'), signed_at, invitation_token, created_at)` with RLS (`user_id = auth.uid()` OR contract parties). Edit `apps/web/app/api/contracts/[id]/accept/route.ts` lines 85-100: replace the "if both signed → accepted" check with "if `count(signatories where signed_at is null) = 0` → accepted". Add `apps/web/app/api/contracts/[id]/invite-cosigner/route.ts` POST. UI: `apps/web/app/jobs/[id]/components/contract/AddCoSignerDialog.tsx` + mobile `ContractPreparationScreen.tsx` additions. | New table + RLS                         | New invite endpoint + modified accept endpoint.                                     | Contract stays `pending_homeowner` until second homeowner signs via invite link. Existing 1-homeowner jobs still work (no row in `contract_signatories` = legacy path). | L    |
| 20  | Learning cards (60s)                               | Content-only — videos on CDN, `apps/mobile/src/screens/learning/LearningCardsScreen.tsx` + web `apps/web/app/learn/page.tsx`. Card metadata in a JSON constant (`apps/web/app/learn/cards.ts`). First 2 cards: "How to take a before-photo", "What Stripe Connect asks for".                                                                                                                                                                                                                                                                                                                                                                                                                                  | None                                    | None                                                                                | New contractor onboarding prompts the two cards; skippable; completion logged to `profiles.settings.learning_completed[]`.                                              | S    |

**Dependencies:** Video production for 2 cards (~2 weeks lead time, run in parallel with dev).

**Out of scope:** AI voice-over; >2 learning videos (ship later).

**Risks:** Silver-mode font scaling can break `StyleSheet.create` frozen values across the mobile
app — the theme file warns about this. Budget 2 days for visual QA. Second-homeowner migration is
the biggest gotcha: existing contracts have no `contract_signatories` row, so the accept route must
treat empty-list as legacy single-homeowner mode.

---

### R4 Days 43–56 — "Credential moat"

**Goal:** A contractor registering today hits a "Verify my Gas Safe / NICEIC / TrustMark number"
field and gets a live green badge when the register returns a match.

| #   | Move                                                    | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | DB                                            | API                                                                 | Acceptance                                                                                                                                                                                              | Size |
| --- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 17  | Gas Safe / NICEIC / TrustMark live-register integration | `apps/web/lib/services/verification/CredentialRegisterService.ts` (facade) + `providers/GasSafeProvider.ts` + `providers/NICEICProvider.ts` + `providers/TrustMarkProvider.ts`. Migration `20260428000001_credential_verifications.sql` creates `credential_verifications(id, user_id FK, register text CHECK in ('gas_safe','niceic','trustmark'), registration_number text, status text, verified_at, expires_at, raw_response jsonb)`. Callback handler `apps/web/app/api/verification/register-callback/[register]/route.ts`. UI: `apps/web/app/contractor/onboarding/credentials/page.tsx`. Badge render in `apps/web/app/contractors/[id]/page.tsx` + mobile profile cards. | New table + RLS (owner-read, admin-read-all). | New `POST /api/verification/submit-credential`, callback endpoints. | Valid Gas Safe number returns "Verified" green badge on profile + `credential_verifications.status='verified'`; invalid number returns "Not found". Admin override available via `admin/verifications`. | XL   |

**Dependencies:** **BLOCKING — commercial API agreements with Gas Safe Register, NICEIC/ELECSA,
TrustMark.** Realistic procurement timeline is 4-8 weeks. **Start procurement on Day 1 of R1** (flag
in §4). If APIs aren't ready by R4, fall back to a manual-verification workflow: contractors upload
a cert photo, admin verifies in-dashboard (reuse existing `apps/web/app/admin/verifications/` +
`apps/web/lib/services/verification/`).

**Out of scope:** RIBA, CIBSE, other trade registers.

**Risks:** APIs may have strict rate limits or require OAuth flows that don't fit a single "submit"
button. Build provider abstraction on Day 1.

---

### R5 Days 57–70 — "Frequency layer"

**Goal:** A homeowner can subscribe to Home Health for £9.99/mo and boiler/smoke/gutter jobs get
auto-created on schedule; the same homeowner gets an Annual Home MOT email personalised to their
property age + local weather.

| #   | Move                     | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | DB                          | API                                                                                                                                                                                 | Acceptance                                                                                                                                                                                               | Size |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 2   | Home Health subscription | Reuse `homeowner_subscriptions` + `recurring_maintenance_schedules` (both already in DB — see §1). New UI: `apps/web/app/homeowner/subscriptions/home-health/page.tsx` + `components/HomeHealthEnrollCard.tsx`. Stripe wiring in `apps/web/lib/services/subscription/HomeownerSubscriptionService.ts` (already exists — extend with `createHomeHealthSubscription()`). On enrollment, insert 3 rows into `recurring_maintenance_schedules` (boiler: annual, smoke: semi-annual, gutter: semi-annual). Existing cron `apps/web/app/api/cron/recurring-job-creator/route.ts` already creates jobs when `next_due_date <= now` — verify it handles the new rows. | Config only — no new tables | New `apps/web/app/api/subscriptions/home-health/route.ts` POST/GET/DELETE; Stripe webhook `apps/web/app/api/webhooks/stripe/route.ts` (existing) handles `customer.subscription.*`. | Subscribing creates a Stripe subscription, 3 `recurring_maintenance_schedules` rows; 24h after setting `next_due_date=now`, `recurring-job-creator` cron auto-posts a job tagged `source='home_health'`. | L    |
| 6   | Annual Home MOT email    | New cron `apps/web/app/api/cron/annual-home-mot/route.ts` (daily 07:00 UTC; fires on property `created_at` anniversary). Service `apps/web/lib/services/retention/AnnualHomeMOTService.ts`. Template `apps/web/lib/email-templates/annual-home-mot.ts`. Personalisation inputs: `properties.year_built`, `properties.postcode`, join with a weather lookup (reuse `apps/web/lib/services/weather/` if present).                                                                                                                                                                                                                                               | None                        | None                                                                                                                                                                                | A property with `year_built=1970, postcode='M14'` receives an email listing 5 MOT items weighted to older-property concerns (damp, wiring) on its annual registration date.                              | M    |
| 7   | Post-job +90-day nudge   | Extend existing cron `apps/web/app/api/cron/anniversary-recognition/route.ts` or clone to `post-job-nudge`. Service in `apps/web/lib/services/retention/`. Email template pulls before/after photo URLs from `job-attachments` bucket (signed URLs — that infra landed in commit `8fed54ed`).                                                                                                                                                                                                                                                                                                                                                                 | None                        | None                                                                                                                                                                                | 90 days after `jobs.completed_at`, homeowner gets email "What's next for your home?" with before/after pair from the completed job.                                                                      | S    |

**Dependencies:** Stripe price IDs for £9.99/mo plan must be created (non-code task — 30min).
Weather API key (OpenWeather free tier acceptable).

**Out of scope:** Home Health tier variants (plus/premium); insurance partnerships.

**Risks:** `recurring_maintenance_schedules` is currently seeded via
`apps/web/app/api/landlord/recurring/route.ts` for landlords — make sure the Home Health flow can
coexist (different `created_by` paths).

---

### R6 Days 71–84 — "Team + landlord segments"

**Goal:** A contractor company can invite a dispatcher + 4 field operatives with distinct roles; a
landlord can post a job flagged as "my rental property" with either them or the tenant as payer.

| #   | Move                                      | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | DB                             | API                                                                                                                                                                                                | Acceptance                                                                                                                                                                                   | Size |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 18  | Multi-user contractor orgs                | Schema already exists (`organizations`, `organization_memberships`, `org_role text`). Wire the UI: `apps/web/app/contractor/team/page.tsx` + `components/InviteMemberDialog.tsx`. Invite flow reuses `property_tenants.invitation_token` pattern. Role-gating helper in `apps/web/lib/auth-manager/` → `requireOrgRole(['owner','dispatcher'])`. Mobile `apps/mobile/src/screens/contractor/TeamScreen.tsx` already exists — extend it. Migration `20260505000001_organizations_contractor_type.sql` only adds `organizations.organization_type CHECK to include 'contractor_company'` if not present, plus index on `organization_memberships(user_id, status)`. | Minor (enum extension + index) | New `apps/web/app/api/organizations/[id]/members/route.ts` GET/POST/DELETE; `members/[userId]/role/route.ts` PATCH. Accept-invite at `apps/web/app/api/organizations/accept-invite/route.ts` POST. | Owner invites dispatcher via email; invitee lands on `/contractor/accept-invite?token=...`, joins org; can view but not accept jobs (role gate). Field operative can only see assigned jobs. | XL   |
| 10  | Landlord tenancy flag + landlord-as-payer | Migration `20260505000002_job_tenancy_payer.sql`: add `jobs.tenancy_flag boolean default false`, `jobs.payer_user_id uuid` nullable with FK to `profiles(id)`, `jobs.is_rental_property boolean default false`. Edit `apps/web/app/api/jobs/route.ts` POST to accept these. Payment logic change in `apps/web/app/api/payments/create-intent/route.ts` — if `payer_user_id` is set, use that user's Stripe customer, else homeowner. UI: `apps/web/app/jobs/new/` add a "This is a rental property" step + "Who pays?" radio.                                                                                                                                     | New columns + backfill no-op   | Modified `POST /api/jobs` + `POST /api/payments/create-intent`.                                                                                                                                    | Landlord creates job tagged `is_rental_property=true, payer_user_id=self`; tenant sees job but Stripe intent bills landlord. Audit log captures payer change.                                | L    |

**Dependencies:** Stripe Connect treatment of multi-payer flows — verify platform mode allows a
payer ≠ job-creator (it does, but QA it).

**Out of scope:** Landlord billing for tenant-initiated jobs; cross-org contractor referrals.

**Risks:** Existing `property_team_members` + `property_tenants` tables already encode similar
relationships — make sure landlord-mode doesn't duplicate. Map out the "landlord owns property →
tenant initiates → landlord pays" triangle explicitly before coding. Org-role gate must apply to
every contractor-scoped endpoint; build the helper before touching UI.

---

### R7 Days 85–90 — "Referral & reputation" (6 days, scoped tight)

**Goal:** A homeowner can share a "£20 off for your neighbour" link pinned to their postcode; every
contractor profile shows a right-of-reply feed and a postcode-proof line.

| #   | Move                                   | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | DB                           | API                                                                                                                      | Acceptance                                                                                                                                                                                                          | Size |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 8   | £20 neighbour referral                 | Migration `20260512000001_neighbourhood_referrals.sql` creates `neighbourhood_referrals(id, referrer_user_id, referred_email, postcode_prefix text, code text unique, status text, first_job_id uuid, reward_applied_at, created_at)` with RLS. UI: homeowner dashboard card `apps/web/app/homeowner/dashboard/components/ReferralCard.tsx` + landing `apps/web/app/refer/[code]/page.tsx` geofenced to postcode. Credit application happens in `apps/web/app/api/payments/create-intent/route.ts` — check `neighbourhood_referrals` for redeemable code.  | New table + RLS              | New `POST /api/referrals/create`, `GET /api/referrals/[code]`, `POST /api/referrals/apply`.                              | Homeowner clicks "Refer neighbour", enters postcode, gets `mintenance.com/refer/AB12XY-7F3K` link. Neighbour from same postcode prefix clicks, signs up, books job — both get £20 credit after first job completes. | L    |
| 9   | Postcode-proof badge                   | Pure view — `apps/web/app/contractors/[id]/components/PostcodeProofLine.tsx`. Query: `SELECT COUNT(DISTINCT homeowner_id) FROM jobs WHERE contractor_id=? AND postcode LIKE ? AND completed_at > now()-interval '12 months'`. Mobile variant in `apps/mobile/src/screens/contractor-profile/`.                                                                                                                                                                                                                                                             | None                         | Modify `apps/web/app/api/contractors/[id]/route.ts` to return `postcode_proof_count` + `postcode_prefix`.                | Contractor profile shows "Hired by 3 households on M14 in the last 12 months" when hit-count ≥2; hidden when <2 (privacy).                                                                                          | S    |
| 11  | Dispute history on contractor profile  | Pure view — `apps/web/app/contractors/[id]/components/DisputeHistoryLine.tsx`. Query aggregates `disputes` against contractor's `against` column.                                                                                                                                                                                                                                                                                                                                                                                                          | None                         | Extend `apps/web/app/api/contractors/[id]/route.ts` — return `{resolved_count, unresolved_count, avg_resolution_hours}`. | Contractor profile shows "12 disputes, all resolved, avg 3 days" or "2 unresolved disputes".                                                                                                                        | S    |
| 19  | Right-of-reply (48h moderation window) | `reviews.response` already exists. Add `reviews.response_at timestamptz` + `reviews.response_published_at timestamptz` (48h delay) via migration `20260512000002_review_reply_moderation.sql`. UI: `apps/web/app/contractor/reviews/page.tsx` (new) + mobile `ReplyToReviewScreen.tsx`. Cron `apps/web/app/api/cron/publish-review-replies/route.ts` (hourly) flips `response_published_at` after 48h (admin can intervene). Modify `apps/web/app/api/contractors/[id]/reviews/route.ts` to SELECT+expose `response` when `response_published_at < now()`. | Two new columns on `reviews` | New `POST /api/reviews/[id]/reply` (contractor-only via `withApiHandler({ roles: ['contractor'] })`).                    | Contractor replies to a review; reply becomes public 48h later unless an admin intervenes (admin dashboard shows queue).                                                                                            | M    |

**Dependencies:** None blocking. 6 days is tight — task #22 (territory exclusivity), #23 (earnings
PDF), #12 (home file PDF), #24 (mentor programme) do **not** fit and are listed in §7 as post-R7.

**Out of scope:** Territory exclusivity pricing tier (#22); annual earnings statement (#23); home
file PDF (#12); mentor/referral contractor-side (#24).

**Risks:** 48h moderation queue needs admin tooling — without it, contractors will feel the delay is
arbitrary.

---

## Section 3 — Cross-cutting infrastructure

**1. NotificationService + preferences integration (R2 prerequisite).** Unblocks moves #2, #6, #7,
#16, #19, #21, #23. Single source of truth; everything routes through
`NotificationService.createNotification()`.

**2. Email template conventions.** Existing `apps/web/lib/email-templates/` is modular. Add
consistent `getUnsubscribeFooter(token)` call and template-test coverage for new templates
(cashflow-digest, annual-home-mot, post-job-nudge, referral-invitation).

**3. Retention dashboard metric queries.** Materialise into views rather than on-demand for
performance: `v_homeowner_retention_cohorts`, `v_contractor_gmv_retention`,
`v_escrow_loop_completion`, `v_silent_drop_rate`, `v_trust_incident_log`. Refresh via new cron
`apps/web/app/api/cron/refresh-retention-views/route.ts` nightly.

**4. Feature flags.** `apps/web/lib/feature-flags.ts` already exists. Add flags: `silver_mode_ui`,
`landlord_mode`, `home_health_subscription`, `credential_register_verification`,
`neighbourhood_referrals`, `review_reply`. Gate every new UI behind its flag so R7 rollback is a
config flip.

**5. 500-line pre-commit limit.** `NotificationService.ts` (277 today, will hit 500 with
preferences), `apps/web/app/api/contracts/[id]/accept/route.ts` (374 today) are near the limit.
Pre-split with facade pattern on day one of the touching sprint, per the commit `8fed54ed`
`EscrowAutoReleaseService` pattern.

---

## Section 4 — Items that are NOT primarily engineering

- **R4 Gas Safe / NICEIC / TrustMark partnerships.** Commercial contracts + API keys. 4-8 week
  procurement. Start Day 1 of R1; if not signed by Day 43, R4 falls back to admin-manual
  verification (plan B noted in R4).
- **R1 comparison table.** Legal needs to sign off that competitor fee claims are factual + citable.
- **R1 + R6 Protected Payment rename.** Legal + FCA review — Mintenance must not misrepresent the
  custody of client money. "Protected Payment" must match the terms in
  `apps/web/app/terms/page.tsx` + the signed `Mintenance-Escrow-Payment-Terms.docx`. FCA sees
  "escrow" as a regulated term; "Protected Payment" sidesteps that but the underlying structure must
  match the terms document.
- **R3 video production.** 2× 60-second learning cards need a voice-over artist + simple screen
  captures. Budget £500-1500 external. 2-week lead time.
- **R4 manual-verification fallback.** Admin ops need to staff a verification queue if APIs don't
  land.
- **R6 landlord-mode legal.** Rental-specific consumer protections in England/Wales differ — legal
  review on contract phrasing when landlord is payer and tenant is user.
- **R7 £20 referral credit finance sign-off.** Unit-economic model — at £20×2 per first-job, CAC
  must stay <£60 for this to pay back.
- **Named account manager (task #24, post-R7).** Hire, not code. Headcount: 1 FTE, ~£35k/yr.
- **Cold-outreach to churned contractor cohort.** Doc flags this — not in any sprint. Marketing/ops
  task. List generation is a one-off SQL snippet from `v_contractor_gmv_retention`.

---

## Section 5 — Sequencing / dependency graph

```
[R1] Copy rename (#1) ─────────────────────────────────────┐
     No-lead-fees (#15) ──────────────────────────────────┐│
     /trust page ─────────────────────────────────────────┤│
     Push telemetry confirm (#13) ─────┐                  ││
                                       │                  ││
[R2] NotificationService + prefs ──────┴─ unblocks ───┬──┐││
     Settings UI                                      │  │││
     Friday digest (#16) ─────────────────────────────┘  │││
     "Protects you too" onboarding (#21) ────────────────┘││
                                                           ││
[R3] Silver mode (#5) ────┬─────── requires copy tokens ───┘│
     Wizard (#5b)         │                                 │
     2nd-homeowner (#4) ──   requires new signatory table    │
     Learning cards (#20) ─┘                                 │
                                                             │
[R4] Gas Safe etc (#17) ── requires API contracts ──────────┘
     (if APIs not ready → admin-manual fallback)

[R5] Home Health (#2) ────┬─ needs R2 preferences for enrollment emails
     Annual MOT (#6) ─────┤  needs R2 preferences
     +90d nudge (#7) ─────┘  needs R2 preferences

[R6] Multi-user orgs (#18) ─┬─ needs org-role gate helper (built in this sprint)
     Landlord mode (#10) ───┘  payer logic touches payments module

[R7] Neighbour referral (#8)
     Postcode proof (#9)  ── independent
     Dispute history (#11) ── independent
     Right-of-reply (#19) ── needs 48h moderation cron
```

Critical-path observations:

- **R2 is the unblocker for half the downstream moves.** Ship preferences integration before R5.
- **R4 is the only sprint with an external blocker.** Procurement starts R1 Day 1.
- **R3's second-homeowner migration must preserve existing-contract behaviour** (legacy row-less
  contracts use old "both signed" path).
- **R6's org-role gate is reused by nothing in R7**, so it can land late in R6 without knock-on.

---

## Section 6 — Retention dashboard spec

Admin route: `apps/web/app/admin/retention/page.tsx` (+ `loading.tsx`, `error.tsx`, `types.ts`,
`components/{RetentionTab,MetricCard,CohortTable}.tsx`). Data from nightly-refreshed views.

### Q1. Homeowner cohort retention (W+13 / W+26 / W+52)

```sql
-- view: v_homeowner_retention_cohorts
WITH cohorts AS (
  SELECT id AS user_id, date_trunc('week', created_at) AS cohort_week
  FROM profiles WHERE role = 'homeowner' AND deleted_at IS NULL
),
activity AS (
  SELECT DISTINCT j.homeowner_id AS user_id, date_trunc('week', j.created_at) AS active_week
  FROM jobs j WHERE j.deleted_at IS NULL
)
SELECT
  c.cohort_week,
  COUNT(DISTINCT c.user_id) AS cohort_size,
  COUNT(DISTINCT CASE WHEN a.active_week = c.cohort_week + interval '13 weeks' THEN c.user_id END) AS w13,
  COUNT(DISTINCT CASE WHEN a.active_week = c.cohort_week + interval '26 weeks' THEN c.user_id END) AS w26,
  COUNT(DISTINCT CASE WHEN a.active_week = c.cohort_week + interval '52 weeks' THEN c.user_id END) AS w52
FROM cohorts c LEFT JOIN activity a USING (user_id)
GROUP BY c.cohort_week ORDER BY c.cohort_week DESC;
```

### Q2. Contractor GMV retention (M+12)

```sql
-- view: v_contractor_gmv_retention
WITH monthly_gmv AS (
  SELECT contractor_id, date_trunc('month', completed_at) AS month,
         SUM(amount) AS gmv
  FROM contracts WHERE status = 'accepted' AND completed_at IS NOT NULL
  GROUP BY 1,2
)
SELECT
  m0.contractor_id, m0.month AS m0_month, m0.gmv AS m0_gmv,
  m12.gmv AS m12_gmv,
  ROUND(100.0 * COALESCE(m12.gmv, 0) / NULLIF(m0.gmv, 0), 1) AS retention_pct
FROM monthly_gmv m0
LEFT JOIN monthly_gmv m12 ON m12.contractor_id = m0.contractor_id
                         AND m12.month = m0.month + interval '12 months'
WHERE m0.month <= date_trunc('month', now()) - interval '12 months'
ORDER BY m0.month DESC;
```

### Q3. Loop completion — % funded escrow → released within 14 days

```sql
-- view: v_escrow_loop_completion
SELECT
  date_trunc('week', funded_at) AS week,
  COUNT(*) FILTER (WHERE released_at IS NOT NULL
                    AND released_at <= funded_at + interval '14 days') * 100.0
    / NULLIF(COUNT(*), 0) AS pct_released_within_14d,
  COUNT(*) AS funded_count
FROM escrow_transactions
WHERE status IN ('held','completed','released')
  AND funded_at IS NOT NULL
GROUP BY 1 ORDER BY 1 DESC;
```

### Q4. Silent-drop rate per canonical event

```sql
-- view: v_silent_drop_rate
-- "Silent drop" = event happened, notification should have fired, but no row in notifications.
-- Per-event expected count comes from a new canonical_events table that every
-- state transition writes to — pairs with the R2 NotificationService integration.
SELECT
  e.event_type,
  COUNT(e.*) AS event_count,
  COUNT(n.id) AS notification_count,
  COUNT(e.*) - COUNT(n.id) AS silent_drops,
  ROUND(100.0 * (COUNT(e.*) - COUNT(n.id)) / NULLIF(COUNT(e.*), 0), 2) AS silent_drop_pct
FROM canonical_events e
LEFT JOIN notifications n ON n.metadata->>'event_id' = e.id::text
WHERE e.created_at > now() - interval '7 days'
GROUP BY e.event_type ORDER BY silent_drop_pct DESC;
```

### Q5. Trust incident log

```sql
-- view: v_trust_incident_log
SELECT
  d.id, d.created_at, d.status, d.resolution, d.resolved_at,
  j.title AS job_title,
  EXTRACT(EPOCH FROM (d.resolved_at - d.created_at))/3600 AS resolution_hours,
  rb.first_name || ' ' || rb.last_name AS raised_by_name,
  ag.first_name || ' ' || ag.last_name AS against_name
FROM disputes d
LEFT JOIN jobs j ON j.id = d.job_id
LEFT JOIN profiles rb ON rb.id = d.raised_by
LEFT JOIN profiles ag ON ag.id = d.against
WHERE d.created_at > now() - interval '90 days'
ORDER BY d.created_at DESC;
```

All 5 render in tabs under `/admin/retention`.

---

## Section 7 — Honest priority reco

If only 5 ship, ship these (ranked):

1. **R2: NotificationService + preferences integration.** Unblocks half the downstream work and
   closes today's latent bug (`user_notification_preferences` exists but is ignored). Without this,
   weekly digests / MOT / nudge all ship half-broken. **2 weeks.**
2. **R1: Copy rename + No-lead-fees + /trust.** Cheap, directly attacks the "no-one trusts us" gap
   the PDF names as the core blocker. All three move perception in one sprint. **2 weeks.**
3. **R5 Home Health subscription (#2).** Converts one-off transactions into recurring revenue;
   schema is already there. Highest leverage per engineering-day. **1.5 weeks** (because schema +
   cron + Stripe plumbing already exist).
4. **R6 Multi-user contractor orgs (#18).** The PDF calls "Team-of-five Tina" the highest-GMV
   segment and the schema is already there. Unlocks the long-tail of serious trade businesses. **2
   weeks.**
5. **R7 Right-of-reply + dispute history + postcode proof (#19, #11, #9).** Three cheap
   profile-level moves that fix the #1 trust complaint (asymmetric power between contractor reviews
   and contractor voice). Combined: **1 week.**

Total: ~8.5 weeks — fits in the 90 days comfortably, leaves ~2 weeks buffer.

Explicit deprioritisations with reasoning:

- **#17 Gas Safe integration** is high-value but externally-blocked; budget for procurement + manual
  fallback.
- **#5 Silver mode** is product-visible but low-incremental — the 65+ segment already uses iOS
  Dynamic Type; spend the week on the wizard + Annual MOT email instead.
- **#8 Referral** is high-excitement-low-data — ship after you have a retention baseline to measure
  it against.
- **#22 Territory exclusivity** is a monetisation lever, not a retention lever — out of PDF scope
  for 90 days.

---

## Critical files for implementation (quick index)

- [`apps/web/lib/services/notifications/NotificationService.ts`](../apps/web/lib/services/notifications/NotificationService.ts)
  — facade split + preferences wiring (R2 keystone)
- [`apps/web/app/api/contracts/[id]/accept/route.ts`](../apps/web/app/api/contracts/[id]/accept/route.ts)
  — second-homeowner gate (R3 #4)
- [`apps/web/app/for-contractors/page.tsx`](../apps/web/app/for-contractors/page.tsx) — comparison
  table + no-lead-fees (R1 #15)
- [`apps/web/lib/cron-handler.ts`](../apps/web/lib/cron-handler.ts) — pattern all new crons follow
  (R2/R5/R7)
- [`apps/web/app/api/contractors/[id]/reviews/route.ts`](../apps/web/app/api/contractors/[id]/reviews/route.ts)
  — right-of-reply + expose `reviews.response` (R7 #19)
- [`apps/mobile/src/theme/index.ts`](../apps/mobile/src/theme/index.ts) — Silver-mode theme
  extension (R3 #5a)
- [`apps/web/lib/services/subscription/HomeownerSubscriptionService.ts`](../apps/web/lib/services/subscription/HomeownerSubscriptionService.ts)
  — Home Health extension (R5 #2)

## Open questions for leadership (from the PDF, §8.3)

1. Are we willing to segment product experience by age? (Silver-mode UX is a defensible choice only
   if we are.)
2. Do we commit to "no lead fees, ever" as a permanent positioning, or is that a launch tactic?
3. Is the landlord / letting-agent segment in scope for 2026, or is it a 2027 product?
4. Who owns the retention dashboard on a week-by-week basis — product, growth, or the CEO?

Leadership decisions on these four questions determine whether R3, R4-as-is, R6, and §6 dashboard
respectively are committed scope or optional.
