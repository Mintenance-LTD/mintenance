# CLAUDE MANDATORY DEVELOPMENT CONTRACT (MDC) - MINTENANCE CODEBASE

## CODE QUALITY AUDIT (Last audited: 2026-06-06, mobile backend schema-alignment audit)

**Current State: A grade (~88/100)** — up from A-/B+ ~85/100 on 2026-05-23. The 2026-05-25 →
2026-05-27 session ran a full-stack user-flow audit (4 parallel sub-agents covering web HO + web
contractor + mobile HO + mobile contractor; ~30 live-DB SQL queries via Supabase MCP) and then
shipped 12 fixes across 4 P0s, 5 P1s, 4 P2s, plus a P0-4 recovery commit (parallel-agent stash
interleaving displaced the original P0-4 hash). 9 separate audit findings were retracted as false
alarms on closer inspection — every retraction now has a paper trail in the section below. See
"2026-05-27 — full-stack flow audit remediation" for the full report. The 2026-06-06 session then
ran a mobile backend schema-alignment audit (live Postgres error logs + `information_schema`
cross-check), shipped 5 commits, applied 2 live migrations, and deleted ~45 files of orphaned dead
code — see "2026-06-06" immediately below.

### 2026-06-06 — mobile backend schema-alignment audit + dead-code removal

**Scope:** Audited the mobile app's backend (web API routes it calls + its direct-Supabase reads)
for places where code queries tables/columns that do not exist in the live schema, causing silent
failures (`|| []` fallbacks hide the error, so screens render empty/zero rather than throwing). The
highest-signal technique was reading the **live Postgres error log** (Supabase MCP `get_logs`) and
cross-checking every flagged query against `information_schema`. 3 parallel verifier agents mapped
the surfaces; every high-severity finding was independently re-verified against the live schema
before any change (zero-false-claims). Branch `claude/full-stack-audit-JrhaX`.

**Shipped (5 commits, all pushed; `tsc --noEmit` clean both apps):**

| Commit      | Subject                                                                        |
| ----------- | ------------------------------------------------------------------------------ |
| `eb29c3497` | `fix(backend)` align reviews/bids/payments/profiles/messages queries w/ schema |
| `8e3684929` | `fix(api)` job-detail homeowner card + refund 500 + bid-withdraw name          |
| `11abd6419` | `feat(mobile)` live time-tracking timer + shareable reports                    |
| `b3cba57ee` | `feat(db)` add bids.rejection_reason + quote template tables (live migrations) |
| `49dfc5348` | `refactor(mobile)` delete orphaned business-suite dead code (~45 files)        |

**Recurring live errors fixed (verified in `get_logs` before + schema after):**

- `reviews.contractor_id does not exist` — the table keys the reviewed contractor via `reviewee_id`.
  The wrong column was independently re-written in **10** files (TrustScore, AutoVerification,
  BidAcceptance, DisputeResolution, daily-rundown, profile-data, customers, user+gdpr export-data).
  All quietly returned 0 reviews / 0 rating via fallbacks. Added canonical
  `getContractorRatingStats()` (`apps/web/lib/services/reviews/contractor-rating.ts`) so the column
  name lives in one place and can't regress per-file.
- `bids.bid_amount does not exist` → `amount`; `payments.contractor_id does not exist` → `payee_id`
  (contractor reporting + profile pages were 500-ing).
- `profiles.is_public does not exist` (most frequent error — crawler-driven sitemap) → dropped the
  filter; `profiles.full_name` (bid-withdraw notification) → build from `first_name`/`last_name`.
- `escrow_transactions.stripe_payment_intent_id does not exist` → only `payment_intent_id` exists.
  This made **every refund 500** (`/api/payments/refund`, mobile `EscrowService.refundPayment`).
- `messages.recipient_id`/`read_at` → `receiver_id`/`read`; `escrow.contractor_id` → `payee_id`
  (contractor daily-rundown).
- `contractor_profiles.specializations does not exist` → re-sourced market-insights competition
  count from `profiles.skills`.
- `GET /api/jobs/[id]` never joined the homeowner profile, so the mobile JobDetails "Posted by" card
  (guarded on `job.homeowner`) silently never rendered. Added the join.

**Live DB migrations applied via Supabase MCP (2, verified post-apply; advisor shows no new
warnings; local files committed under `supabase/migrations/`):**

- `20260606120000_add_bids_rejection_reason` — the reject + unreject bid routes already wrote
  `bids.rejection_reason` but the column never existed, so reject-with-reason and every undo-reject
  threw. Added the nullable column; **zero route-code change** needed.
- `20260606120100_create_quote_templates` — created `quote_templates` + `quote_line_item_templates`
  (owner-scoped RLS) that `/api/contractor/quote-templates` + mobile `TemplateCRUD` always queried
  but were never created (saved-template feature 500'd). Columns mirror exactly what the route
  reads/writes.

**Features shipped (no migration needed):**

- Live time-tracking timer (`TimeTrackingScreen`): Start creates a `running`
  `contractor_time_entries` row, a ticking HH:MM:SS clock anchors off the persisted entry (survives
  remount), Stop finalises the duration. The status CHECK already allowed `'running'`; POST route
  now accepts `status` (defaults `'stopped'`).
- Reporting export (`ReportingScreen`): the "Export to PDF" stub now builds a text report and opens
  the OS share sheet via RN's built-in `Share` (works in the shipped binary; a true PDF would need
  `expo-print` + an EAS rebuild).

**Dead code deleted (~45 files, mobile `tsc` clean after):** the Client CRM, Marketing,
Sustainability/ESG and BusinessDashboard service/component/hook layers were orphaned — **no screen
mounted any of them** (verified by import-graph trace) and they queried ~12 tables that do not exist
in the live DB (`client_segments`, `marketing_*`, `sustainability_metrics`, `green_certifications`,
`sustainable_materials`, `contractor_esg_scores`, …). Removed
`services/{client-management, marketing-management,sustainability}`, `SustainabilityEngine`,
`BusinessAnalyticsService`, `hooks/{business-suite,useSustainability}`, `useBusinessSuite`, both
`BusinessDashboard` components (+ their tests). `ContractorBusinessSuite` is slimmed to its only
live arm — the **finance** facade (`FinanceDashboardScreen` via `useFinanceDashboard` + the invoice
screens), which is untouched. This also resolved the "deferred missing-table" question: those ~12
tables were only needed by the deleted code, so there is no remaining orphaned-table debt. **Note
for the parallel coverage effort:** the deletion removed ~12 test files that session had written for
the now-deleted modules — a concrete case of coverage being added to code that should be deleted.

