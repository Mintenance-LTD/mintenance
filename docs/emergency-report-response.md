# Emergency report acknowledgment and ownership

An emergency report is accepted only when its report, ownership record, and first notification or
operator-alert outbox item commit together. Ordinary reports keep their existing notification
preferences. Emergency alerts bypass routine type mutes and quiet hours and remain visible in-app;
push still requires the user's push permission. No SMS, emergency-service dispatch, or repair
booking is implied.

The current property owner initially owns the report. After a **15-minute internal acknowledgment
target**, the existing five-minute notification cron transfers an unacknowledged report to a live,
accepted property admin or manager (admin first, stable user-ID ordering). This is not an on-call
rota or a guaranteed response time. Notification delivery, read state, and push receipts never
acknowledge a report. A missed, cancelled, failed, or successfully delivered alert follows the same
deadline.

If no eligible fallback exists, or the fallback also misses its target, the incident remains marked
**needs attention** and a durable, hourly-deduplicated operator alert is queued. Adding an eligible
fallback before escalation allows the next due review to pick them up. A revoked fallback cannot
view, acknowledge, or receive queued retries. The owner can still take responsibility. Operators
must arrange coverage directly; the software cannot create an available responder.

Responders use `/maintenance/emergencies`, also linked from Tenant Reports. This page is outside the
homeowner-only layout so accepted property responders with another account role can use it. Only the
live owner and currently assigned, still-authorized responder can view the description and
acknowledge. The inbox links to the existing authenticated tenant conversation, whose property-team
access rules still apply. Tenant contact data is not exposed by this inbox. Acknowledgment records
the actor and timestamp transactionally and updates the tenant's existing private report status.
Legacy owner acknowledgment controls also stop escalation; those legacy actions do not
retrospectively invent an actor. Resolving, converting, or dismissing closes escalation; reopening
starts a new cycle and clock.

## Local verification

Verified on 23 November 2026: 122 web tests across 17 suites, 79 database assertions,
10 release-gate tests, web TypeScript, and ESLint on changed application sources
(zero errors or warnings). Production was not accessed or changed; no real notifications
were sent and the migration was applied only to disposable local test data.

- `scripts/test-emergency-report-migration.mjs` executes the SQL in disposable PGlite, including
  rollback on outbox failure, missed delivery, fallback selection, repeated cron calls, revoked
  access, explicit acknowledgment, reopening, and service-only grants. CI runs it in the existing
  migration regression job.
- Web tests cover quiet hours, push opt-out, delivery failures/retries, stale recipients, intake,
  authenticated acknowledgment, failure recovery in the UI, tenant copy, and cron integration. All
  providers are mocked; Vitest disables local environment loading.
- The PGlite runner uses `PGLITE_MODULE` if supplied, otherwise the installed `@electric-sql/pglite`
  module. It never reads `DATABASE_URL` or app credentials.

## Deployment and operations (not executed by this change)

1. Apply `20261123120000_emergency_report_ownership.sql` before deploying compatible web code.
   Existing new emergency reports are backfilled as immediately due for review. The migration is
   included automatically by the release migration gate.
2. Confirm the notification-processor and operator-alerts crons run every five minutes, cron
   failures are monitored, and `platform_settings.admin_email` (or `ADMIN_EMAIL`) points to an
   actively monitored operator inbox. Verify property teams have accepted admin/manager coverage.
   Neither cron nor email delivery has been verified against production here.
3. Check pending/failed delivery independently of acknowledgment. Operators with authorized database
   access can inspect uncovered incidents with the read-only query below, then contact the property
   owner to arrange coverage. No tenant details are included in operator email.

```sql
SELECT report_id, property_id, assigned_to, due_at, escalated_at
FROM public.emergency_report_incidents
WHERE needs_attention AND acknowledged_at IS NULL AND closed_at IS NULL
ORDER BY due_at;
```

The inbox and database remain the source of responsibility if notifications are unavailable. A total
cron outage delays escalation until service resumes; a total database outage rejects new intake
instead of falsely confirming saved ownership.
