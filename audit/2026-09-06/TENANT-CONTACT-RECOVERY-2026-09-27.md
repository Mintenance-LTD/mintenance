# Tenant contact interruption recovery � 27 September 2026

Implemented pending-submit recovery in the native tenant contact form. Details are written to Expo
SecureStore before POST, scoped to account/property, restored when the form remounts, and removed
after confirmed success or explicit discard. Unsubmitted keystrokes are not persisted. Storage
failures prevent sending a new save.

The API optionally derives the contact primary key from actor, property and operation UUID. Existing
primary-key uniqueness prevents concurrent inserts of the same operation while the contact exists.
Authorized matching replays return the saved contact without repeating invitation delivery; changed
payloads return 409. Existing callers without an operation ID retain their existing behavior. No SQL
migration is needed.

Verification: 22 focused server tests passed (contact confirmation and invitation identity); 17
focused mobile tests passed before adding the explicit discard regression. Normal commit hooks
passed for edf9c351f. API/database behavior in these suites is mocked; this is not evidence of a
force-stopped Android release or live database concurrency test.

Remaining acceptance: build against the updated server in an isolated environment, terminate Android
after submission but before its response, reopen and retry, and verify one contact and no duplicate
invitation. Test offline/auth expiry and SecureStore failure on the release build. Physical
Android/iOS remain unavailable. A fresh APK is required; the currently installed APK does not
contain this change.

Limits: pending contact PII remains encrypted until confirmation or explicit discard. Automatic
expiry/account-deletion cleanup is still part of the retention gate. Operation identity is tied to
the contact row, not a permanent operation journal; removal of that row before a delayed retry
requires additional reconciliation/tombstone coverage. This change does not close the broader native
or retention readiness gates. No production data or live payments were changed.

## Database replay guard follow-up

Migration `20260927142309_prevent_deleted_contact_replay.sql` now reserves consumed contact UUIDs
transactionally. The ledger stores only the UUID, with no contact fields, actor/property references
or payload. Existing contact UUIDs were backfilled. Its unique constraint serializes simultaneous
saves; reservations roll back with failed inserts and survive contact deletion. IDs cannot be
changed after insertion.

Executed against isolated Docker Postgres: deletion/replay rejection, failed-insert rollback
followed by successful correction, immutable ID, privilege assertions, and a real two-session
concurrent insert. All passed. The API regression suite passed 14 tests including HTTP 410 for a
deleted contact operation. The earlier deletion-before-retry limitation is addressed by this
migration; native force-stop acceptance remains open.

Applied through Supabase MCP to the authorized hosted project on 27 September. Verified RLS enabled,
anonymous/authenticated reads denied, service-role read allowed but ledger deletion denied, direct
trigger-function execution denied to authenticated users, and trigger enabled. No synthetic contact
records were added to the hosted database.

The requested local schema diff was attempted with the installed Supabase CLI. Shadow replay stopped
at existing migration `20260830090100_message_bid_hot_path_indexes.sql`: CREATE INDEX CONCURRENTLY
cannot be executed within a pipeline. This prevents claiming a clean full migration replay; the new
migration was separately applied and exercised transactionally in the isolated database.

The CLI-created migration file was renamed to the hosted MCP-assigned version `20260927142309`,
avoiding a duplicate pending migration on a later CLI push.

## Executed Android diagnostic interruption test

Executed on isolated emulator-5556 using the existing diagnostic Android native shell and current
Metro JavaScript, with a separate web checkout at f65a5469b and local Supabase. The user's
emulator-5554 and installed standalone APK were not changed. Temporary HTTPS Auth/API/Metro tunnels
were used under existing authorization.

- Synthetic homeowner authenticated through the app, completed/skipped the normal introductory UI,
  opened its property and Manage tab, and submitted a contact with no email (no external invitation
  delivery).
- First ordinary save returned 201. A subsequent delayed-response attempt was automatically retried
  by the API client and returned 200; database count remained one. This verified retry deduplication
  but did NOT test pending draft restoration because retry finished before manual termination.
- Corrected the diagnostic harness to call ADB force-stop immediately after the local API committed
  another synthetic contact and began an incomplete response. The POST returned 201 internally at
  14:52:10 UTC; the harness recorded immediate process termination. Independently checked one
  database row.
- Relaunched the app, restored the authenticated session, navigated back to Manage, and observed the
  original pending name in the editable form without retyping it.
- Pressed Add Tenant. The API returned 200 at 14:54 UTC; the form closed, the contact appeared in
  the list, and a separate database query still counted exactly one matching contact.
- Deleted the synthetic property/account and temporary credential fixture afterward. Closed all
  three tunnels, the isolated API and Metro processes, and emulator-5556. No production
  contact/payment records were created or changed.

The diagnostic Metro asset URLs used HTTP for the icon font while Android requires HTTPS. This
exposed a collapsed icon-only Add tenant action. Added a visible label and a 44-point minimum touch
height; verified the action appeared and worked in the emulator. Fonts remained a diagnostic-build
limitation. Cold local route compilation also caused initial request timeouts; warming/retrying the
real routes succeeded. These are not release-performance measurements.

This is real native process-termination evidence for the updated contact component, encrypted
storage, authenticated API and database. It does not replace fresh standalone-release APK
acceptance, iOS/physical-device checks, the broader management interruption matrix, or local draft
retention/expiry work. No release APK was built or deployed in this follow-up.
