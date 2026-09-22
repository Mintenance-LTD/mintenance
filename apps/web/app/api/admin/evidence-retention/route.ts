import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';

export const GET = withApiHandler(
  { roles: ['admin'], csrf: false },
  async (_request, { user }) => {
    await requireAdminFromDatabase(user.id);
    const results = await Promise.all([
      serverSupabase
        .from('retained_contract_records')
        .select('contract_id,archived_at,review_due_at')
        .order('review_due_at')
        .limit(50),
      serverSupabase
        .from('retained_dispute_records')
        .select('dispute_id,archived_at,review_due_at')
        .order('review_due_at')
        .limit(50),
    ]);
    if (results.some((result) => result.error))
      throw new InternalServerError('Unable to load retention reviews.');
    const records = [
      ...(results[0].data ?? []).map((row) => ({
        kind: 'contract',
        id: row.contract_id,
        archived_at: row.archived_at,
        review_due_at: row.review_due_at,
      })),
      ...(results[1].data ?? []).map((row) => ({
        kind: 'dispute',
        id: row.dispute_id,
        archived_at: row.archived_at,
        review_due_at: row.review_due_at,
      })),
    ];
    if (!records.length) return NextResponse.json({ records: [] });
    const { data: reviews, error } = await serverSupabase
      .from('evidence_retention_reviews')
      .select('record_kind,record_id,revision,legal_hold,reason,review_due_at')
      .in(
        'record_id',
        records.map((row) => row.id)
      );
    if (error)
      throw new InternalServerError('Unable to load retention decisions.');
    return NextResponse.json({
      records: records.map((row) => {
        const review = reviews?.find(
          (value) =>
            value.record_kind === row.kind && value.record_id === row.id
        );
        return {
          ...row,
          revision: review?.revision ?? 0,
          legal_hold: review?.legal_hold ?? false,
          reason: review?.reason ?? '',
        };
      }),
    });
  }
);

const decision = z
  .object({
    kind: z.enum(['contract', 'dispute']),
    id: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    legalHold: z.boolean(),
    reason: z.string().trim().min(10).max(1000),
    reviewDueAt: z.string().datetime(),
  })
  .strict();

export const POST = withApiHandler(
  { roles: ['admin'], requireMfaVerifiedWithinMinutes: 15 },
  async (request, { user }) => {
    await requireAdminFromDatabase(user.id);
    const parsed = decision.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new BadRequestError(
        'Provide a record, reason and next review date.'
      );
    const d = parsed.data;
    const { data, error } = await serverSupabase.rpc(
      'review_retained_evidence',
      {
        p_admin_id: user.id,
        p_kind: d.kind,
        p_record_id: d.id,
        p_expected_revision: d.revision,
        p_legal_hold: d.legalHold,
        p_reason: d.reason,
        p_review_due_at: d.reviewDueAt,
      }
    );
    if (error?.code === '40001')
      throw new ConflictError(
        'Another administrator changed this review. Reload before deciding.'
      );
    if (error?.code === 'P0002')
      throw new NotFoundError('Retained record not found.');
    if (error?.code === '22023')
      throw new BadRequestError(
        'Choose a future review date within 90 days for a hold, or within the next year otherwise.'
      );
    if (error || typeof data !== 'number')
      throw new InternalServerError(
        'Review was not confirmed. Reload before retrying.'
      );
    return NextResponse.json({ success: true, revision: data });
  }
);