**Verification posture:** every column/table claim checked against live project
`ukrjudtlvapiajkjbcrd`; `tsc --noEmit` clean on both apps for all edits + after the deletion; both
migrations verified present + RLS-correct via live queries; security advisor unchanged (only the
pre-existing spatial_ref_sys / extension-in-public / SECURITY DEFINER / Postgres-version warnings).
**Not runtime-tested:** the two mobile features (live timer, Share export) were verified by types +
logic only and need an on-device smoke test before an EAS release; the refund fix should get one
real refund run on staging.

### 2026-05-27 — full-stack flow audit remediation

**Scope:** Audited every user flow on web + mobile for both homeowners and contractors, from account
creation through to account deletion, against live Supabase project `ukrjudtlvapiajkjbcrd`. 4
parallel Explore agents mapped the surfaces; the synthesis raised 5 P0s, 10 P1s, 11 P2s, 4 P3s, and
7 false-alarm retractions on the original audit. This session worked the punch list top-down and
shipped 12 commits + 4 live DB migrations on branch `feat/tiered-pricing`.

**Shipped commits (chronological):**

| #   | Commit      | Subject                                                                                                     |
| --- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | `5f28ed657` | P0-1 — contractor payout discoverability banner + stuck-escrow retry endpoint                               |
| 2   | `2f6e8b167` | P0-3 — Start Job CTA reachable on return visit (web + mobile)                                               |
| 3   | `8339c6820` | P0-2 — homeowner web onboarding wizard (3-step, mirrors mobile)                                             |
| 4   | `b0bb797b0` | P1-5 — `wouldRecommend` on mobile review submission                                                         |
| 5   | `8443cf10c` | P1-1 + P1-2 + P1-6 — escrow currency + active-escrow uniqueness + job lifecycle timestamps (live migration) |
| 6   | `613c48c95` | P1-10 — preserve UK compliance records on user delete (live migration)                                      |
| 7   | `5266aa6b1` | P0-4 (recovery) — mobile e-signature capture + `contract_signatures` audit table (live migration)           |
| 8   | `1cd3d692c` | P1-3 — wire both subscription checkouts to the shared client                                                |
| 9   | `be0d4dd31` | P2-9 — remove orphan PerformanceDashboard screen                                                            |
| 10  | `2a078dcac` | P2-4 — 7-day auto-release countdown banner on homeowner photo review                                        |
| 11  | `3bf8d0403` | P2-10 — revoke anon EXECUTE on idempotency SECURITY DEFINER fns (live migration)                            |
| 12  | `6213e5c54` | P2-8 — guard client-side phone-verification bypass on NODE_ENV                                              |

**Live DB migrations applied via Supabase MCP this session (4 total, all verified post-apply):**

- `20260527090000_contract_signatures_audit` — new immutable audit table for e-signatures. UNIQUE
  (contract_id, signer_role); RLS gates parties + admin SELECT, signer-own INSERT (matching contract
  party only); no UPDATE/DELETE policies outside service_role.
- `20260527150000_escrow_currency_jobs_lifecycle_timestamps` — adds
  `escrow_transactions.currency NOT NULL DEFAULT 'gbp' CHECK (currency='gbp')`,
  `uq_escrow_active_per_job (job_id) WHERE status IN ('pending','held','release_pending')` partial
  unique index, `jobs.assigned_at` + `jobs.started_at`, and `CREATE OR REPLACE` on
  `accept_bid_atomic` to stamp `assigned_at = COALESCE(..., NOW())` on the same UPDATE that flips
  status to assigned. Backfilled `assigned_at = updated_at` for 9 existing assigned/in_progress/
  completed rows; `started_at` intentionally left NULL (no historical event).
- `20260527160000_compliance_retention_on_user_delete` — drops NOT NULL + flips ON DELETE CASCADE →
  ON DELETE SET NULL on 5 FKs: `compliance_certificates.owner_id`,
  `contractor_certifications.contractor_id`, `contractor_dbs_checks.contractor_id`,
  `contractor_insurance.contractor_id`, `contractor_licenses.contractor_id`. UK retention statute
  citations on each column COMMENT. Pairs with `delete_user_data` RPC which ends with
  `DELETE FROM profiles` — the CASCADE used to atomically wipe gas-safety / EICR / DBS / ELI records
  mid-GDPR-erasure.
- `20260527170000_lock_down_idempotency_security_definer` — REVOKE EXECUTE on anon for
  `complete_idempotency_claim`, `release_idempotency_claim`, `try_claim_idempotency_key` (both
  overloads). The functions accept an arbitrary `p_user_id` so anon EXECUTE let any client poison
  another user's idempotency cache by claiming the next-request key first. Authenticated EXECUTE
  preserved because all production callers are auth-gated.

**Recovery / process incident:**

