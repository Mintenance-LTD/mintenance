## Summary

Rolls up the 2026-05-27 full-stack flow audit (homeowner + contractor, web + mobile, account
creation → deletion) into a single ship-ready branch. **43 commits, 114 files, +7086/-1807, 7 live
DB migrations.**

**Highlights**

- **P0 fixes**: homeowner web onboarding wizard (audit-P0-2), Start Job CTA reachable on return
  visit (audit-P0-3), mobile e-signature capture + immutable audit table (audit-P0-4 /
  `contract_signatures`).
- **Money/lifecycle**: tier-aware platform fees + active-jobs cap (audit-32/60), escrow currency =
  'gbp' + one-active-per-job partial unique index (audit-P1-1/P1-2), payment-intent dedup on
  non-terminal escrow (audit-60), bid-accept error toasts (audit-76 P1), confirm-intent
  payer_user_id alignment (audit-60 P2).
- **GDPR**: `delete_user_data` v5 → v7 (audit-68 + audit-76 Critical #1 + self-review fix) handles
  NOT NULL audit FKs, anonymises signer / actor / inviter columns, AND resets `jobs.assigned_at` /
  `started_at` ONLY on recycled (assigned/in_progress → posted) jobs so completed jobs keep their
  historical timestamps; UK retention pattern on 5 compliance FKs flips CASCADE → SET NULL with
  statute citations (audit-P1-10).
- **Security**: idempotency SECURITY DEFINER RPCs revoked from anon (audit-P2-10);
  phone-verification bypass NODE_ENV-gated (audit-P2-8); `react-hot-toast` `<Toaster />` finally
  mounted globally so 107 silently-broken toast call-sites actually render; contract e-signature
  body-size cap before parse (audit-76 #7).
- **Mobile**: contractor location tracking lifecycle parity (audit-67/69), notification routing
  drift (audit-70/71), notification badge + realtime deep-link parity with web (audit-80), Find Jobs
  / Discover hardening (audit-72/77/79), property mobile UI honesty (audit-74), bid
  withdraw/resubmit (audit-73), Android map guard agrees with native config (audit-79 P2), 4
  hardening fixes from full-branch review (audit-76 follow-up — double-tap guard, GPS state reset,
  AppState-gated Realtime, quiet-hours edge case).
- **Properties**: shared-property visibility parity (audit-57/61), delete blockers + preview
  hardening (audit-65), NULL ticket status no longer slips past delete blocker (audit-76 #5),
  PropertyTeamService memoised via React `cache()` (audit-76 #6).
- **Observability**: delete-account audit-log error visibility, onboarding settings optimistic
  concurrency, contractor verification honest status (audit-63), CLAUDE.md handoff doc (16c55191a).

**Migrations applied live via Supabase MCP (7 total, all verified post-apply):**

- `20260527090000_contract_signatures_audit` — immutable e-signature audit table
- `20260527150000_escrow_currency_jobs_lifecycle_timestamps` — escrow currency CHECK +
  active-uniqueness + `assigned_at` / `started_at`
- `20260527160000_compliance_retention_on_user_delete` — UK retention CASCADE → SET NULL on 5 FKs
- `20260527170000_lock_down_idempotency_security_definer` — REVOKE EXECUTE from anon on 4
  idempotency RPCs
- `20260527180000_delete_user_data_v5_anonymise_audit_fks` — DROP NOT NULL on 4 audit columns +
  dynamic-loop guard
- `20260527200000_delete_user_data_v6_reset_job_lifecycle_timestamps` — contractor-delete branch
  nulls assigned_at + started_at (superseded by v7 below)
- `20260527210000_delete_user_data_v7_scope_lifecycle_reset_to_recycled_jobs` — fixes v6's
  unconditional null; preserves completed-job timestamps while still clearing recycled-job stamps

**Outstanding (out of scope for this PR)**

- 🟡 `assigned_at` backfill in `20260527150000` uses `updated_at` as proxy — best-effort by design;
  analytics-aware follow-up.
- 🟡 `isFullyVerified` semantic tightened in audit-63 (now requires admin review). Old mobile builds
  gating bidding on this key may block previously-bidding contractors — ship-side note for next
  mobile EAS rollout. Production impact: 1 onboarded contractor per CLAUDE.md.
- 🟡 audit-76 self-review Suggestion #2: novel PostgREST `.or('status.is.null,status.not.in.(...)')`
  syntax in `apps/web/app/api/properties/[id]/route.ts`. Other call-sites use the
  `.not('status','in','(...)')` helper instead. Should be curl-verified on staging before relying on
  the new pattern.
- Watch #2 (`properties/route.ts` includeShared service-role join) documented with
  `TODO(rls-future)`.

## Test plan

- [ ] CI green on `feat/tiered-pricing` (web + mobile tsc, lint, unit tests).
- [ ] Stage smoke: homeowner sign-up → onboarding wizard → property → post job → contractor bid →
      accept → contract sign (web + mobile) → fund escrow → start job → after-photo → confirm →
      release.
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
      any `Request body too large` 400s on `/api/contracts/[id]/accept`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
