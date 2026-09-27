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
