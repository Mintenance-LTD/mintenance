import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { EscrowTransaction } from '@mintenance/types';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
  status: z.string().optional(),
});

const selectFields = `
  id,
  job_id,
  payer_id,
  payee_id,
  amount,
  status,
  payment_intent_id,
  released_at,
  refunded_at,
  created_at,
  updated_at,
  job:jobs!escrow_transactions_job_id_fkey(id, title, description),
  payer:users!escrow_transactions_payer_id_fkey(first_name, last_name),
  payee:users!escrow_transactions_payee_id_fkey(first_name, last_name)
`;

type EscrowRow = {
  id: string;
  job_id: string;
  payer_id: string;
  payee_id: string;
  amount: number | string;
  status: string;
  payment_intent_id?: string | null;
  released_at?: string | null;
  refunded_at?: string | null;
  created_at: string;
  updated_at: string;
  job?: { id?: string; title?: string | null; description?: string | null } | null;
  payer?: { first_name?: string | null; last_name?: string | null } | null;
  payee?: { first_name?: string | null; last_name?: string | null } | null;
};

const mapEscrowRow = (row: EscrowRow): EscrowTransaction => ({
  id: row.id,
  jobId: row.job_id,
  payerId: row.payer_id,
  payeeId: row.payee_id,
  amount: Number(row.amount ?? 0),
  status: (['pending','held','released','refunded'].includes(row.status)
    ? (row.status as EscrowTransaction['status'])
    : 'pending'),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  paymentIntentId: row.payment_intent_id ?? undefined,
  releasedAt: row.released_at ?? undefined,
  refundedAt: row.refunded_at ?? undefined,
  job: row.job
    ? {
        title: row.job.title ?? 'Untitled Job',
        description: row.job.description ?? '',
      }
    : undefined,
  payer: row.payer
    ? {
        first_name: row.payer.first_name ?? '',
        last_name: row.payer.last_name ?? '',
      }
    : undefined,
  payee: row.payee
    ? {
        first_name: row.payee.first_name ?? '',
        last_name: row.payee.last_name ?? '',
      }
    : undefined,
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { limit, cursor, status } = parsed.data;

    let cursorIso: string | undefined;
    if (cursor) {
      const ts = Date.parse(cursor);
      if (Number.isNaN(ts)) {
        return NextResponse.json({ error: 'Invalid cursor value' }, { status: 400 });
      }
      cursorIso = new Date(ts).toISOString();
    }

    let query = serverSupabase
      .from('escrow_transactions')
      .select(selectFields)
      .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursorIso) {
      query = query.lt('created_at', cursorIso);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      logger.error('Failed to load payment history', error, { 
        service: 'payments',
        userId: user.id
      });
      return NextResponse.json({ error: 'Failed to load payments' }, { status: 500 });
    }

    const rows = (data ?? []) as EscrowRow[];
    const hasMore = rows.length > limit;
    const limitedRows = rows.slice(0, limit);
    const payments = limitedRows.map(mapEscrowRow);
    const nextCursorValue = hasMore
      ? limitedRows[limitedRows.length - 1]?.created_at
      : undefined;

    logger.info('Payment history retrieved', {
      service: 'payments',
      userId: user.id,
      paymentCount: payments.length,
      hasMore
    });

    return NextResponse.json({ payments, nextCursor: nextCursorValue, limit });
  } catch (err) {
    logger.error('Failed to load payment history', err, { 
      service: 'payments'
    });
    return NextResponse.json({ error: 'Failed to load payments' }, { status: 500 });
  }
}
