import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { PaymentReconciliationService } from '@/lib/services/payment/PaymentReconciliationService';

export const maxDuration = 60;
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 1, windowMs: 60_000 },
    requireMfaVerifiedWithinMinutes: 15,
  },
  async () => {
    const result = await PaymentReconciliationService.reconcile();
    return NextResponse.json(result, { status: result.errors ? 503 : 200 });
  }
);

/**
 * Admin Reconciliation Dashboard API (Issue 61)
 * Returns flagged escrow transactions with reconciliation discrepancies.
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 20 } },
  async () => {
    const { data: flaggedRecords, error: flaggedError } = await serverSupabase
      .from('escrow_transactions')
      .select(
        'id, payment_intent_id, amount, status, metadata, created_at, updated_at'
      )
      .not('metadata->reconciliation_flag', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (flaggedError) {
      logger.warn('Failed to fetch reconciliation records', {
        error: flaggedError.message,
      });
      return NextResponse.json(
        { error: 'Reconciliation records are unavailable. Please retry.' },
        { status: 503 }
      );
    }

    const records = (flaggedRecords || []).map((record) => {
      const meta = record.metadata as Record<string, unknown> | null;
      const flag =
        typeof meta?.reconciliation_flag === 'string'
          ? meta.reconciliation_flag
          : '';
      const mismatch =
        typeof meta?.mismatch_type === 'string' ? meta.mismatch_type : flag;

      return {
        id: record.id,
        payment_intent_id: record.payment_intent_id || 'unknown',
        amount: record.amount || 0,
        local_status: record.status,
        stripe_status: (meta?.stripe_status as string) || null,
        mismatch_type: mismatch.includes('amount')
          ? 'amount'
          : mismatch.includes('missing')
            ? 'missing'
            : 'status',
        flagged_at:
          typeof meta?.reconciliation_date === 'string'
            ? meta.reconciliation_date
            : record.updated_at,
        resolved: meta?.reconciliation_flag === false,
      };
    });

    const { count: totalCount, error: countError } = await serverSupabase
      .from('escrow_transactions')
      .select('id', { count: 'exact', head: true });

    if (countError || totalCount === null) {
      return NextResponse.json(
        { error: 'Reconciliation totals are unavailable. Please retry.' },
        { status: 503 }
      );
    }

    const { data: lastRun, error: runError } = await serverSupabase
      .from('payment_reconciliation_runs')
      .select('started_at,completed_at,status,checked,errors')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (runError)
      return NextResponse.json(
        { error: 'Reconciliation history is unavailable. Please retry.' },
        { status: 503 }
      );

    const stats = {
      total_transactions: totalCount || 0,
      mismatches_found: records.length,
      unresolved_count: records.filter((r) => !r.resolved).length,
      last_run: lastRun?.started_at ?? null,
      last_run_status: lastRun?.status ?? null,
      last_run_checked: lastRun?.checked ?? null,
      records_limited: records.length === 100,
    };

    return NextResponse.json({ records, stats });
  }
);
