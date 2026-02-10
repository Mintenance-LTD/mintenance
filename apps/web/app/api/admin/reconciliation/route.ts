import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Admin Reconciliation Dashboard API (Issue 61)
 * Returns flagged escrow transactions with reconciliation discrepancies.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 20,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter || 60) } },
      );
    }

    const adminResult = await requireAdmin(request);
    if (isAdminError(adminResult)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch escrow transactions that have been flagged
    const { data: flaggedRecords, error: flaggedError } = await serverSupabase
      .from('escrow_transactions')
      .select('id, payment_intent_id, amount, status, metadata, created_at, updated_at')
      .not('metadata->reconciliation_flag', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (flaggedError) {
      logger.warn('Failed to fetch reconciliation records', { error: flaggedError.message });
    }

    // Build response records
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

    // Compute stats
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
  } catch (err) {
    return handleAPIError(err instanceof Error ? err : new Error('Reconciliation fetch failed'));
  }
}
