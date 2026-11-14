import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedNotification } from './feed';
const funded = new Set([
  'held',
  'awaiting_homeowner_approval',
  'pending_review',
  'release_pending',
  'released',
  'completed',
  'disputed',
  'refunded',
]);
/** Annotate only the exact payment attempt owned by this recipient. Never infer from a similar job/title. */
export async function annotatePaymentAlerts(
  db: SupabaseClient,
  userId: string,
  rows: FeedNotification[]
): Promise<FeedNotification[]> {
  const alerts = rows.filter((row) =>
    ['payment_failed', 'payment_requires_action'].includes(row.type)
  );
  const ids = [
    ...new Set(
      alerts
        .map((row) => row.metadata?.paymentIntentId)
        .filter(
          (id): id is string =>
            typeof id === 'string' && /^pi_[A-Za-z0-9]+$/.test(id)
        )
    ),
  ];
  if (!ids.length) return rows;
  const { data, error } = await db
    .from('escrow_transactions')
    .select('payment_intent_id,status')
    .eq('payer_id', userId)
    .in('payment_intent_id', ids);
  if (error) return rows;
  const statuses = new Map(
    (data ?? []).map((row) => [row.payment_intent_id, row.status])
  );
  return rows.map((row) => {
    const id = row.metadata?.paymentIntentId;
    if (!alerts.includes(row) || typeof id !== 'string') return row;
    const status = statuses.get(id);
    if (!status || !funded.has(status)) return row;
    return {
      ...row,
      title: 'Earlier payment alert — no longer current',
      message:
        row.message +
        ' This attempt subsequently funded the job. Open the payment record for its current status.',
      metadata: {
        ...row.metadata,
        paymentAlertResolved: true,
        paymentStatus: status,
      },
    };
  });
}
