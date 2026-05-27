## Summary

Rolls up the 2026-05-27 full-stack flow audit + whole-app review remediation into a single
ship-ready branch. **55 commits, 133 files, +8187/-2051, 9 live DB migrations.**

Two layers of audit landed here:

1. **Audits 57-88** (flow + drift work, mostly authored by parallel sessions) — closing P0/P1/P2
   items across web, mobile, properties, lifecycle.
2. **Whole-app review** (post-flow sweep across auth/middleware, payments/Stripe, admin, mobile
   core) — 9 critical findings, all closed by 3 hardening commits at the tip of the branch.

**Highlights**

- **P0 fixes**: homeowner web onboarding wizard (audit-P0-2), Start Job CTA reachable on return
  visit (audit-P0-3), mobile e-signature capture + immutable audit table (audit-P0-4 /
  `contract_signatures`).
- **Money/lifecycle**: tier-aware platform fees + active-jobs cap (audit-32/60), escrow currency =
  'gbp' + one-active-per-job partial unique index (audit-P1-1/P1-2), payment-intent dedup on
  non-terminal escrow (audit-60), bid-accept error toasts (audit-76 P1), confirm-intent
  payer_user_id alignment (audit-60 P2), bid-accept welcome notification deep-links (audit-87),
  mobile↔web escrow lifecycle predicate parity (audit-83).
