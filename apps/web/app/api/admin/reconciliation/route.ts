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
  async (request) => {
    const params = new URL(request.url).searchParams;
    const filter = params.get('filter') ?? 'unresolved';
    if (!['all', 'unresolved'].includes(filter))
      return NextResponse.json(
        { error: 'Invalid reconciliation filter' },
        { status: 400 }
      );
    let cursor: { createdAt: string | null; id: string } | null = null;
    if (params.has('cursor')) {
      try {
        const value = params.get('cursor')!;
        if (value.length > 256 || !/^[A-Za-z0-9_-]+$/.test(value))
          throw new Error('Invalid cursor');
        cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
        if (
          !cursor ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            cursor.id
          ) ||
          (cursor.createdAt !== null &&
            (typeof cursor.createdAt !== 'string' ||
              !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
                cursor.createdAt
              ) ||
              !Number.isFinite(Date.parse(cursor.createdAt))))
        )
          throw new Error('Invalid cursor');
      } catch {
        return NextResponse.json(
          { error: 'Invalid reconciliation cursor' },
          { status: 400 }
        );
      }
    }
    let query = serverSupabase
      .from('escrow_transactions')
      .select(
        'id, payment_intent_id, amount, status, metadata, created_at, updated_at'
      )
      .not('metadata->reconciliation_flag', 'is', null);
    if (filter === 'unresolved')
      query = query.neq('metadata->>reconciliation_flag', 'false');
    if (cursor) {
      query =
        cursor.createdAt === null
          ? query.is('created_at', null).lt('id', cursor.id)
          : query.or(
              `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id}),created_at.is.null`
            );
    }
    const { data: flaggedRecords, error: flaggedError } = await query
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .limit(51);

    if (flaggedError) {
      logger.warn('Failed to fetch reconciliation records', {
        error: flaggedError.message,
      });
      return NextResponse.json(
        { error: 'Reconciliation records are unavailable. Please retry.' },
        { status: 503 }
      );
    }

    const pageRows = (flaggedRecords ?? []).slice(0, 50);
    const last = pageRows.at(-1);
    const nextCursor =
      flaggedRecords && flaggedRecords.length > 50 && last
        ? Buffer.from(
            JSON.stringify({ createdAt: last.created_at, id: last.id })
          ).toString('base64url')
        : null;
    const records = pageRows.map((record) => {
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

    const [total, observed, unresolved] = await Promise.all([
      serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true }),
      serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .not('metadata->reconciliation_flag', 'is', null),
      serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .not('metadata->reconciliation_flag', 'is', null)
        .neq('metadata->>reconciliation_flag', 'false'),
    ]);
    if (
      [total, observed, unresolved].some(
        (result) => result.error || result.count === null
      )
    ) {
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
      total_transactions: total.count,
      mismatches_found: observed.count,
      unresolved_count: unresolved.count,
      last_run: lastRun?.started_at ?? null,
      last_run_status: lastRun?.status ?? null,
      last_run_checked: lastRun?.checked ?? null,
    };

    return NextResponse.json({
      records,
      stats,
      pagination: { next_cursor: nextCursor },
    });
  }
);
