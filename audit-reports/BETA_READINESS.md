# Mintenance Beta Readiness Checklist

> Track-ready checklist to get from current state (B/B+ grade, Sprint 6 complete) to private beta
> and beyond. Grouped by **gate**: each gate must be cleared before the corresponding milestone.
> Status: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked

**Last updated:** 2026-04-15 **Current branch:** `fix/mobile-audit-security-ux-features` **Target
milestones:**

- Closed alpha (10-30 invited users): **2 weeks** from today
- Private beta (100-500 users): **4-5 weeks**
- Public beta (open signups): **8-10 weeks**
- GA: **3-4 months**

---

## Pre-public-beta punch list (authoritative — updated 2026-04-15)

This is the condensed view of everything that MUST be fixed before we go public. Items marked `[x]`
were closed in the 2026-04-15 Gate 1 sprint (this session). Items marked `[~]` are in-progress, and
`[ ]` is pending work. Always keep this table in sync with the detailed gate sections below.

### 🔴 Must be fixed before public beta

| #   | Item                                                                | Status                                                                                                                                                                                            | Where                           |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1   | **Storage bucket policies** — 4 public buckets allowed file listing | `[~]` Phase 1 + Phase 2a done, Phase 2b (backfill + bucket flip) pending                                                                                                                          | Gate 1 → Security hardening     |
| 2   | **Leaked password protection** — HaveIBeenPwned in Supabase Auth    | `[ ]` 1-click dashboard toggle, not autonomously runnable                                                                                                                                         | Gate 1 → Security hardening     |
| 3   | **Postgres security patches** — upgrade project DB                  | `[ ]` needs low-traffic window                                                                                                                                                                    | Gate 1 → Security hardening     |
| 4   | **PostGIS / vector / pg_trgm out of `public` schema**               | `[!]` ecosystem-blocked, documented as accepted risk for closed beta                                                                                                                              | Gate 3 → Scale & schema cleanup |
| 5   | **Mobile TLS certificate pinning**                                  | `[ ]` deferred in Sprint 4 with runbook                                                                                                                                                           | Gate 2 → Mobile hardening       |
| 6   | **Web Sentry**                                                      | `[~]` **Code-complete 2026-04-15**, waiting on Vercel env vars (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`). Configs no-op until DSN is set, so safe to merge. | Gate 1 → Observability          |

### 🟢 Closed in the 2026-04-15 Gate 1 sprint (this session)

- [x] **Storage bucket Phase 1** — `Job-storage` SELECT policy scoped to job participants + admin.
      Migration `20260415000001_job_storage_participant_select.sql` applied to prod; Supabase
      advisor warning cleared for that bucket.
- [x] **Storage bucket Phase 2a** — all 7 writer routes (`jobs/[id]/photos/{before,after,video}`,
      `jobs/upload-photos`, `assessments/videos/upload`, `properties/upload-photos`,
      `properties/[id]/room-photos`) now issue `createSignedUrl(path, 1yr)` via
      `signJobStoragePath()` helper in `apps/web/lib/api/job-storage.ts`. Tests updated, 45/45
      passing. Forward-compatible with the eventual `public=false` flip.
- [x] **Shadow-mode teacher-capture fix** — root-caused why 473 prod assessments produced only 1
      `gpt4_training_labels` row: `HybridInferenceService.assessDamage()` (the default prod path)
      never called `recordGPT4Output`. Wired the capture hook into the `if (savedAssessmentId)`
      block of `apps/web/app/api/building-surveyor/assess/route.ts`. Every future assessment (hybrid
      or not) now populates the training corpus. Distillation tests still pass (45/45 + 13 AI cost
      tests).
- [x] **Mint AI rename** — `qwen2.5-vl-*` → `mint-ai-vlm-v1` across `StudentShadowService.ts`,
      `CostControlService.ts`, `KnowledgeDistillationTrainingService.ts`,
      `MintAIDashboardClient.tsx`. New `apps/web/lib/services/ai/mint-ai-constants.ts` holds the
      product ID + Apache 2.0 attribution for the base model (`Qwen/Qwen2.5-VL-7B-Instruct`). Fixed
      latent bug where `mint-ai-vlm` was mispriced as gpt-4o ($0.005/$0.015) when it should be
      student pricing ($0.0002/$0.0006); also fixed the 3B/7B drift. Prod DB migrated:
      `UPDATE ai_service_costs SET model = 'mint-ai-vlm-v1'` (2 rows).
- [x] **Sentry v10 wiring for Next.js 16** — Full client + server + edge + App Router error capture.
      New files: `instrumentation-client.ts` (client init with replay + router transition
      instrumentation), `sentry.edge.config.ts` (middleware/edge runtime), rewritten
      `sentry.server.config.ts` (static imports + PII scrubbing + secret redaction),
      `instrumentation.ts` (imports Sentry configs per runtime, exports
      `onRequestError = Sentry.captureRequestError`), `next.config.js` wrapped with
      `withSentryConfig` (source map upload, widen client upload, hide source maps, webpack-level
      vercel monitors + tree-shake debug logging). Deleted deprecated `sentry.client.config.ts`.
      Added `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to
      `lib/env.ts` zod schema. All configs no-op when DSN is absent — safe to merge before Vercel
      env vars are set. Typecheck clean, 50/50 regression tests passing. **Deploy step: set
      `NEXT_PUBLIC_SENTRY_DSN` (+ optionally the 3 build-time vars) in Vercel Project → Settings →
      Environment Variables for Production + Preview.**

### 🟡 Fine to defer past beta (accepted technical debt)

- Mobile typing debt: 1,608 `any` — works, but technical debt
- 8 files >800 lines — works, just hard to maintain
- 30+ unfinished LinkedIn-clone tables — dead schema, no user impact
- Titans self-modifying memory — scaffolded but unused, zero runtime impact
- Custom JWT → Supabase Auth migration — works as hybrid
- A/B test path skipping training-data capture — A/B testing off by default
- `shouldAutomate` early-return bypass on the teacher-capture hook — only fires when the hybrid
  router is confident enough to skip teacher entirely

### Realistic beta timelines

| Milestone                              | Weeks          | Requirements                                                                                                                                               |
| -------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Closed alpha** (10-30 invited users) | **1-2 weeks**  | Finish storage Phase 2b backfill + bucket flip, enable HaveIBeenPwned, upgrade Postgres, wire Sentry                                                       |
| **Private beta** (100-500 users)       | **3-5 weeks**  | Above + load-test Stripe/escrow under concurrency + finish mobile i18n + rollback runbook + PagerDuty hookup                                               |
| **Public beta** (open signups)         | **6-10 weeks** | Above + fully resolve storage bucket advisors + audit log retention policy + GDPR DSR flow exercised e2e + insurance/liability setup + payment ops runbook |
| **GA**                                 | **3-4 months** | Above + full mobile cert pinning + Sentry alerting + incident response playbook + legal review of AI assessment disclaimers                                |

**Honest recommendation:** 3-4 weeks to **private beta** with invited users. The core loop works;
the gaps are security hardening + observability, not missing features. Don't go public beta until
you've seen real users hit the escrow dispute + refund flow in production — that's where money and
legal risk live.

---

## GATE 1 — Closed Alpha (invited users, must clear before ANY real-user traffic)

### Security hardening

- [~] **Fix storage bucket SELECT policies** — Phase 1 + Phase 2a applied 2026-04-15.
  - **Phase 1** (migration `20260415000001_job_storage_participant_select.sql`): `Job-storage`
    SELECT now scoped to job participants + admin; advisor warning cleared for that bucket.
    `avatars`/`contractor-portfolio`/`profile-images` remain public by design (profile-surface
    buckets) and the advisor warnings for them are accepted risk — document in
    `docs/SUPABASE_DASHBOARD_CHECKLIST.md`.
  - **Phase 2a** (code, no migration): all 7 `Job-storage` writer routes now call
    `createSignedUrl(path, 1yr)` via the shared `signJobStoragePath()` helper in
    `apps/web/lib/api/job-storage.ts`. New uploads produce URLs that survive the `public=false`
    flip. Tests updated (`photos-before`, `photos-after`, `job-lifecycle` integration — 45/45
    passing). Files touched: `lib/api/job-storage.ts` (new),
    `app/api/jobs/[id]/photos/{before,after,video}/route.ts`, `app/api/jobs/upload-photos/route.ts`,
    `app/api/assessments/videos/upload/route.ts`, `app/api/properties/upload-photos/route.ts`,
    `app/api/properties/[id]/room-photos/route.ts`.
  - **Phase 2b pending** — cannot be done autonomously because it requires data backfill: (1) scan
    all `job_photos_metadata.photo_url`, `property_room_photos.photo_url`,
    `building_assessments.video_url` rows that still hold `/storage/v1/object/public/...` URLs; (2)
    extract the storage path; (3) re-sign each path and update the row; (4) only then run
    `UPDATE storage.buckets SET public = false WHERE id = 'Job-storage'`. Risk: any miss breaks
    photo rendering on historic jobs. Effort: 1 day for a careful migration + cutover window.
- [ ] **Enable HaveIBeenPwned leaked password protection** in Supabase Auth dashboard. 1-click
      setting, no code change. Effort: 5 min.
- [ ] **Upgrade Postgres** — current `supabase-postgres-17.4.1.074` has outstanding security
      patches. Schedule low-traffic window, test in staging first. Effort: 2-4 hours.
- [ ] **Rotate any secrets** committed during audit sprints (Stripe, Supabase service role, OpenAI).
      Verify via `git log --all -p | grep -iE "sk_|secret|key" | head`. Effort: 2 hours.
- [ ] **Verify CSP nonce in production build** — middleware sets it but confirm Next.js inline
      scripts still work under strict CSP. Effort: 2 hours.
- [ ] **Confirm `__Host-mintenance-auth` cookie** is used in prod (Secure + Path=/ + no domain).
      Check `apps/web/middleware.ts` path. Effort: 30 min.

### Observability (can't ship without)

- [ ] **Wire Sentry on web** — currently deferred per Sprint 5 runbook. Install `@sentry/nextjs`,
      capture API routes + client errors. Effort: 4 hours. File: `apps/web/sentry.*.config.ts`.
- [ ] **Wire Sentry on mobile** — `@sentry/react-native`, source map upload via EAS build hook.
      Effort: 4 hours.
- [ ] **Enable Supabase log forwarding** to Sentry or a log sink (Axiom / BetterStack). Effort: 2
      hours.
- [ ] **Add uptime monitoring** for `/api/health` and `/api/webhooks/stripe`. UptimeRobot or
      BetterStack free tier. Effort: 30 min.
- [ ] **Set up on-call rotation** (even if it's just you getting PagerDuty alerts). Effort: 1 hour.
- [ ] **Log retention policy documented** — how long do `security_events` (2,443 rows already),
      `audit_log` (554), `job_audit_log` (255) stay? Default forever is a GDPR risk. Effort: 2 hours
      to define + add pg_cron cleanup.

### Core flow verification under real conditions

- [ ] **End-to-end smoke test** against staging: homeowner signup → post job → contractor bid →
      accept → contract sign → escrow fund → start (photos) → complete (photos) → approve → escrow
      release → Stripe transfer. Manual, 2 different accounts. Effort: 3 hours. Blocker for any
      beta.
- [ ] **Stripe test mode verified** end-to-end — use Stripe CLI to replay webhook events for
      success, failure, dispute, refund. Effort: 2 hours.
- [ ] **Dispute + refund dry run** — create a test dispute via Stripe CLI, verify escrow freezes,
      verify admin review path, verify `charge.dispute.closed` handler reacts. Effort: 2 hours.
- [ ] **Photo verification gate validated** — `/api/jobs/[id]/start` blocks without before photos,
      `/api/jobs/[id]/complete` blocks without escrow funded. Effort: 1 hour.
- [ ] **Test 7-day auto-release cron** — create escrow with `cooling_off_ends_at` in the past, run
      cron manually, verify transfer fires. Effort: 1 hour.

### Data & legal

- [ ] **Review Mint AI disclaimer copy** — assessments are advisory, not a certified surveyor
      report. Add banner on `/admin/mint-ai` outputs and mobile assessment screens. Effort: 2 hours.
- [ ] **Privacy policy covers** AI photo processing, GPT-4o Vision cloud send, Supabase EU-West-2
      data residency. Effort: 2 hours (or ask counsel).
- [ ] **Terms cover** escrow flow, 5% platform fee, auto-release rules, dispute process. Effort: 2
      hours.
- [ ] **Cookie banner** renders correctly (already has `CookieConsent` component — verify it
      triggers). Effort: 30 min.
- [ ] **Delete account flow** exercised end-to-end — it's listed in DSR requirements.
      `dsr_requests` + `gdpr_audit_log` tables exist but mostly empty (0 rows). Verify
      `/api/account/delete` cascades correctly. Effort: 3 hours.

---

## GATE 2 — Private Beta (100-500 users)

### Reliability under concurrency

- [ ] **Load-test escrow + payment endpoints** with k6 or artillery. Target: 50 concurrent job
      completions without idempotency violations. Effort: 1 day.
- [ ] **Rate-limit review** — current limits may be too tight or too loose for beta scale. Check
      `/api/jobs` (10/hr), `/api/building-surveyor/assess` (5/min), `/api/webhooks/stripe`
      (1000/min). Effort: 4 hours.
- [ ] **Database connection pooling** — verify Supabase pooler config for PgBouncer transaction
      mode. Effort: 2 hours.
- [ ] **Redis (Upstash) fallback tested** — GPT4CacheService should fail-open when Redis is down.
      Effort: 2 hours.
- [ ] **Circuit breakers exercised** for Roboflow, SAM3, OpenAI API. Force failures, verify
      fallbacks. Effort: 3 hours.

### Mobile hardening

- [ ] **TLS certificate pinning** — Sprint 4 deferred this with runbook. Needed for any real payment
      data on mobile. File: new `apps/mobile/src/lib/network/CertPinning.ts`. Effort: 1 day.
- [ ] **Biometric re-auth on app resume** after >5 min background. Effort: 4 hours.
- [ ] **Offline queue conflict resolution tested** with real divergence scenarios (5 strategies
      exist, need validation). Effort: 1 day.
- [ ] **App Store / Play Store listing drafted** (screenshots, description, age rating, GDPR
      declaration). Effort: 1 day.
- [ ] **iOS TestFlight + Android internal testing** track set up. Effort: 2 hours + Apple/Google
      review time (24-48h).
- [ ] **EAS build pipeline** producing reproducible builds with version tagged to commit SHA.
      Effort: 2 hours.

### Payment ops

- [ ] **Payout reconciliation report** — admin view comparing `contractor_payout_balances` against
      Stripe's ledger. Effort: 1 day.
- [ ] **Fee transfer job tested** end-to-end (`/admin/escrow/fee-transfer/batch`). Effort: 4 hours.
- [ ] **Stripe Connect onboarding** works for UK sole traders and limited companies. Test with real
      sandbox account. Effort: 4 hours.
- [ ] **1099-NEC scaffolding reviewed** — `contractor_tax_profiles`, `tax_year_summaries`,
      `tax_payment_records` tables exist but empty. UK beta may not need 1099 — confirm tax model
      for jurisdiction. Effort: decision only, 1 hour.
- [ ] **Refund flow** tested for partial and full refunds, verify homeowner gets notified, verify
      contractor notified. Effort: 3 hours.

### Agent-Based AI safety

- [ ] **Mint AI cost cap verified in prod config** — $5/day, $50/month per user
      (`apps/web/lib/ai/cost-budget.ts`). Effort: 1 hour.
- [ ] **Prompt injection guard** — Sprint 5 added this, verify it rejects crafted photo captions /
      user inputs. Effort: 3 hours.
- [ ] **GPT-4o fallback when Qwen student route goes down** (once deployed). Effort: 2 hours.
- [ ] **Shadow comparison dashboard** — `/admin/mint-ai` shows agreement metrics. Verify charts
      render with real `vlm_shadow_comparisons` data (currently 0 rows until endpoint deployed).
      Effort: 2 hours.

---

## GATE 3 — Public Beta (open signups)

### Scale & schema cleanup

- [ ] **Split remaining >800-line files** — `AssessmentOrchestrator.ts` (905),
      `EscrowReleaseAgent.ts` (886), `ServiceRequestScreen.tsx` (904), and ~5 others. Effort: 3-5
      days.
- [ ] **Kill duplicate tables** — `escrow_payments` vs `escrow_transactions`, `audit_log` vs
      `audit_logs`. Pick one, migrate, drop the other. Effort: 2 days.
- [ ] **Archive or delete empty feature tables** — 30+ LinkedIn-clone tables (articles, companies,
      groups, discussions, company\_\*) all at 0 rows. Either build the feature or remove. Effort: 1
      day decision + 1 day migration.
- [ ] **Mobile typing debt** — reduce 1,608 `any` types. Target top 20 files first. Effort: 1 week.
- [ ] **Remove or justify** empty ML infrastructure tables (titans\_\*, continuum_memory_states 12
      rows, nested_optimizer_states, memory_update_history). Document which are in active use vs
      aspirational. Effort: 1 day.
- [ ] **Supabase advisor: move postgis/vector/pg_trgm out of `public` schema** — ecosystem-blocked,
      document as accepted risk OR plan migration. Effort: 1 day (decision + migration).

### Product hardening

- [ ] **Accessibility audit** — WCAG 2.1 AA on top 20 web pages + critical mobile screens. Effort: 1
      week.
- [ ] **Responsive design audit** — mobile viewport for web app, tablet for mobile. Effort: 3 days.
- [ ] **i18n scaffolding** — English-only for beta. Plan i18n for next locale. Effort: decision
      only.
- [ ] **Content moderation** for messages, bids, profile bios. Manual admin queue OR automated
      filter. Effort: 2 days.
- [ ] **Abuse reporting flow** — `anonymous_reports` + `anonymous_report_tokens` tables exist, wire
      the UI. Effort: 2 days.
- [ ] **Insurance / liability review** — what's the platform's exposure if Mint AI misclassifies a
      "dangerous" structural defect? Legal + ops decision. Effort: 1 day with counsel.

### Mint AI open-source path (parallel track)

**Chosen strategy (2026-04-15): shadow-mode accumulation first, external datasets / synthetic
bootstrap deferred.** The plan is: collect real production training data for 2–4 weeks of alpha
traffic, THEN train the first student. No external dataset bootstrap, no synthetic distillation from
GPT-4o on public imagery.

- [x] **Diagnose why prod had 1 gpt4_training_labels row after 473 assessments** (2026-04-15). Root
      cause: `HybridInferenceService.assessDamage()` (the default prod inference path) never called
      `KnowledgeDistillationService.recordGPT4Output()`. The training-capture hook was wired only on
      the non-hybrid `AssessmentOrchestrator` branch in `captureTrainingDataAsync`, which prod
      traffic never took.
- [x] **Wire teacher capture into the hybrid path** (2026-04-15). Added
      `KnowledgeDistillationService.recordGPT4Output()` call in the `if (savedAssessmentId)` block
      of `apps/web/app/api/building-surveyor/assess/route.ts`, fire-and-forget with try/catch so
      failures never break a live assessment. Closes the gap for BOTH hybrid and non-hybrid
      branches. Typecheck clean, distillation + SAM3 training-data-flow tests still pass (45/45).
      Files: `app/api/building-surveyor/assess/route.ts`,
      `app/api/building-surveyor/assess/_deps.ts`.
- [ ] **Let alpha traffic accumulate 500+ rows** in `gpt4_training_labels` + `assessment_images`.
      Passive — runs on its own once alpha users start posting assessments. Monitor via
      `SELECT count(*) FROM public.gpt4_training_labels` and
      `SELECT count(*) FROM public.assessment_images`.
- [ ] **Deploy Modal training worker** (`vlm_training_worker/modal_train.py`) — follow README.
      Effort: 2 hours. Blocked on: `pip install modal` + `modal token new` + setting Modal secrets.
      Not autonomously actionable (needs user creds).
- [ ] **Deploy Modal inference endpoint** (`vlm_training_worker/modal_inference.py`). Effort: 2
      hours. Same blocker as above.
- [ ] **Set Modal secrets** (`mintenance-vlm-training`, `mintenance-vlm-inference`). Effort: 30 min.
- [ ] **Export training dataset** from accumulated `gpt4_training_labels` via
      `scripts/vlm-training/export_bootstrap_dataset.mjs` (already schema-matched to prod). Effort:
      2 hours.
- [ ] **Run first Qwen2.5-VL-7B LoRA training job** on Modal A100 (~$2.75 for 1k samples, 3 epochs).
      Effort: 1 day (mostly waiting).
- [ ] **Evaluate student vs teacher** using `scripts/vlm-training/evaluate_vlm.py` on held-out 10%.
      Effort: 2 hours.
- [ ] **Set `MINT_AI_VLM_ENDPOINT`** in `.env.local` → triggers `StudentShadowService` on every
      assessment. Effort: 5 min.
- [ ] **Wait for 500+ shadow comparisons** to accumulate in `vlm_shadow_comparisons`. Effort:
      passive (1-2 weeks).
- [ ] **Flip `VLM_ROUTING_MODE=auto`** once student confidence calibration shows ≥85% agreement on
      safe categories. Effort: 1 hour.
- [ ] **Canary 5% → 25% → 50% → 100%** student routing over 2 weeks with rollback button. Effort: 1
      day.

---

## GATE 4 — GA (general availability)

- [ ] **SOC 2 Type 1 readiness** OR equivalent security posture documentation. Effort: 4 weeks (with
      a vendor like Drata/Vanta).
- [ ] **Incident response runbook** — who gets paged, escalation path, post-mortem template. Effort:
      1 week.
- [ ] **Disaster recovery plan** — DB restore tested from Supabase backup. Effort: 2 days.
- [ ] **Penetration test** from external vendor. Effort: 2 weeks + remediation time.
- [ ] **Contract / ToS reviewed** by counsel for your jurisdiction(s). Effort: external.
- [ ] **Public status page** at `/status` (page exists, wire it to real checks). Effort: 1 day.
- [ ] **Marketing site QA** — landing, pricing, contact all hit. Effort: 2 days.
- [ ] **Remove `ignoreBuildErrors: true`** if still on in `next.config.ts`. Run build clean. Effort:
      variable.
- [ ] **Full DSR cycle exercised** — data export, data deletion, consent withdrawal. Effort: 1 week.

---

## Out of scope for beta (acceptable debt)

These are fine to carry into beta as documented tech debt — don't block shipping on them:

- Titans self-modifying memory architecture (scaffolded, unused)
- Nested optimizer states + learned feature extractors (scaffolded, unused)
- LinkedIn-clone social features (articles, groups, companies) — 30+ empty tables
- Mobile cert pinning (runbook exists, do before public beta)
- Video call infrastructure (`video_calls`, `video_call_invitations`, etc — empty tables)
- Custom JWT ↔ Supabase Auth migration (hybrid works)
- 27 admin routes not on `withApiHandler` (internal-only, low risk)
- Job/Job type unification across packages (runbook exists)

---

## Running totals

**Must-do before closed alpha (Gate 1):** ~26 items, estimated 4-6 developer-days **Must-do before
private beta (Gate 2):** ~15 additional items, estimated 8-10 developer-days **Must-do before public
beta (Gate 3):** ~18 additional items, estimated 4-6 weeks **Must-do before GA (Gate 4):** ~9
additional items, estimated 6-10 weeks (including external reviews)

**Total path to GA:** ~3-4 months of focused work assuming 1-2 engineers. **Path to closed alpha:**
1-2 weeks if focused.
