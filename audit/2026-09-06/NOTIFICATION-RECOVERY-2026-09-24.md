# Notification recovery checkpoint

Branch: codex/migrate-next-proxy. Starting commit: 502998b4e. The worktree was clean. No SQL
migration, hosted database mutation, live notification, or deployment command was needed.

## Repaired

- HTTP 200 no longer counts as Expo acceptance without a valid successful ticket per device.
  Rejected/missing/malformed tickets leave the notification unconfirmed and queue recovery.
- Partial acceptance is stored as server-owned device IDs in queue metadata. Later retries resolve
  the recipient's current tokens and skip accepted devices. Internal retry fields are stripped from
  notification payloads. DeviceNotRegistered removes only the exact recipient/token row tested.
- Token lookup errors no longer masquerade as an empty device list. Retry-insert and worker
  checkpoint errors are checked and reported rather than silently claiming success.
- Batches obey Expo's 100-message limit. Dispatch has a 20-second network budget with at most 10
  seconds per provider request; earlier accepted devices survive later batch failure.
- push_sent means Expo accepted the outstanding messages. The dispatcher no longer writes
  delivered_at as though acceptance proved device delivery.
- Immediate delivery awaits dispatch/retry persistence before returning. Deferred delivery saves its
  in-app notification and checkpoints the existing queue row before contacting Expo.
- A database compare-and-set lease prevents overlapping workers from claiming the same due snapshot.
  Expired leases can recover; subsequent state updates are fenced by the lease value. Deterministic
  in-app IDs prevent a replay from duplicating the alert or resetting its read state.
- The worker persists accepted device IDs across retries and respects a later push opt-out. It stops
  claiming additional work after 25 seconds, leaving remaining rows due for the next run.
- The notification processor was scheduled once daily in vercel.json despite expecting frequent
  recovery. It now follows the existing five-minute recovery schedules. Engagement learning is kept
  daily in a separate authenticated cron endpoint. Database-processing errors surface as failed runs
  instead of successful cron responses.

## Verification

- 22 focused tests passed: provider ticket failures, malformed responses, partial-device retries,
  database lookup/enqueue failure, batch/network failure, concurrent workers, in-app replay,
  preference changes, awaited dispatch, existing preference/deferral behavior and cron errors.
  Provider responses and the database are simulated in these failure-injection tests.
- Three additional real local Supabase/Postgres checks passed: one winner from two concurrent
  claims, active-lease exclusion/expired-lease recovery, and recipient inability to forge queue
  metadata or scheduling. Fixtures were synthetic and removed afterward. These checks call the
  production claim helper with a real local client; they do not call Expo.
- Web type check passed before the final cron wiring; normal commit hooks verify the final staged
  source. See the commit result rather than treating that earlier check as final-tree evidence.
- Actual Android delivery and tap behavior from the preceding checkpoint remain separate evidence;
  this run did not send another real push or repeat native payment testing.

## Limits still requiring work

This is not an exactly-once delivery guarantee. If Expo accepts a message and the process stops
before recording its ticket, retry can duplicate that message. Durable ticket/receipt reconciliation
is still needed; accepted tickets alone do not prove FCM/APNs or device delivery. Legacy bulk push
paths have separate implementation and need equivalent scrutiny. Immediate delivery is awaited, but
business-operation-to-notification atomic outbox coverage is not established across all callers.

The five-minute schedule is source configuration, not proof of deployed execution. As with the
existing five-minute recovery jobs, it requires a hosting plan supporting frequent cron execution.
Full backlog performance, hosted monitoring/alert response and physical release-device checks remain
open. Evidence/processor/backup disposal and closed-account identity recovery are separate
unfinished milestones; this notification change does not resolve them.

References:
[Expo tickets and receipts](https://docs.expo.dev/push-notifications/sending-notifications/),
[Vercel cron plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Added source: NotificationQueueRetry.ts and the notification-learning route. Added tests:
NotificationPushDispatcher.test.ts, notification-claim.integration.test.ts and
notification-recovery-cron.test.ts. This report is the added audit artifact. Local runners and logs
remain ignored in isolated-stack; configuration values are not committed.
