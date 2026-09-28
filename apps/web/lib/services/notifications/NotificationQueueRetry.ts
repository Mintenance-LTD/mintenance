import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export interface QueuedNotificationRow {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  action_url: string | null;
  metadata: Record<string, unknown> | null;
  status: 'pending' | 'failed_push' | string;
  retry_count: number | null;
  scheduled_for: string;
}

/** Lease a due snapshot once; a worker crash becomes retryable after five minutes. */
export async function claimQueuedNotification(
  row: QueuedNotificationRow
): Promise<boolean> {
  if (new Date(row.scheduled_for).getTime() > Date.now()) return false;
  const leaseUntil = new Date(Date.now() + 5 * 60_000).toISOString();
  const { data, error } = await serverSupabase
    .from('notification_queue')
    .update({ scheduled_for: leaseUntil })
    .eq('id', row.id)
    .eq('status', row.status)
    .eq('scheduled_for', row.scheduled_for)
    .select('id')
    .maybeSingle();
  if (error) throw new Error('notification_claim_failed');
  if (!data) return false;
  row.scheduled_for = leaseUntil;
  return true;
}

/**
 * Maximum number of retries before a queue row is marked terminally
 * failed. Six attempts with the backoff schedule below is ~32 minutes
 * of total wall-clock — long enough to ride out a brief Expo outage
 * but short enough that we don't keep a permanently-broken token in
 * the queue forever.
 */
export const MAX_RETRY_COUNT = 6;

/**
 * Compute the next scheduled_for timestamp from the current retry
 * count using exponential backoff (1m, 2m, 4m, 8m, 16m, 32m). Capped
 * at 1 hour to bound worst-case lag for transient Expo failures.
 */
function nextRetryAt(retryCount: number): Date {
  const delayMinutes = Math.min(60, 2 ** retryCount);
  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

/**
 * Increment retry_count + reschedule (or mark terminally failed if
 * the budget is exhausted). Shared between the pending and
 * failed_push paths so retry semantics stay identical.
 */
export async function bumpRetryOrFail(
  queuedNotif: QueuedNotificationRow,
  reason: string
): Promise<void> {
  const nextCount = (queuedNotif.retry_count ?? 0) + 1;
  const terminal = nextCount >= MAX_RETRY_COUNT;

  if (terminal) {
    const { error } = await serverSupabase
      .from('notification_queue')
      .update({
        status: 'failed',
        error_message: reason,
        retry_count: nextCount,
        metadata: queuedNotif.metadata,
        last_retry_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', queuedNotif.id)
      .eq('scheduled_for', queuedNotif.scheduled_for);
    if (error) throw new Error('notification_failure_checkpoint_failed');
    logger.warn('Queued notification exhausted retries', {
      service: 'notification-processor',
      queueId: queuedNotif.id,
      userId: queuedNotif.user_id,
      reason,
    });
    return;
  }

  const next = nextRetryAt(nextCount);
  const { error } = await serverSupabase
    .from('notification_queue')
    .update({
      // Preserve the original status so the next pass routes it
      // through the same branch (pending vs failed_push).
      error_message: reason,
      retry_count: nextCount,
      metadata: queuedNotif.metadata,
      last_retry_at: new Date().toISOString(),
      scheduled_for: next.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', queuedNotif.id)
    .eq('scheduled_for', queuedNotif.scheduled_for);
  if (error) throw new Error('notification_retry_checkpoint_failed');

  logger.info('Queued notification rescheduled for retry', {
    service: 'notification-processor',
    queueId: queuedNotif.id,
    userId: queuedNotif.user_id,
    retryCount: nextCount,
    nextAt: next.toISOString(),
    reason,
  });
}
