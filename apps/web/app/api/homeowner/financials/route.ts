/**
 * GET /api/homeowner/financials
 *
 * Backs the mobile FinancialsScreen + matches the data shape the web
 * `/financials` page surfaces. Returns recent escrow transactions for
 * the homeowner and their current subscription so the mobile client can
 * stop hitting `escrow_transactions` and `subscriptions` directly.
 *
 * 2026-04-30 audit P0-1: previous mobile flow used
 * `supabase.from('escrow_transactions')` directly. Routing through this
 * endpoint keeps RLS, role checks, and any future side effects in one
 * place.
 */
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';

interface EscrowRow {
  id: string;
  amount: number | null;
  status: string | null;
  created_at: string | null;
  description: string | null;
  job: { title: string | null } | { title: string | null }[] | null;
}

interface SubscriptionRow {
  plan_type: string | null;
  status: string | null;
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (_request, { user }) => {
    // 2026-05-23 audit: the embed alias `job:job_id(title)` is the
    // PostgREST shortcut form that infers the FK relationship from
    // the column name. Switched to the explicit constraint form
    // `jobs!escrow_transactions_job_id_fkey(...)` to match the same
    // pattern used by the working `/api/payments/history` route and
    // the homeowner /financials page — avoids any ambiguity when the
    // shortcut can't resolve.
    const { data: rows, error } = await serverSupabase
      .from('escrow_transactions')
      .select(
        'id, amount, status, created_at, description, job:jobs!escrow_transactions_job_id_fkey(title)'
      )
      .eq('payer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Homeowner financials query failed', error, {
        service: 'financials',
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to load financials' },
        { status: 500 }
      );
    }

    const payments = ((rows ?? []) as unknown as EscrowRow[]).map((r) => {
      const jobField = Array.isArray(r.job) ? r.job[0] : r.job;
      return {
        id: r.id,
        amount: typeof r.amount === 'number' ? r.amount : Number(r.amount ?? 0),
        status: r.status ?? 'pending',
        created_at: r.created_at,
        job_title: jobField?.title ?? undefined,
        category: r.description ?? undefined,
      };
    });

    const { data: subRow } = await serverSupabase
      .from('subscriptions')
      .select('plan_type, status')
      .eq('user_id', user.id)
      .maybeSingle();

    const subscription = subRow
      ? {
          planType: (subRow as unknown as SubscriptionRow).plan_type ?? null,
          status: (subRow as unknown as SubscriptionRow).status ?? null,
        }
      : null;

    return NextResponse.json({
      payments,
      subscription,
    });
  }
);
