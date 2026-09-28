# Recovery status visibility

The admin dashboard previously described infrastructure efficiency using a percentage derived from
the number of jobs. That did not measure recovery execution and could look healthy while the hosting
scheduler was disabled. The invented percentage has been removed.

A new read-only panel checks nine recovery workers directly from `cron_job_runs`, independently of
scheduled jobs. The API requires the admin role and a fresh database role lookup. It returns only
worker names, status and timestamps; raw errors, job payloads and customer details are not returned.
Reads use the existing `(job_name, started_at DESC)` index and limit each query to one row. There
are two reads per worker (latest run and latest successful run).

Five-minute workers become overdue after 15 minutes without a recent run; daily evidence disposal
uses a 26-hour tolerance. A running job older than five minutes is overdue. Repeated starts cannot
conceal a missing or stale completed run. Failed lookups, malformed timestamps, future timestamps
and incomplete success records are unverified. Known unresolved result counts show Needs review even
if the worker marked its execution successful.

The client refreshes once per minute while active and supports manual retry. A failed refresh hides
previously loaded rows instead of continuing to show them as current. The panel explicitly states
that a completed run does not prove delivery or every provider action succeeded.

Verification: 11 focused tests passed. They cover missing/stale/failed execution, stuck and repeated
starts, timestamp inconsistency, unresolved outcomes, schedule-contract alignment, bounded database
calls, sanitized responses, database-admin denial and UI refresh failure/retry. The UI test uses the
real React Query implementation; database and auth wrappers are mocked. These tests are not proof of
deployed scheduler execution or end-to-end administrator login.

No SQL, production scheduler settings, financial records or live notifications are changed by this
implementation. This is operator visibility, not an independent alerting watchdog. Hosted cron
activation, real failure alerts, and production acceptance of this panel remain open. Retention
external-file disposal, backup restore/expiry and closed-account exports remain open; the existing
disposal worker deliberately holds external references for reconciliation.