- **GDPR**: `delete_user_data` v5 → v7 (audit-68 + audit-76 Critical #1 + self-review fix) handles
  NOT NULL audit FKs, anonymises signer / actor / inviter columns, resets `jobs.assigned_at` /
  `started_at` ONLY on recycled (assigned/in_progress → posted) jobs so completed jobs keep their
  historical timestamps; UK retention pattern on 5 compliance FKs flips CASCADE → SET NULL with
  statute citations (audit-P1-10).
- **Security (whole-app review)**:
  - **Critical #1** — `FeeTransferService.transferPlatformFee` now accepts + resolves
    `contractorTier`. Cron path was previously charging Pro contractors 4pts and Business 7pts too
    much on every auto-release because both the breakdown AND the fee-transfer record used the
    default 12% rate.
  - **Critical #2** — `check_webhook_idempotency` RPC re-claims `status='failed'` rows so Stripe
    retries actually re-run the handler. Failed events would otherwise be permanently lost (escrow
    flip to held, dispute freeze, refund mirror).
  - **Critical #3** — Last two un-pinned Stripe inits swapped for the shared `@/lib/stripe` proxy.
  - **Critical #4** — Middleware bearer-token path now mirrors the cookie path's gates: signature
    verification + blacklist + exp + session-timeout enforcement. Stolen mobile bearers no longer
    skate past middleware-level session-age enforcement.
  - **Critical #5** — `/api/auth/forgot-password` enumeration oracle closed. Dropped
    `auth.admin.listUsers()` (unpaginated scan) for a targeted `profiles` lookup; moved the
    confirm-email retry to fire-and-forget so response timing is identical for exists/not-exists.
- **Mobile sync (whole-app review)**:
  - **Critical #6** — Promise-based mutex in `SyncManager.syncAll` closes the concurrent-sync race
    that produced duplicate offline-action replays.
  - **Critical #7** — `getSyncStatus` now reports real `pendingUploads` + `errors` from cached state
    (was hardcoded zero).
  - **Critical #8** — `ConflictManager.fetchServerData` for bids is now an explicit "not
    implemented" with operator-visible log instead of a structurally-broken `getBidsByJob(bidId)`
    call.
  - **Critical #9** — Offline action queue now dead-letters poison-pill rows (JSON parse failures)
    immediately, and any persistently-failing action via `bumpOfflineActionRetry` once
    `retry_count >= max_retries`. Queue can no longer be blocked indefinitely.
- **Mobile feature parity / honesty**: notification badge + realtime deep-link parity with web
  (audit-80), Find Jobs / Discover hardening (audit-72/77/79), property mobile UI honesty
  (audit-74), bid withdraw/resubmit (audit-73), Android map guard agrees with native config
  (audit-79 P2), Meeting Details deep-link (audit-78), bid-resubmission via discover (audit-79),
  `job_rooms` NUMERIC coercion (audit-82), ETA speed unit fix + realtime filter alignment
  (audit-84), 4 hardening fixes from full-branch review (audit-76 follow-up — double-tap guard, GPS
  state reset, AppState-gated Realtime, quiet-hours edge case).
- **Properties**: shared-property visibility parity (audit-57/61), delete blockers + preview
  hardening (audit-65), NULL ticket status no longer slips past delete blocker (audit-76 #5),
  PropertyTeamService memoised via React `cache()` (audit-76 #6), audit-81 contractor access card +
  key-safe mask, audit-85 managers can save Access tab, audit-86 DeleteAccountModal CSRF +
  signed-unfunded blocker.
- **Web infra**: `react-hot-toast` `<Toaster />` mounted globally so 107 silently-broken toast
  call-sites actually render; idempotency SECURITY DEFINER RPCs revoked from anon (audit-P2-10);
  phone-verification bypass NODE_ENV-gated (audit-P2-8); jobs RLS tightened to drop over-broad
  policies (audit-88).
- **Observability**: delete-account `gdpr_audit_log` error visibility, onboarding settings
  optimistic concurrency, contractor verification honest status (audit-63), CLAUDE.md handoff doc
  (16c55191a).

**Migrations applied live via Supabase MCP (9 total, all verified post-apply):**

- `20260527090000_contract_signatures_audit` — immutable e-signature audit table
- `20260527150000_escrow_currency_jobs_lifecycle_timestamps` — escrow currency CHECK +
  active-uniqueness + `assigned_at` / `started_at`
- `20260527160000_compliance_retention_on_user_delete` — UK retention CASCADE → SET NULL on 5 FKs
- `20260527170000_lock_down_idempotency_security_definer` — REVOKE EXECUTE from anon on 4
  idempotency RPCs
- `20260527180000_delete_user_data_v5_anonymise_audit_fks` — DROP NOT NULL on 4 audit columns +
  dynamic-loop guard
- `20260527200000_delete_user_data_v6_reset_job_lifecycle_timestamps` — contractor-delete branch
  nulls assigned_at + started_at _(superseded by v7 below)_
- `20260527210000_delete_user_data_v7_scope_lifecycle_reset_to_recycled_jobs` — fixes v6's
  unconditional null; preserves completed-job timestamps
- `20260527220000_audit88_tighten_jobs_rls` — drops over-broad jobs RLS policies
- `20260527230000_webhook_idempotency_reclaim_failed` — whole-app review Critical #2: failed Stripe
  webhook events now re-claimable on retry (status='failed' rows reset to 'pending', retry_count
  bumped, max 10 retries before dead-letter)

**Outstanding (out of scope for this PR — suggestion-level only)**

- 🟡 `assigned_at` backfill in `20260527150000` uses `updated_at` as proxy — best-effort by design;
  analytics-aware follow-up.
- 🟡 `isFullyVerified` semantic tightened in audit-63 (now requires admin review). Old mobile builds
  gating bidding on this key may block previously-bidding contractors — ship-side note for next
  mobile EAS rollout. Production impact: 1 onboarded contractor per CLAUDE.md.
- 🟡 audit-76 self-review Suggestion #2: novel PostgREST `.or('status.is.null,status.not.in.(...)')`
  syntax in `apps/web/app/api/properties/[id]/route.ts` — should be curl-verified on staging before
  relying on the new pattern.
- 🟡 Whole-app review Suggestions (non-blocking, deferred):
  - 7 admin routes still missing `admin_activity_log` writes (one-line `logActivity` adoption each)
  - `admin/verifications` filter-injection (swap to `sanitizeIlikePattern` helper)
  - `admin/refunds/[id]` release branch missing `payouts_enabled` pre-flight
  - `escrow.status` mixing 'released' vs 'completed' across paths
  - `payments/refund` partial-refund cancels whole job
  - CSRF `'*'` literal in allowlist + bare-apex subdomain match
  - token-blacklist hash collision space (`token.slice(-32)`)
  - 2 mobile Realtime channels still lacking AppState pause (NotificationScreen, MessagingScreen)
  - Mobile dev-only mock Supabase fallback silent-noop when misconfigured
  - Biometric issuer `includes('supabase')` substring check
- 🟡 100+ web files over the 500-line MDC cap (incl. `MintEditorialJobDetailView.tsx` at 1036,
  `PropertyDetailsClient.tsx` at 1021) — incremental refactor pass.
- Watch #2 (`properties/route.ts` includeShared service-role join) documented with
  `TODO(rls-future)`.

## Test plan

- [ ] CI green on `feat/tiered-pricing` (web + mobile tsc, lint, unit tests).
- [ ] Stage smoke: homeowner sign-up → onboarding wizard → property → post job → contractor bid →
      accept → contract sign (web + mobile) → fund escrow → start job → after-photo → confirm →
      release.
- [ ] **Stage tier-aware fee verification (whole-app Critical #1)**: cron auto-release of a Pro-tier
      contractor's escrow — confirm `escrow_transactions.platform_fee` AND
      `platform_fee_transfers.amount` both reflect 8% (not 12%). Same for Business tier at 5%.
- [ ] **Stage webhook retry (whole-app Critical #2)**: simulate a handler failure (e.g. force a DB
      error in `payment_intent.succeeded` handler); confirm Stripe's next retry actually re-runs the
      handler and `webhook_events.retry_count` bumps.
- [ ] **Stage mobile bearer logout (whole-app Critical #4)**: log out on web (bumps
      `tokens_revoked_at`), then issue an API call from mobile with the now-revoked bearer — confirm
      middleware returns 401 instead of reaching the route.
- [ ] **Stage forgot-password timing (whole-app Critical #5)**: hit `/api/auth/forgot-password` with
      both an existing and a non-existent email — confirm response time delta is < 50ms (was
      hundreds of ms before).
- [ ] **Stage mobile sync (whole-app Critical #6-9)**: trigger AppState foreground +
      background-timer concurrently, queue an offline action; confirm only one replay fires. Corrupt
      an offline_actions row's JSON manually; confirm dead-letter on next sync. Force a handler to
      fail 3+ times; confirm row is removed after retry_count exhausted.
- [ ] Stage GDPR delete: homeowner account → verify compliance certs anonymised (owner_id NULL, row
      survives); contractor account with both active AND completed jobs → verify active jobs
      recycled to `posted` with `assigned_at` + `started_at` cleared, AND completed jobs keep their
      historical timestamps with only `contractor_id` nulled.
- [ ] Stage escrow: confirm only one non-terminal escrow row can exist per job; verify currency
      CHECK rejects non-GBP attempts.
- [ ] Verify `react-hot-toast` toasts render on bid-accept, contract-sign, onboarding submit (was
      silently broken before).
- [ ] Verify mobile notification badge count matches the rendered inbox (no phantom social-graph
      rows inflating the badge).
- [ ] Verify mobile realtime notification taps deep-link correctly when only `action_url` is set (no
      fall-through to inbox).
- [ ] Verify property DELETE blocker fires correctly for tickets with `status = NULL` (curl test
      against staging maintenance_tickets row with NULL status).
- [ ] Verify withdrawn bids resurface on `/api/jobs/discover` and the contractor can resubmit via
      the existing JobDetailsCTA path.
- [ ] Verify Android EAS build with only `GOOGLE_MAPS_API_KEY` (no
      `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`) shows the Map view (not the "Map unavailable" fallback).
- [ ] Confirm mobile EAS build picks up the audit-63 `isAdminVerified` API contract before relying
      on the old `isFullyVerified` semantics in any new gate.
- [ ] Post-merge: monitor `admin_activity_log` for delete_user_data RPC failures; monitor Sentry for
      `Request body too large` 400s on `/api/contracts/[id]/accept` and
      `Offline action JSON corrupt` warnings.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