`07602bdf8` was the original P0-4 commit hash, captured in the reflog at HEAD@{5}. Parallel-agent
work on audit-57 + 58 (which landed concurrently in this workspace's working tree) interacted badly
with lint-staged's backup-stash + restore mechanism — the staged P0-4 contents were displaced and
the commit hash ended up on a non-linear ref pointing at audit-57's properties diff. Recovered as
`5266aa6b1` "fix(recovery)" containing the actual signature work (SignatureCanvas,
ContractSignatureService, ContractViewScreen modal wiring, accept-route schema extension, and the
contract_signatures migration). The migration was already applied to live so the recovery brought
the repo back in sync with the DB. Going forward: `git show --stat <hash>` after every commit to
confirm the right files landed.

**False-alarm retractions (9 audit findings cleared without code change):**

| Finding                                  | Status                         | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-5a homeowner notify on after-photo    | already wired                  | `apps/web/app/api/jobs/[id]/photos/after/route.ts:425-432` fires `NotificationService.createNotification` + `EmailService.sendJobCompletedEmail`                                                                                                                                                                                                                                                                                                           |
| P0-5b contractor leaves homeowner review | already wired                  | `apps/mobile/src/screens/job-details/JobDetailsCTA.tsx:381-399` "Leave a Review" CTA added 2026-05-24 (audit-27 P1)                                                                                                                                                                                                                                                                                                                                        |
| P1-4 losing bids don't persist           | already wired                  | `accept_bid_atomic` RPC body lines 64-66 already UPDATE all other bids on the job to status='rejected'. Live shows 0 rejected only because every job in the dataset has exactly 1 bid (no losers existed).                                                                                                                                                                                                                                                 |
| P1-7 `admin_activity_log = 0 in 30d`     | works, no traffic              | Live shows 4 historical rows (oldest 2025-11-09, newest 2026-03-30, 4 distinct action types). logActivity wrapper option + 4 routes wired. Empty 30-day window reflects 1 admin user not acting recently, not a wiring gap.                                                                                                                                                                                                                                |
| P1-9 3 mobile job-posting screens        | each has a distinct entry path | JobPostingScreen (full form, "Post Job" CTA), QuickJobPostScreen (modal-driven from QuickJobModal search), JobEditScreen (PATCH-mode edit of existing job). No consolidation needed.                                                                                                                                                                                                                                                                       |
| P2-1 `contractor_profiles` orphan        | NOT orphan                     | `apps/web/lib/services/stripe-webhook/invoice-handlers.ts:179` does `.from('contractor_profiles').update(...)` + `.upsert` at lines 54/150. Plus reads from matching, revenue analytics, mobile contractor service. Escalates to real refactor — `FeeCalculationService.resolveContractorTier` reads from `contractor_subscriptions` (not this table), but Stripe subscription webhooks still write to it. Dropping silently breaks the subscription flow. |
| P2-2 after-photo response shape          | already correct                | Server returns `jobCompleted: boolean` in body; mobile consumes via `JobPhotoUploadScreen.tsx:241` (audit-39 P1, 2026-05-24)                                                                                                                                                                                                                                                                                                                               |
| P2-5 5 "Coming Soon" stub pages          | intentional fallback UX        | `/contractor/resources, /connections, /social, /video-calls` all use shared `<ComingSoonPlaceholder>`, sidebar entries already removed, `robots: noindex,nofollow`. Direct-URL fallback for stale bookmarks; pages exist by design.                                                                                                                                                                                                                        |
| P2-9 5 orphan mobile screens             | 4 of 5 wired                   | PropertyAssessment → ProfileAccountNavigator, ServiceRequest → ModalNavigator+deepLinking+hooks, MeetingDetails → ModalNavigator, ServiceAreas → BusinessNavigator + onboarding gate. Only PerformanceDashboard was a real orphan (deleted in commit `be0d4dd31`).                                                                                                                                                                                         |
| P2-11 welcome-message insert fragility   | already hardened               | `accept/route.ts:443-448` has `messageError` error path with `logger.error` capture. The "fragility comment" was prescriptive, not a bug.                                                                                                                                                                                                                                                                                                                  |
| P2-7 BeforeAfterSlider aspect ratios     | correct UX                     | Both web + mobile use `cover` crop to render mismatched aspect-ratio photos at the same viewport size for direct comparison. Intended behaviour.                                                                                                                                                                                                                                                                                                           |

**Discovered while working (latent issues for follow-up):**

- **`escrow_transactions.auto_approval_date` NULL across all completed rows.** The
  `/api/cron/escrow-auto-release` cron filters on this column, so the 7-day auto-release safety net
  never actually fires. The P2-4 countdown banner makes the UX honest from the homeowner's side
  regardless, and the P0-1 stuck-escrow retry endpoint handles the operator-reset cases. But the
  cron itself needs `auto_approval_date` stamped somewhere upstream — likely in the
  `confirm-completion` route or photos/after auto-complete path. Separate follow-up.

- **`contractor_profiles` table is redundant with `profiles` but actively written by Stripe
  webhooks.** Two paths to fix: (a) migrate the 6 read paths + 3 webhook write paths to read/write
  `profiles` instead, then drop the table; or (b) keep both in sync via trigger. (a) is the right
  long-term call.

**Verification posture for this session:**

- Every commit `tsc --noEmit` clean across `apps/web` and `apps/mobile` (excluding the pre-existing
  `properties/route.ts` baseline error that predates this work).
- Every live DB migration verified post-apply via Supabase MCP `execute_sql` (FK rules, ACLs, column
  nullability, index presence, row counts).
- Preview server smoke-tested for P0-2 (homeowner onboarding wizard route + auth gate).
- E2E happy-path smoke deferred for most surfaces — local dev env blocks on `sk_live_` Stripe key
  validation. Recommend running through staging before next prod ship.

**Remaining audit punch list (open):**

- **P1-8** mobile escrow funding via Stripe RN SDK — needs new native dep + EAS rebuild (~half-day).
  Currently homeowner redirects to web to fund escrow; ~25-40% drop-off risk on the cross-device
  handoff.
- **P2-3** homeowner analytics dashboard — real feature, day+; needs product brief
- **P2-6** mobile Team/org/Lead-recs UIs — real feature work, day+; needs product brief
- **P2-1 (escalated)** migrate Stripe webhook writes off `contractor_profiles`, then drop the table
  — real refactor, day+

### 2026-05-23 — tiered-pricing rollout + tech-debt categorisation

**Branch `feat/tiered-pricing` (9 commits), ready to merge.** Closes the gap between landing-page
tier claims and code reality. Every advertised feature on the pricing page now maps to enforced
code; the £50 platform-fee cap is gone; tier-aware fees (12/8/5%) ship via
`FeeCalculationService.resolveContractorTier`.

**Shipped:**

| Sprint | Commit      | What                                                                                                                                                                                                                                                                                        |
| ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1      | `05ad2c464` | Landing copy + config alignment — fees 15/10/7% → 12/8/5%; bid-limit Pro `'unlimited'`; new `CONTRACTOR_ACTIVE_JOBS_LIMIT` (3/3/∞/∞); dropped 6 unbuildable features (social feed, custom branding, white-label invoicing, dedicated CSM, marketing-tool satellites, video-call recording). |
| 2      | `fa585876d` | Tier-aware fees wired via migration `20260522120000_tier_aware_platform_fees`; `FeeCalculationService.calculateFees({ contractorTier })`; `resolveContractorTier()` helper; £50 max-fee cap removed; active-jobs cap enforced at bid-accept.                                                |
| 3      | `097e5b023` | Featured search ranking weight (Pro +5 / Business +10 on `overallScore`); support SLA matrix (48/24/4h) via migration `20260522130000_support_ticket_sla`; lead-recommendations digest gated to Pro+.                                                                                       |
| 4      | `103468540` | Tier gates on 3 homeowner premium endpoints: recurring maintenance (Landlord+), tenant reporting tokens (Landlord+), property team invites (Agency-only).                                                                                                                                   |
| 2.1    | `9094fb31d` | Mobile `featureAccess.test.ts` rewrite (1075→564 lines) — old suite mocked `supabase.from` but impl moved to `mobileApiClient` 2026-05-01. **Fixed a real prod bug**: tier mapping didn't handle `'professional'` (only `'pro'                                                              | 'business'`), so every Pro subscriber on mobile was silently being treated as Basic. |
| 5      | `522d665ef` | Year-over-year analytics: `/api/agency/analytics/yoy` route + `/landlord/analytics/year-over-year` page; Agency-only via `HOMEOWNER_YOY_COMPARISON` gate.                                                                                                                                   |
| 5.1    | `870ec39c7` | Contractor team-seat gate added to `POST /api/organizations/[id]/invite` — Business-tier + 10-seat cap (active memberships + non-revoked pending invites).                                                                                                                                  |
| 5.2    | `5e052e75e` | `/admin/pricing-metrics` dashboard for post-merge observability. 7 indicators: tier distribution, fee revenue by tier, active-jobs cap pressure, sub movement, SLA breaches, early-access cohort.                                                                                           |
| —      | `7c8274564` | Tech-debt: typed 2 navigation prop casts (was `(navigation as any)`).                                                                                                                                                                                                                       |

**DB migrations applied via Supabase MCP this session (7 total):**

- `tier_aware_platform_fees` — `subscription_features.platform_fee_rate NUMERIC(5,4)` + seed
  (0.12/0.12/0.08/0.05); fixed stale `max_active_jobs` (1→3 free/basic).
- `support_ticket_sla` — `support_tickets.sla_hours` + `sla_tier` columns + index.
- `job_checklists`, `job_tips`, `insurance_reminder_tracking`, `dbs_reminder_tracking`,
  `job_storage_bucket_constraints` — **5 long-pending migrations that had been written but never
  applied to live**. Production code in `/api/jobs/[id]/tip` and the homeowner-checklist UI
  referenced tables that didn't exist; the routes would have crashed on first use. Direction of
  drift was opposite to what CLAUDE.md previously claimed (it said 15 live-only; actual was 0
  live-only + 6 local-only).

**Tech-debt categorisation findings (correcting prior inflated numbers):**

- **Mobile `any` types**: claimed `1,602`; actual production source has **14 files**, of which 6 are
  false positives (the word "any" in JSDoc prose matched a regex), 6 are already `eslint-disable`'d
  for legitimate platform-type gaps, and 2 were fixable (both fixed this session in commit
  `7c8274564`). Net actionable count = **0** today.
- **Mobile `console.*`**: claimed `82`; actual is `82` raw but **0 actionable** — 65 in test files
  (testing logger behaviour), 11 in `logger.ts` itself (the logger is the wrapper), 5 in
  error-capture infra intentionally hooking `console.error` to Sentry, 1 false positive (prose
  comment).
- **Migration drift**: claimed `15-migration drift between repo and live`; actual is
  `0 live-only + 6 local-only`. 5 applied this session; 6th (`move_vector_to_extensions`) is
  intentionally deferred to a maintenance window per its own runbook.

**Net effect**: the three tech-debt "scare numbers" (1602 / 82 / 15) collapse to (0 / 0 / 0)
actionable items after categorisation. The mobile `featureAccess` rewrite ALSO uncovered a real prod
bug (Pro tier mapping wrong) that has been silently degrading Pro subscribers for ~3 weeks since the
2026-05-01 `mobileApiClient` migration. CLAUDE.md narrative + Section 2 hard-limits table updated in
same edit pass.

**Remaining `feat/tiered-pricing` work**: merge the PR. Branch is ready.

### 2026-05-10 — In-session remediation (24 fixes shipped + 5 retractions)

### 2026-05-10 — In-session remediation (24 fixes shipped + 5 retractions)

Two-phase full-stack audit (Phase 1 inventory + Phase 2 a–f functional walkthrough) followed by
direct code remediation on branch `claude/happy-northcutt-a91d8e`. Numbered references below
(`P0.x`, `P1.x`, etc.) are the consolidated fix-list IDs from this session.

**Shipped (24, all `tsc --noEmit` clean):**

| #     | Area          | Fix                                                                                                                                                                                                                                                |
| ----- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0.1  | Auth          | Phone-verification env-var bypass — `NODE_ENV !== 'production'` guard added so `SKIP_PHONE_VERIFICATION` cannot disable the gate in prod.                                                                                                          |
| P0.2  | Payments      | Deleted four undeployed edge fns (`create-payment-intent`, `process-refund`, `refund-escrow-payment`, `release-escrow-payment`) — all hardcoded `currency: 'usd'`, would mis-currency every payment if invoked.                                    |
| P0.3  | CI            | New `scripts/ci/check-edge-fn-currency.js` + husky pre-commit + `npm run audit:edge-fn-currency` blocks any future non-GBP currency under `supabase/functions/`.                                                                                   |
| P1.1  | Payments      | `/api/payments/session-status` now gates on `session.metadata.userId === user.id` — closes cross-tenant Stripe metadata leak (admins still bypass for support).                                                                                    |
| P1.2  | Lifecycle     | `request-changes` route now resets `completion_confirmed_by_homeowner=false` — auto-release timer can't fire after a rollback.                                                                                                                     |
| P1.3  | Admin         | MFA step-up on 6 bulk-export GETs (`users/export`, `revenue/export`, `tax/download-1099`, `audit-logs`, `users/[userId]/detail`, `security-dashboard` GET).                                                                                        |
| P1.4  | Admin         | `withApiHandler` `logActivity` option + 3 high-impact routes wired (`escrow/approve`, `escrow/reject`, `maintenance/rotate-totp-secrets`). 19 mutating admin routes still need migration; pattern is now mechanical.                               |
| P1.6  | Mobile        | `<PushPermissionRecoveryBanner>` component + mounted on `HomeownerDashboard` to recover the cohort whose iOS one-shot dialog was burned pre-2026-04-19.                                                                                            |
| P2.1  | Payments      | Stripe API version pinned across `lib/stripe.ts` (was 3 different versions: `2025-01-27.acacia`, `2024-04-10`, `2023-10-16`). `EscrowAutoReleaseService` now imports the central `stripe` proxy; `setup-contractor-payout` Deno fn version-bumped. |
| P2.7  | Lifecycle     | Explicit `roles: ['contractor', 'admin']` on `/api/jobs/[id]/photos/after`.                                                                                                                                                                        |
| P2.8  | Lifecycle     | Explicit `roles: ['homeowner', 'admin']` on `/api/jobs/[id]/bids/[bidId]/accept`.                                                                                                                                                                  |
| P2.10 | Notifications | `markEmailSent` flag wired on 4 of 5 lifecycle email sends (`request-changes`, `bid-acceptance` helper, `confirm-completion`, `photos/after`). `contracts/[id]/accept`'s 3 sends deferred for incremental adoption.                                |
| P2.11 | Admin         | `/api/admin/audit-logs` now uses `sanitize-postgrest` helper — closes filter-injection vector via `,` in `search` query param.                                                                                                                     |
| P2.12 | Architecture  | New `withApiHandler` `logActivity?` config option — declarative `admin_activity_log` writes that fire only on 2xx success, lazy-import `AdminActivityLogger`.                                                                                      |
| P2.20 | UX            | New `<ComingSoonPlaceholder>` shared component — 3 of 4 contractor placeholder pages migrated; `/video-calls` left bespoke (different homeowner-card layout).                                                                                      |
| P2.21 | UX            | Web `BeforeAfterSlider` deduped — `app/jobs/[id]/components/BeforeAfterSlider.tsx` deleted; `HomeownerPhotoReview.tsx` now imports `@/components/ui/BeforeAfterSlider`.                                                                            |
| P2.22 | Mobile        | `STRIPE_PUBLISHABLE_KEY` mobile reads deduped — `environment.secure.ts` now sources from canonical `getStripeConfig()`.                                                                                                                            |
| P2.27 | Architecture  | New `RATE_LIMIT_TIERS.{STRICT, STANDARD, FREQUENT, ENROLLMENT}` constants + 4 outliers migrated. 63 admin routes can adopt incrementally.                                                                                                          |
| P3.2  | Email         | `/confirm-completion` email amount no longer divides by 100 — was rendering £350 as £3.50.                                                                                                                                                         |
| P3.3  | Webhook       | Stripe webhook rate limit tightened from 1000 → 200 req/min/IP.                                                                                                                                                                                    |
| P3.6  | Admin         | `/api/admin/migrations/apply-combined` is now a thin proxy to `/api/admin/migrations/apply` with the hardcoded filename — single source of truth for security gates.                                                                               |
| P3.7  | Admin         | `/api/admin/revenue/export` enforces `MAX_EXPORT_RANGE_DAYS = 366` + invalid-date / inverted-range guards.                                                                                                                                         |

**Retractions / corrections (5 stale findings cleared):**

| #     | Original claim                                                                    | Reality                                                                                                                                                                                             |
| ----- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2.17 | "Consolidate `/login` ↔ `/auth/login` etc."                                       | Already done — duplicate URLs are 8-line `redirect()` stubs to canonical pages.                                                                                                                     |
| P2.18 | "Consolidate 3 payment-method pages"                                              | Same — `/payment-methods` redirects to `/settings/payment-methods`; `/account/payment-methods` does not exist.                                                                                      |
| P2.19 | "Resolve `/homeowner/subscription` ↔ `/homeowner/subscriptions/home-health` typo" | Different valid routes; not a typo.                                                                                                                                                                 |
| P3.8  | "/resources is a stub"                                                            | Fully built (`<ResourcesClient />` with 7 component files: hero, categories, featured items, metrics, tips, CTA).                                                                                   |
| P3.9  | "PM/owner audit of partial-build screens"                                         | `/contractor/{team,tools,insurance}` are fully built and feature-complete (org members + invite, Tremor charts inventory, full insurance CRUD). Large LOC reflects feature completeness, not stubs. |

**Diagnostic-only items closed:**

| #     | Finding                                                                                                                                                                                                                                                                     |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P3.5  | `PostJobWizardScreen` is NOT divergent from `JobPostingScreen` — same `validateJobDraft` from `@mintenance/api-contracts`, same `POST /api/jobs`. Wizard is intentionally simpler for the silver-mode (65+) audience.                                                       |
| P3.16 | Properties use **hard-delete** by design — no `deleted_at` column. FK behaviour: `jobs.property_id` + `agency_activity_log.property_id` → `SET NULL`; all other dependents (`compliance_certificates`, `property_tenants`, `anonymous_reports`, `units`, etc.) → `CASCADE`. |

**New finding raised (P2.28):** UK landlords must retain gas safety certs ≥ 2 yr and EICRs ≥ 5 yr.
The `compliance_certificates.property_id` FK is `ON DELETE CASCADE`, so a property hard-delete wipes
legally-mandated retention records. Same concern for `property_tenants` and `anonymous_reports`. Fix
is either a DB migration to `ON DELETE SET NULL` (with nullable `property_id`) or an
application-layer guard rejecting property delete when active certs/tenants exist.

**Standing P0/P1 items (still pending — non-code or larger):**

- **P0.4** — ship current `main` to mobile EAS / app stores. Contains 2026-04-28 push-soft-ask
  reorder + 2026-05-01 location-section gate widening. Until shipped, `user_push_tokens = 0` and
  `contractor_locations = 0` persist regardless of code correctness.
- **P1.5** — 6 lifecycle-critical mobile files still have no unit tests
  (`JobContextLocationService`, `useEnsurePushTokenRegistered`, `usePushSoftAskGate`,
  `useJobTravelTracking`, `BackgroundLocationTask`, `NotificationPushSender`). Where the chronic
  0-row P0s live.
- **P1.7** — `/admin/review-moderation` page is a 423-line partial stub; API + MFA gate are real.
- **P1.8** — three mobile job-creation screens (`JobPostingScreen`, `QuickJobPostScreen`,
  `PostJobWizardScreen`) all hit `/api/jobs`. Pick canonical, redirect others.
- **P1.9** — mobile `JobSignOffScreen` vs `HomeownerPhotoReviewScreen` both call
  `confirm-completion` + `request-changes`. Canonical not yet picked.
- **P1.10** — verify `delete_user_data` RPC fully cascades (read-only diagnostic, ~30 min).
- **P2.2 / P2.3 / P2.4 / P2.5** — Supabase dashboard / DB migration window items: PostGIS+vector
  schema move, HIBP toggle, Postgres patch upgrade, revoke EXECUTE on 9 SECURITY DEFINER fns.

**2026-04-23 audit scope (prior):** Full-stack re-inventory — every page + route + screen + package

- live DB via Supabase MCP on project `ukrjudtlvapiajkjbcrd`. Compared against CLAUDE.md + 16 prior
  memory files to surface drift.

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

### Verified Metrics (measured live 2026-05-10, deltas vs 2026-04-23 in parens):

- **Web pages: 195** (unchanged). 70/195 have `loading.tsx` (+4), 87/195 have `error.tsx` (+23).
- **Web API routes: 418** (+13). **Effective `withApiHandler` coverage = 100%** on real handler
  logic. 6 nominally-raw routes (`contracts/[id]/sign`, `jobs/[id]/reviews`, `email/unsubscribe`,
  `payments/payment-methods`, `user/settings`, `users/settings`) are all intentional re-exports,
  410-Gone deprecation stubs, or GDPR public-token endpoints. 28 cron routes use `withCronHandler`.
- **Mobile screens
  (`src/screens/**`): 305** total .tsx (249 source + 56 tests). 28 source files in `screens/job-details/`
  alone (lifecycle hot path). 171 services (38 top-level + 133 nested).
- **Packages: 10, Apps: 5** — web, mobile, demo-video, sam2-video-service, sam3-service. Doc
  previously claimed 4 (omitted demo-video). All packages TypeScript strict ON.
- **`any` types in source (mobile)**: raw grep count is 1,602 (438 `: any` + 1,164 `as any`), but a
  2026-05-23 categorisation pass shows that is wildly inflated. Excluding `__tests__`, `__mocks__`,
  `test-utils/`, and `utils/testing/`, only **14 production source files** contain any of the
  patterns: 6 are **false positives** (the word "any" in JSDoc prose comments matching the regex), 6
  are already `eslint-disable`'d for legitimate platform-type gaps (RN `AccessibilityInfo`
  overloads, browser `window` extensions, dynamic `process.env` lookups, generic navigation
  overloads), and **2 were actually fixable** (navigation prop casts in `AccountSection.tsx` +
  `WherePanel.tsx`, fixed 2026-05-23 commit `7c8274564`). Net actionable count: **0 today**. Web
  side ~0 in pages.
