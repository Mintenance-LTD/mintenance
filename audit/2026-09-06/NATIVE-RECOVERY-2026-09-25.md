# Native recovery follow-up — 25 September 2026

Starting point: `d51d29582`, branch `codex/migrate-next-proxy`, clean working tree.

## Confirmed queue defect fixed

The legacy drain calls `getDirtyRecords('messages')`. `SyncStore` ordered all tables by
`updated_at`, but the production message-table definition and its legacy migration define only
`created_at`. Thus a fresh database, not just an upgraded installation, raises
`no such column: updated_at` and prevents the drain's combined reads from finishing.

The reader now uses `created_at` for messages and preserves `updated_at` for other allowlisted
tables. No database migration or deletion is necessary. The identifier allowlist remains enforced.

`node audit/2026-09-06/native-sync-sqlite-regression.cjs` transpiles the actual production reader
and executes it against real in-memory SQLite tables created from the production schema statements.
It failed with the observed missing-column error before the fix and passes after it. It verifies
dirty-message ordering/filtering, successful reads of users/jobs/bids, and rejection of an injected
table identifier. No network or credentials are used.

## Interruption regression coverage

Three focused Jest suites passed, 29 tests total: ContactRecovery, PropertyManagementParity, and
LegacyQueueDrain. New contact/schedule cases use deferred API promises to exercise rapid double
taps, connection failure, preserved inputs, and explicit retry with unchanged payload. Both controls
issued one request while pending and accepted a confirmed response on retry. These are component
tests with mocked API boundaries; they do not establish provider/database idempotency after a lost
success response.

Jest required explicit force-exit because of existing open handles. The test runner also emitted
existing React Native warnings; assertions passed.

## Remaining evidence

The query defect is reproduced and fixed against real SQLite. A new emulator run of the whole legacy
drain and device-level contact/schedule interruptions, including process death and lost-success
responses, remain unverified. The hosted payout-recovery migration from 24 September is still
pending. No live payment, hosted database change, invitation delivery, deployment command, tunnel,
or external test service was used in this follow-up.

## Later hosted rollout checkpoint (25 September)

The pending migration above was subsequently applied to Supabase project `ukrjudtlvapiajkjbcrd`
through the Supabase MCP. Hosted history records `20260925175927_resume_journaled_escrow_release`;
its source is `supabase/migrations/20260924205332_resume_journaled_escrow_release.sql`. This changed
the function definition and execution grants only, not payment records.

Before application, Vercel reported production deployment `dpl_AzSknUiEEqyUcZuTEQYSKvbCAXVE` READY
at main commit `c71d5cd7fc137af3691434c9101503a692d4d600`. Git confirmed that it contains
`d51d29582`, with no intervening differences in the release route or transfer service.

Read-only database checks after application confirmed pending-release retry support,
matching-operation and durable-journal requirements, preservation of the original claim, SECURITY
DEFINER with `pg_catalog, public` search path, denied execution for anon and authenticated roles,
and allowed execution for service_role. The security advisor returned seven existing findings, none
identifying this function; this is not a clean-project verdict. No live escrow claim, transfer,
refund, or payment was exercised for this rollout.

The subsequent native test setup initially could not start because Docker returned HTTP 500 and its
restart timed out. Restarting its stalled processes restored the existing local audit containers
without resetting data. A fresh synthetic fixture then encountered an HTTP 404 with no JSON response
at the local report-token route, although direct and tunneled database reads both confirmed the
synthetic property existed with the expected owner. This setup failure does not establish a
production authorization defect or a passing Android journey.

Restarting the isolated Next server resolved that routing failure. Fresh synthetic owner, manager,
team administrator, viewer and unrelated accounts completed the fixture's initial read/write
permission checks. Android then signed in as the synthetic manager.

### Device results and newly discovered gaps

- Contact save while offline: input remained visible; repeated taps resulted in one stored
  `AuditOfflineContact` record after reconnect, and the contact appeared in the list.
- After force-stop and reopening, the session restored and the same contact appeared in the property
  management screen. This verifies persistence of the completed save, not an unsaved draft.
- The real legacy queue initialized and logged zero legacy actions/dirty users/dirty messages,
  without the prior missing-column error. No dirty-message replay was exercised in this run.
- A schedule edit submitted offline and backgrounded remained on `Saving...` for several minutes
  after network recovery; the synthetic database had no corresponding update. The exact cause has
  not been isolated. Temporary API/Auth/Metro tunnel health checks returned 200.
- Code inspection independently identified an unbounded auth lookup before the HTTP timeout. The API
  client now bounds that lookup to 30 seconds, propagates cancellation, and prevents a late auth
  result from sending an abandoned request. Upload authentication uses the same bound. The focused
  real-client suite passed 39 tests; mobile TypeScript checking passed. The new deadline is
  regression-tested, but the observed device schedule hang is not yet closed.
- A separate local HTTP diagnostic discarded a successful schedule-creation response and then
  repeated the identical authenticated POST. Both returned 201 and two records persisted. Both
  diagnostic records were deleted afterward. This confirms missing creation idempotency at this
  endpoint; it was not a native lost-response simulation. A stable operation identity, atomic
  creation/replay with payload matching, and web/mobile retry coverage remain required.

Consequently this checkpoint does not close the native management interruption gate or establish
public-launch readiness. No live money or production business records were changed.
