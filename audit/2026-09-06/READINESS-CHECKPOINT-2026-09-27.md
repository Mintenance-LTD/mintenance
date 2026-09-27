# Readiness checkpoint — 27 September 2026

Public readiness remains unestablished. This checkpoint separates implemented repairs from release
and operational evidence.

## Evidence collected

- Installed emulator package com.mintenance.app is version 1.2.4 (17), without the debuggable flag.
  Android intent resolution matches invitation registration, auth callback and tenant property URLs
  as well as jobs. Its manifest has unrestricted HTTPS host filters. Current source excludes
  browser-owned invitation/auth/resident paths; the installed binary needs rebuilding and retesting.
  No production URL was opened for this check.
- Twelve mobile routing/privacy tests passed. Deep-link logging no longer includes URLs that may
  contain credentials or invitation tokens. Physical Android and iOS are unavailable.
- The www.mintenance.co.uk alias resolves to production deployment dpl_6DCVcYiLdn8mBWSgT9S2nLoGvLKM,
  main commit fb374ee5dce7227ed035b74d87687a9c46498e85. This differs from the working branch
  codex/migrate-next-proxy and its latest tested commits efc950f90 and 1e4eb65b0. Preview readiness
  is not production alignment.
- Hosted cron_job_runs has no rows in the last 48 hours; latest recorded execution is 11 June 2026.
  This is missing execution evidence, not proof that every scheduled invocation failed.
- Twenty disposal/recovery tests passed across four suites. External-file references still require
  reconciliation; the worker does not delete those files. Backup expiry/restore and closed-account
  identity/export remain unverified.

## Push receipts implemented in this change

Accepted Expo ticket IDs are stored in a private journal without raw tokens or notification text.
The scheduled worker checks due receipts, retries provider outages, expires missing receipts after
24 hours and removes only the exact rejected device token. Token rotation cannot cause deletion of
the replacement. Terminal journal rows are removed after seven days; pending rows are retained for
recovery.

Twenty notification tests and the web type check passed. Local SQL confirmed anonymous read=false,
authenticated write=false, service-role write=true. Migration
20260927100755_durable_push_receipts.sql was applied locally, then successfully applied through
Supabase MCP to the hosted project. No notifications were sent by these tests.

Provider acceptance is not proof of display or reading. See
[Expo receipt semantics](https://docs.expo.dev/push-notifications/sending-notifications/).

Remaining limitation: failure to save the ticket after provider acceptance emits an error and avoids
resending the notification, but cannot recover the lost ticket from that error alone. Crash-safe
hand-off still needs a pre-send attempt journal and a defined ambiguous-outcome policy. Production
schedule and alert delivery must be observed after deployment before closing this gate.

## Security follow-up

Fresh advisor results still flag disabled leaked-password protection and an available database
security update. Membership helper definitions inspected bind the requested user to auth.uid(); they
should not be revoked indiscriminately. spatial_ref_sys has an existing enabled write-blocking
trigger; local anonymous DELETE and authenticated UPDATE were rejected with SQLSTATE 42501. Its
broad grants therefore do not alone demonstrate a writable-table vulnerability. PostGIS functions
and remaining advisor items require individual review.

## Still required

1. Rebuild and test native invitation hand-offs, current release interruptions/permissions/deep
   links, and retained-record pagination. Physical Android/iOS are not verified.
2. Complete external-file disposal and restore/expiry evidence; verify closed-account export without
   restoring account privileges.
3. Close the push ticket hand-off gap and demonstrate scheduled recovery plus actionable operator
   alerts in the deployed release.
4. Finish security configuration/update review.
5. Align production application commit and migrations, then run acceptance against that exact
   release.

No live payments or production business records were changed. The hosted change is an additive
private receipt table and index.
