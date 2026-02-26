import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Admin Reconciliation Dashboard API (Issue 61)
 * Returns flagged escrow transactions with reconciliation discrepancies.
 */
export const GET = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 20 } }, async () => {
  const { data: flaggedRecords, error: flaggedError } = await serverSupabase
    .from('escrow_transactions')
    .select('id, payment_intent_id, amount, status, metadata, created_at, updated_at')
    .not('metadata->reconciliation_flag', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (flaggedError) {
    logger.warn('Failed to fetch reconciliation records', { error: flaggedError.message });
  }

  const records = (flaggedRecords || []).map(record => {
    const meta = record.metadata as Record<string, unknown> | null;
    const flag = meta?.reconciliation_flag as string | undefined;

    return {
      id: record.id,
      payment_intent_id: record.payment_intent_id || 'unknown',
      amount: record.amount || 0,
      local_status: record.status,
      stripe_status: (meta?.stripe_status as string) || null,
      mismatch_type: flag?.includes('amount') ? 'amount'
        : flag?.includes('missing') ? 'missing'
        : 'status',
      flagged_at: record.updated_at,
      resolved: record.status === 'released' || record.status === 'refunded',
    };
  });

  const { count: totalCount } = await serverSupabase
    .from('escrow_transactions')
    .select('id', { count: 'exact', head: true });

  const stats = {
    total_transactions: totalCount || 0,
    mismatches_found: records.length,
    unresolved_count: records.filter(r => !r.resolved).length,
    last_run: records.length > 0 ? records[0].flagged_at : null,
  };

  return NextResponse.json({ records, stats });
});
