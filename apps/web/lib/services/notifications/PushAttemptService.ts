import { randomUUID } from 'crypto';
import { serverSupabase } from '@/lib/api/supabaseServer';

/** Persist before the provider call so a process crash remains detectable. */
export async function beginPushAttempt(
  userId: string,
  notificationId: string | undefined,
  deviceCount: number
) {
  const id = randomUUID();
  const { error } = await serverSupabase.from('push_dispatch_attempts').insert({
    id,
    user_id: userId,
    notification_id: notificationId ?? null,
    device_count: deviceCount,
    status: 'started',
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error('push_attempt_journal_unavailable');
  return id;
}

export async function finishPushAttempt(id: string, needsReview: boolean) {
  const { error } = await serverSupabase
    .from('push_dispatch_attempts')
    .update({
      status: needsReview ? 'needs_review' : 'recorded',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'started');
  if (error) throw new Error('push_attempt_checkpoint_failed');
}

/** Stale starts include crashes and ambiguous network outcomes. Never resend here. */
export async function reconcilePushAttempts() {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { error } = await serverSupabase
    .from('push_dispatch_attempts')
    .update({ status: 'needs_review' })
    .eq('status', 'started')
    .lt('created_at', cutoff);
  if (error) throw new Error('push_attempt_recovery_failed');
  const { count, error: countError } = await serverSupabase
    .from('push_dispatch_attempts')
    .select('id', { head: true, count: 'exact' })
    .eq('status', 'needs_review');
  if (countError) throw new Error('push_attempt_review_count_failed');
  const { error: cleanupError } = await serverSupabase
    .from('push_dispatch_attempts')
    .delete()
    .eq('status', 'recorded')
    .lt(
      'completed_at',
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    );
  if (cleanupError) throw new Error('push_attempt_cleanup_failed');
  return count ?? 0;
}
