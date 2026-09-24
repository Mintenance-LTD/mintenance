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

const cursorSchema = z
  .object({
    archivedAt: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
  })
  .strict();

function readCursor(value: string | null) {
  if (!value) return null;
  try {
    if (value.length > 512) throw new Error('Cursor too long');
    return cursorSchema.parse(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    );
  } catch {
    throw new BadRequestError('Invalid review cursor. Reload reviews.');
  }
}

export const GET = withApiHandler(
  { roles: ['admin'], csrf: false },
  async (request, { user }) => {
    await requireAdminFromDatabase(user.id);
    const params = new URL(request.url).searchParams;
    const contractCursor = readCursor(params.get('contractAfter'));
    const disputeCursor = readCursor(params.get('disputeAfter'));
    function archiveQuery(
      table: string,
      idColumn: 'contract_id' | 'dispute_id',
      cursor: ReturnType<typeof readCursor>
    ) {
      let query = serverSupabase
        .from(table)
        .select(
          idColumn === 'contract_id'
            ? 'id:contract_id,archived_at,review_due_at'
            : 'id:dispute_id,archived_at,review_due_at'
        )
        .order('archived_at')
        .order(idColumn)
        .limit(51);
      if (cursor) {
        // Both values are strictly validated before entering PostgREST filter syntax.
        query = query.or(
          `archived_at.gt.${cursor.archivedAt},and(archived_at.eq.${cursor.archivedAt},${idColumn}.gt.${cursor.id})`
        );
      }
      return query;
    }
    const results = await Promise.all([
      archiveQuery('retained_contract_records', 'contract_id', contractCursor),
      archiveQuery('retained_dispute_records', 'dispute_id', disputeCursor),
    ]);
    if (results.some((result) => result.error))
      throw new InternalServerError('Unable to load retention reviews.');
    const records = [
      ...(results[0].data ?? []).slice(0, 50).map((row) => ({
        kind: 'contract',
        id: row.id,
        archived_at: row.archived_at,
        review_due_at: row.review_due_at,
      })),
      ...(results[1].data ?? []).slice(0, 50).map((row) => ({
        kind: 'dispute',
        id: row.id,
        archived_at: row.archived_at,
        review_due_at: row.review_due_at,
      })),
    ];
    // Keep each stream's last position even when the other stream has more pages.
    const nextParams = new URLSearchParams();
    for (const [kind, previous] of [
      ['contract', contractCursor],
      ['dispute', disputeCursor],
    ] as const) {
      const last = records.filter((row) => row.kind === kind).at(-1);
      const cursor = last
        ? { archivedAt: last.archived_at, id: last.id }
        : previous;
      if (cursor)
        nextParams.set(
          `${kind}After`,
          Buffer.from(JSON.stringify(cursor)).toString('base64url')
        );
    }
    const next = results.some((result) => (result.data?.length ?? 0) > 50)
      ? nextParams.toString()
      : null;
    if (!records.length) return NextResponse.json({ records: [], next: null });
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
      next,
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