- **`console.*` in app code: 9 web** (incl. logger module + 1 admin error boundary). Mobile raw
  count is 82 but a 2026-05-23 categorisation pass shows zero actual violations: 65 are in test
  files (testing that the logger captures console output), 11 are inside `logger.ts` (the logger
  itself, wrapping console), 3+2 are in error-capture infra that intentionally hooks `console.error`
  to ship to Sentry, and 1 is a doc-comment false positive. Net actionable count: **0**.
- **Largest source file: 914 lines** (`apps/web/scripts/seed-materials.ts`). 617 source files exceed
  300 lines (the MDC hard limit — see Section 2). 0 files >1,000 lines.
- **Build: PASSES clean** (Next.js production build, `ignoreBuildErrors: false`). All in-session
  edits `tsc --noEmit` clean.
- **TypeScript strict mode: ON** in all packages + both apps.
- **Hex color literals: 625+ across 117 web files** — pre-commit hook enforces incrementally on new
  additions only.
- **Security: live 2026-05-10: 331 public tables, 330 RLS-enabled (99.7%), 813 RLS policies, 1
  zero-policy table** (`spatial_ref_sys`, ecosystem-blocked PostGIS). **195+ migrations applied
  live** (latest `20260522205203` after the 2026-05-23 drift sweep). **Migration drift resolved
  2026-05-23**: a categorised diff found 0 live-only migrations (CLAUDE.md's earlier "15-migration
  drift" claim had the direction backwards) and 6 local-only files that had been written but never
  applied. 5 production-blocking ones applied via Supabase MCP in the same session (`job_tips`,
  `job_checklists`, `insurance_reminder_tracking`, `dbs_reminder_tracking`,
  `job_storage_bucket_constraints`). The 6th (`move_vector_to_extensions`) is intentionally deferred
  to a maintenance window per its own runbook. Two routes (`/api/jobs/[id]/tip` + the
  homeowner-checklist UI) would have crashed on first use without this fix. Production data scale:
  16 jobs (8 assigned, 4 posted, 4 completed; 0 in_progress), 13 bids, 12 contracts, 66
  notifications, 63 messages, 10 profiles (6 onboarded, 1 contractor onboarded), 480
  building_assessments. **Still 0 `user_push_tokens`, 0 `contractor_locations`** — root cause is
  shipping (P0.4), not code; chains verified wired. **0 `vlm_shadow_comparisons`** — intentional,
  Mint AI gated off.
- **Supabase imports: 0 direct `createClient` in source** (closed 04-23, verified again 05-10).
- **Storage buckets** (live): 5 public (avatars, contractor-portfolio, profile-images,
  training-images, mint-ai-training-public — all intentional), 6 private (contractor-documents,
  job-attachments, Job-storage, training-data, yolo-models, models_best_model_final_v2_v2.0).
- **Edge functions in repo: 2** (`_shared/`, `setup-contractor-payout/`) after the 2026-05-10
  deletion of 4 undeployed dead fns. **Live: 2** — `setup-contractor-payout` (verify_jwt:false,
  intentional dual-mode; service-role short-circuits to trust contractorId, otherwise full
  `verifyAuth` + ownership), `test-payout` (verify_jwt:true).
- **Stripe API version: PINNED.** All in-app code now flows through the lazy proxy in
  `apps/web/lib/stripe.ts` (`'2025-01-27.acacia'`); the live Deno edge function
  `setup-contractor-payout` was bumped to match (was `'2023-10-16'`, ~17 months behind).
- **Admin route MFA gating: 32/32 mutating admin routes have `requireMfaVerifiedWithinMinutes: 15`
  (100%).** Plus 6 sensitive read-only GETs added in this session (users/export, revenue/export,
  tax/download-1099, audit-logs, users/[userId]/detail, security-dashboard GET) — see P1.3 above.
  CLAUDE.md previously claimed "35 lack MFA" — that was a miscount: those 35 were read-only.
- **Admin activity logging: ~31% baseline (10/32 mutating admin routes called
  `AdminActivityLogger.logFromRequest` directly).** P2.12 ships a declarative `logActivity` config
  option on `withApiHandler` so future adoption is one-line; P1.4 wires the option on 3 high-impact
  routes (`escrow/{approve,reject}`, `maintenance/rotate-totp-secrets`).
- **Notification system**: all **10 canonical events** are wired through
  `NotificationService.createNotification` (CLAUDE.md previously claimed 4 missing — verified wrong
  in Phase 2a). `markEmailSent` multi-channel observability flag is now propagated on 6/7 lifecycle
  email sends (`payments/confirm-intent`, `jobs/[id]/start`, `jobs/[id]/request-changes`,
  `jobs/[id]/bids/[bidId]/accept` helper, `jobs/[id]/confirm-completion`, `jobs/[id]/photos/after`).
  `contracts/[id]/accept`'s 3 sends still inline-uncaptured.
- **`Zod .strict()` schemas: 44** (CLAUDE.md previously claimed 1 — was an undercount).

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

### Real Priority Issues (post-2026-05-10 remediation):

> The numbered list below was the 04-23 audit's open punch-list. Strikethrough = closed in the
> 2026-05-10 session (or retracted as stale). Live items remain at the top of this file under
> "In-session remediation" + "Standing P0/P1 items still pending".

1. ~~**HIGH**: 10 files using non-standard direct `createClient`~~ — **RESOLVED** (Sprint 3.6).
2. ~~**P0**: 3 admin mutation routes missing MFA step-up — rotate-totp-secrets, migrations/apply,
   migrations/apply-combined~~ — **RESOLVED**: rescan 2026-05-10 confirms all 32 mutating admin
   routes have `requireMfaVerifiedWithinMinutes: 15` (100%). The 35 routes "without MFA" are
   read-only GETs; 6 of those (bulk-export class) gained MFA in P1.3 this session.
3. **P0 (persistent until ship)**: `user_push_tokens = 0` in prod. Code chain verified wired
   end-to-end on 2026-05-10 (4 paths: silent init, soft-ask CTA, foreground retry hook,
   `/api/user/push-token` server). Root cause is the **2026-04-28 push-soft-ask reorder + 2026-05-01
   gate widening haven't shipped to production EAS** (see P0.4).
4. **P0 (persistent until ship)**: `contractor_locations = 0` in prod. Same diagnosis — code is
   correct since 2026-05-01 (`ContractorLocationSection` gate widened from `in_progress` only to
   `assigned OR in_progress` because live DB has 0 `in_progress` jobs). Awaiting EAS ship.
5. ~~**P1**: Reviews RLS `qual=true, roles={public}`~~ — **RETRACTED**: live policy is
   `reviews_public_read_published_replies` which gates on `response_published_at` + reviewer/job
   participation. Not a leak.
6. ~~**P1**: Mobile `sendPushNotification` is a no-op stub~~ — **RESOLVED**: now a server-side proxy
   via `POST /api/notifications/send` ([NotificationPushSender.ts:266-339]) with re-auth +
   business-relationship check.
7. ~~**P1**: 5 uncommitted Mint AI files~~ — **STALE**: working tree clean on every audit cycle
   since 04-23. Either committed earlier or the prior snapshot was wrong.
8. **P1**: ~~10+~~ **5 confirmed** "Coming soon" pages — **3 of 4 contractor placeholders deduped
   via shared `<ComingSoonPlaceholder>` (P2.20)**. Remaining: `/video-calls` (intentionally bespoke,
   different homeowner-card layout), `/learn` (per-card content placeholder, not a page stub).
   `/contractor/team`, `tools`, `insurance`, `/admin/api-documentation`, `/resources` are all
   **fully built** — the prior "10+" claim was a grep-only count of the literal string "Coming soon"
   inside completed UIs.
9. **P1**: Vector + PostGIS extensions still in `public` schema. Migration prepared but unapplied.
   Needs Postgres patch upgrade first (P2.4).
10. **P1**: Postgres 17.4.1.074 patch upgrade pending (~5 min Supabase Dashboard window).
11. **P2**: Split remaining large files (web: SubscriptionService 704, ContinuousLearningService
    687, PredictiveAgent 669, LocationPricingService 667, AssessmentOrchestrator 652; mobile:
    DocumentsScreen 694, AISearchScreen 692, ExpensesScreen 679, VideoService 677). ~Largest~ is now
    actually `apps/web/scripts/seed-materials.ts` at 914 lines.
12. **P2**: 625+ inline hex colors across 117 web files bypass the design-tokens system. Incremental
    pre-commit hook only catches new additions.
13. ~~**P2**: Duplicate auth + payment-method routes~~ — **RETRACTED**: `/auth/login`,
    `/auth/signup`, `/auth/forgot-password` are 8-9 line `redirect()` stubs to canonical pages;
    `/payment-methods` redirects to `/settings/payment-methods`; `/account/payment-methods` does not
    exist. Already consolidated.
14. ~~**P2**: Only 1 Zod schema uses `.strict()`~~ — **RETRACTED**: actual count is **44** as of
    2026-05-10. Original "1" claim was an undercount.
15. ~~**P2**: `sanitize-postgrest.ts` helper has 0 callers~~ — **PARTIAL**: adopted in
    `/api/admin/audit-logs` (P2.11). 14 inline `.ilike()`/`.or()` callers still need migration — the
    helper is now production-tested.
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
20. **P2 (NEW 2026-05-10)**: `compliance_certificates.property_id` FK is `ON DELETE CASCADE`. UK
    landlords legally must retain gas safety certs ≥ 2 yr and EICRs ≥ 5 yr — a property delete
    currently wipes those records. Same concern for `property_tenants` and `anonymous_reports`. Fix
    is `ON DELETE SET NULL` (with nullable `property_id`) or app-layer guard.

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

1. ~~**Admin MFA gaps**~~ — **RESOLVED 2026-05-09 (drift)**. All 3 originally-flagged routes plus
   `/api/admin/synthetic-data/generate` already had `requireMfaVerifiedWithinMinutes: 15`. Sweep of
   all 67 admin routes confirms every mutation route (POST/PUT/DELETE/PATCH) is covered.
2. **Uncommitted Mint AI session work** — 5 files in working tree from 2026-04-19 session
   (`AssessmentGenerator.ts`, `yolo-class-names.ts`, `upload-yolo-to-storage.ts`,
   `PropertyAssessmentScreen.tsx`, `AIAssessmentScreen.tsx`). `AssessmentGenerator.ts` lost its
   `frequency_penalty: 0.5` patch — production repetition loop risk once Mint AI routes traffic.

**New P1 findings:**

3. ~~**`reviews_select_policy` is `qual=true, roles={public}`**~~ — **RESOLVED 2026-04-26 (drift)**.
   Migration `20260426134304_harden_review_reply_rls.sql` replaced it with
   `reviews_public_read_published_replies` (a smart policy that hides unpublished/blocked replies
   while keeping reviews themselves public). Verified live 2026-05-09 via `pg_policy`.
4. ~~**`sanitize-postgrest.ts` helper exists but 0 callers**~~ — **RESOLVED 2026-05-09 (drift +
   today's fix)**. Helper has 10 callers; remaining 2 admin user routes consolidated this session
   via new `sanitizeEmailIlikePattern` variant (preserves `@.` for email search).
5. ~~**Mobile `sendPushNotification()` is a no-op stub**~~ — **RESOLVED 2026-04-24 (drift)**.
   `POST /api/notifications/send` ships with the proper business-relationship gate; mobile file
   forwards to it. Both files audited 2026-05-09.
6. **10+ "Coming soon" dead-end pages** on web (contractor/connections, resources, social, team,
   video-calls, learn, admin/review-moderation, admin/api-documentation). Routable but
   non-functional.
7. ~~**8 auth routes use raw `x-forwarded-for` in logging**~~ — **RESOLVED on inspection 2026-05-09
   (drift)**. Comprehensive grep finds only doc comments + canonical `request-ip.ts` helper + 1 dead
   function (`initializeFeatureFlags`, zero callers). Audit was stale.

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

### 2026-05-09 — Audit re-remediation pass (drift sweep + targeted fixes)

Two-batch remediation session. Verified four "outstanding" priority-list items were already resolved
(CLAUDE.md drift) and shipped concrete code fixes for several others. Live-DB checks via Supabase
MCP throughout.

**P0 fixes (production-broken paths):**

- **Disputes feature, all 5 broken entry points** — `/api/disputes/create`, `/api/disputes/[id]`,
  `DisputeWorkflowService.attemptAutoResolution`, `DisputeResolutionAgent.attemptAutoResolution`,
  `/api/jobs/[id]/dispute` insert. All were selecting/writing non-existent columns:
  `escrow_transactions` has `payer_id`/`payee_id` not `contractor_id`/`client_id`/`homeowner_id`;
  the `disputes` table uses `raised_by`/`against` not `homeowner_id`/`contractor_id`/`category`.
  `[id]` route now returns the flat shape the frontend expects by JOINing both tables on `job_id`.
- **`/jobs/[id]/review` page** — deleted dead photo-upload UI (photos went to `URL.createObjectURL`
  blob URLs and never POSTed). `wouldRecommend` was accepted by the API but silently dropped: added
  column via migration `20260509155315_reviews_would_recommend_column.sql`, persisted on insert,
  surfaced in GET response.

**P1 fixes:**

- **`users!` → `profiles!` foreign-table joins (8 files batch-fix)** — original audit flagged only
  `/jobs/tracking`. Grep surfaced same broken pattern in `lib/cache/user-queries.ts`,
  `lib/queries/scheduling.ts`, `lib/services/admin/AdminEscrowHoldService.ts`,
  `lib/services/building-surveyor/DataCollectionQueryService.ts`,
  `lib/services/payment/FeeTransferService.ts`, `app/api/admin/jobs/route.ts`,
  `lib/services/AdvancedSearchService.ts` (special case — constraint name didn't exist either,
  rewrote to `profiles!contractor_profiles_id_fkey`). All 6 distinct FK targets verified to point at
  `profiles` on live DB. Root cause: legacy `users` view from pre-2025 schema is not embeddable via
  PostgREST resource-name lookup.
- **`/api/contractors/[id]/location`** — POST tightened to contractor-only (admin escape was dead
  code; line `if (user.role !== 'contractor')` immediately rejected admin); GET adds explicit
  admin-oversight branch (doc string already promised it).
- **`/api/payments/refund`** — added `roles: ['homeowner']` lock (defense-in-depth; downstream code
  was already restricting).
- **`/api/agents/decision`** — added `roles: ['homeowner', 'contractor']` lock (admin excluded;
  endpoint is mobile-facing for end-user automation).
- **`navigator.onLine` cluster (4 mobile files)** — original audit flagged `serviceErrorHandler`. In
  React Native `navigator.onLine` is `undefined`, so `!navigator.onLine` always evaluated true and
  every network error showed "No internet connection". Same bug found in `ErrorManager.ts`,
  `errorHandler.ts` (2 sites). Added `isOnlineCached()` to `apps/mobile/src/utils/networkUtils.ts`
  backed by `NetInfo.addEventListener` subscriber, swapped all 3 broken call sites.
  `HealthCheckManager.ts:82` left as-is — correctly platform-gated to `Platform.OS === 'web'`.

**P2 fixes:**

- **`sanitize-postgrest.ts` consolidation** — added `sanitizeEmailIlikePattern` variant for admin
  email-search use case; adopted in `/api/admin/users` + `/api/admin/users/export` (replacing
  duplicate inline regex). Helper now used in 12 files total.
- **6-file refactor pass** — web (3): `LocationPricingService.ts` (667→238), `PredictiveAgent.ts`
  (669→197), `AssessmentOrchestrator.ts` (652→298). Mobile (3): `VideoService.ts` (756→307),
  `SyncManager.ts` (640→285), `AuthService.ts` (629→311). 25 new helper modules across
  `services/location/`, `services/agents/predictive/`, `services/building-surveyor/orchestration/`,
  `services/video/upload/`, `services/sync/`, `services/auth/`. All web modules under the 300-line
  cap; the 3 mobile facades sit at 285-311 (kept that way for public-API stability — trimming
  pass-through delegates would break callers). Web tsc baseline unchanged; mobile tsc clean for
  changed files.

**Migration sync:**

- 12 P0-flagged live migrations pulled into `supabase/migrations/` (canonical-schema renames for
  `contractor_certifications`, `notifications`, `notification_queue`,
  `user_notification_preferences`, etc.).
- New: `20260509155315_reviews_would_recommend_column.sql` (applied live + persisted).
- **Discovered wider drift**: 49 live migration versions still missing locally + 50 local-only files
  unpushed. Quantified for follow-up; not bulk-synced this session.

**Drift corrections (audit claims found stale, no code action needed beyond documenting):**

- ✅ Admin MFA on 3 mutation routes — already had `requireMfaVerifiedWithinMinutes: 15`.
- ✅ Reviews RLS `qual=true` — was replaced 2026-04-26 by `reviews_public_read_published_replies`.
- ✅ `sanitize-postgrest.ts` "0 callers" — 10 callers; only 2 inline-regex stragglers (now also
  consolidated, see above).
- ✅ "8 auth routes use raw `x-forwarded-for`" — comprehensive grep finds only doc comments,
  canonical helper, and 1 dead function. Already cleaned up.

**Discovered-during-fixing:**

- ⚠️ OpenAI API keys verified safe in mobile binary — hardcoded empty + runtime SECURITY guard +
  zero `eas.json` references (false alarm).

**Verification:**

- Web `tsc`: 119 → 63 non-`TS6305` errors (improvement); zero new errors from these changes.
- Mobile `tsc`: clean for changed files.

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

| Metric                    | Maximum     | Current State (2026-04-23)                                      | Priority |
| ------------------------- | ----------- | --------------------------------------------------------------- | -------- |
| File size                 | 300 lines   | 914 lines max (0 files >1K; 617 source files >300)              | MEDIUM   |
| Function size             | 50 lines    | 200-400+ line route handlers remain                             | MEDIUM   |
| Class methods             | 7           | Still large in some services                                    | MEDIUM   |
| `any` types (web source)  | 0           | ~0 in pages (excl. test mocks)                                  | OK       |
| `any` types (mobile)      | 0           | 14 production files, 0 actionable after categorise (2026-05-23) | OK       |
| console.\* (web app code) | 0           | 9 (incl. logger module + admin error boundary)                  | LOW      |
| console.\* (mobile)       | 0           | 82 raw / 0 actionable after categorise (2026-05-23)             | OK       |
| Hex literals (web)        | 0           | 625+ across 117 files (design-tokens adoption partial)          | MEDIUM   |
| Web tests                 | 80% pass    | TODO — refresh via P2.15 (CLAUDE.md staleness flag)             | TBD      |
| Mobile tests              | 80% pass    | TODO — refresh via P2.15                                        | TBD      |
| withApiHandler            | 100% routes | 100% effective (412/418 — 6 routes are aliases/410s)            | OK       |
| Supabase canonical import | 100% files  | 100% (0 direct createClient in source)                          | OK       |
| Zod `.strict()` schemas   | 100%        | 44 / 239 (~18%)                                                 | MEDIUM   |
| Admin MFA on mutations    | 100%        | 100% (32/32 mutating routes; +6 sensitive GETs)                 | OK       |
| Admin activity logging    | 100%        | ~31% (10/32 inline; logActivity wrapper-option ready)           | MEDIUM   |
| RLS coverage              | 100%        | 99.7% (330/331; `spatial_ref_sys` ecosystem-blocked)            | OK       |

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
