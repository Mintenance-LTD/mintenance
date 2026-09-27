# Scheduler activation and mobile session recovery

The owner explicitly authorized production scheduling on 27 September 2026. The Vercel
mintenance-clean Cron Jobs switch was changed from Disabled to Enabled before the 17:00 UTC cycle.
No individual Run button was used. The hosted deployment remained
ebb93e09adf5f911bc6b3743c550c0824a318579. This supersedes the disabled-state observation in
OPERATIONS-RELEASE-2026-09-27.md; it does not establish public-launch readiness.

The first scheduled cycle recorded completed runs for all eight five-minute recovery workers.
Payment reconciliation checked three records: two mismatches and one missing Stripe reference. The
hourly auto-release worker evaluated two records and reported two errors, zero releases. These are
unresolved operational findings, not successful financial recovery. No records were manually
corrected and no payment or refund was manually initiated. The operator must review the durable
reconciliation records before deciding how to correct historical payment state.

The status classifier now treats positive reconciliation mismatch/missing counts, error counts and
queued notification errors as needing attention even when a worker reports success. Fifteen focused
web tests pass. Actual failure-alert delivery remains unverified; the earlier Vercel test email only
verified the email channel. The overdue hosting invoice warning remains.

## Mobile data failure

The owner reported dashboard and other screens failing again, then confirmed that signing out and
signing back in restored data. Production logs showed 401 responses for jobs and appointments. This
establishes session-related recovery, but no private token or device trace was captured to prove the
exact timeout type on that device.

Source inspection and regression tests reproduced the missing recovery behavior: a 401 causes one
token refresh, but a second 401 previously left the app in authenticated navigation. A refreshed
Supabase token retains its original session; it cannot extend the server's absolute session
lifetime. The client now signs out the local session after a second 401, including upload requests.
Permission errors still preserve the session. SecureStore restoration now uses the token returned by
setSession, which may refresh it, instead of sending the stale saved token. No server timeout,
revocation or ownership control was relaxed.

All 42 real API-client tests (mock HTTP and Supabase collaborators) and the mobile TypeScript check
pass. Android versionCode is incremented to 25 for the next standalone internal build. This is not
yet evidence of an installed release passing the same scenarios.

Still open: two-cycle scheduling verification, payment discrepancy review, durable failure alerts,
external-file disposal, backup restore/expiry, closed-account exports, final native release checks
and physical Android/iOS acceptance.
