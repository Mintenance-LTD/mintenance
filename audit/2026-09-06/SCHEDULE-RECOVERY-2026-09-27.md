# Schedule recovery checkpoint — 27 September 2026

Scope: the two unresolved schedule findings in NATIVE-RECOVERY-2026-09-25.md. Starting branch
`codex/migrate-next-proxy`, commit `a97cbfce0`; working tree initially clean. This closes these
specific reproduced failures, not the entire public-launch audit.

## Changes

Both recurring-schedule creation endpoints now require a UUID Idempotency-Key and call
`create_recurring_schedule_once`. The database atomically locks a scoped retry receipt, checks the
canonical payload, creates one schedule, and records its identity. It derives the owner from the
property and checks the actor's current ownership, administrator role or accepted management
membership. Deleted schedules leave a receipt so delayed retries cannot recreate them. The function
is SECURITY INVOKER with an empty search path and service-role-only execution. The receipt table has
RLS and no public/authenticated grants or policies, intentionally.

Web creation forms preserve request identities in session storage (payload digest only). Android
preserves pending identities and payloads in encrypted SecureStore until a validated success. The
shared HTTP client now keeps its deadline active while consuming JSON/text bodies, not only until
response headers arrive. Existing authorization and subscription checks remain.

Compatibility: old clients without a creation identity receive 400 with an update/reload message.
Ship the updated mobile client with the API change; reload existing web tabs. This is deliberately
fail-closed rather than silently allowing duplicate creation. No application deployment was
performed.

## Executed evidence

- Local real-database regression: 12 concurrent identical requests produce one schedule and the same
  returned ID. Payload mismatch, unrelated actor, anonymous execution, invalid-frequency
  rollback/retry and retry after deletion all pass. Synthetic property and users removed. Reusable
  diagnostic: `schedule-idempotency-regression.cjs` (local port 55321 only).
- Local authenticated HTTP: discard first successful POST response, repeat with the same identity;
  both return 201 and exactly one schedule exists. Diagnostic schedule removed.
- Android emulator, synthetic manager, real local Auth/API/database over temporary HTTPS tunnels: at
  approximately 08:58 BST the real API committed `AuditNativeStallProbe`; the audit-only proxy sent
  an incomplete JSON response and stalled. Android recovered automatically after about 30 seconds,
  replayed the POST, and displayed the schedule. Database inspection found exactly one matching
  record. This observed automatic recovery, not a user-visible timeout alert.
- Android edit: renamed that schedule with suffix `Reconnect`, disabled Wi-Fi/mobile data, tapped
  Save, backgrounded the app, then restored connectivity and foregrounded it. The list displayed the
  new name and database inspection confirmed it; no indefinite Saving state.
- Five synthetic role fixtures passed 15 read checks, management writes, viewer/unrelated write
  denial, owner attribution, reporting-token revocation, current-member revocation, and concurrent
  invitation acceptance with one verified invited identity. No invitation email was sent.
- Focused web: 40 tests / 4 files pass, including missing/invalid operation identity rejection,
  authorization/validation, form confirmation, stale edits, and stalled JSON/text body deadlines.
- Focused mobile: 10 tests / 2 files pass (management contracts and persisted retry identities).
- Web and mobile TypeScript checks passed; shared API client compilation passed.
- `npx supabase db diff --local --workdir audit/2026-09-06/isolated-stack` completed. The isolated
  baseline trails the root history; its diff includes this new receipt/function and the prior payout
  claim change, so it is not a zero-drift claim. No destructive diff was applied.

## SQL rollout

Local migration: `20260927072513_idempotent_recurring_schedule_creation.sql`. Applied to hosted
project `ukrjudtlvapiajkjbcrd` through Supabase MCP as version `20260927073843`, name
`idempotent_recurring_schedule_creation`. Read-only verification confirmed SECURITY INVOKER, empty
search path, service-only execution, RLS, and denied anon/authenticated receipt reads. Advisor INFO
for RLS without policies on the receipt table is intentional. Existing unrelated advisor findings
remain; this is not a clean security-advisor verdict. The migration adds objects and changes no
production business records.

## Limits and cleanup

These checks cover the two previously reproduced native failures. They do not establish iOS,
physical-device, every operating-system interruption, or pending-creation process-death recovery.
SecureStore retry persistence is unit-tested; a completed-save app restart was initiated but this
run did not finish a fresh UI assertion after restart, so it is not counted as another device pass.
The fault proxy and fixtures are ignored local diagnostic files, not production test branches.

The fixture controller completed its cleanup, deleting the synthetic property, subscriptions and
five auth users, and removing its credential file. Test tunnels, owned Next/Metro processes and the
dedicated emulator were closed. Docker data and unrelated services were preserved. No live money,
real-account login, production business-data mutation, or deployment occurred.
