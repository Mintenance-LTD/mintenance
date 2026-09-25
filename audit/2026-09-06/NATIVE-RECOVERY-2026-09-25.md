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
