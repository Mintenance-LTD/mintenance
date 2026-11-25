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

const reviewKinds = z.enum(['contract', 'dispute']);
const reviewFilters = z.enum(['all', 'overdue', 'soon', 'held']);
const cursorSchema = z
  .object({
    due: z.string().datetime({ offset: true }),
    kind: reviewKinds,
    id: z.string().uuid(),
  })
  .strict();

function readCursor(value: string | null) {
  if (!value) return null;
  try {
    if (value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value))
      throw new Error('Bad cursor');
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
    const params = request.nextUrl.searchParams;
    const kind = params.get('kind');
    const id = params.get('id');
    if (kind || id) {
      if (
        !reviewKinds.safeParse(kind).success ||
        !z.string().uuid().safeParse(id).success
      )
        throw new BadRequestError('Choose a valid evidence review.');
      const { data, error } = await serverSupabase
        .from('admin_evidence_review_queue')
        .select(
          'kind,id,title,archived_at,review_due_at,revision,legal_hold,reason'
        )
        .eq('kind', kind!)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw new InternalServerError('Unable to load this review.');
      if (!data)
        throw new NotFoundError('This retained record is unavailable.');
      return NextResponse.json({ review: data });
    }

    const filter = reviewFilters.safeParse(params.get('filter') ?? 'all');
    if (!filter.success) throw new BadRequestError('Invalid review filter.');
    const cursor = readCursor(params.get('after'));
    const now = new Date();
    const soon = new Date(now.valueOf() + 30 * 86400_000);
    let query = serverSupabase
      .from('admin_evidence_review_queue')
      .select('kind,id,title,archived_at,review_due_at,revision,legal_hold')
      .order('review_due_at')
      .order('kind')
      .order('id')
      .limit(51);
    if (filter.data === 'overdue')
      query = query.lt('review_due_at', now.toISOString());
    if (filter.data === 'soon')
      query = query
        .gte('review_due_at', now.toISOString())
        .lte('review_due_at', soon.toISOString());
    if (filter.data === 'held') query = query.eq('legal_hold', true);
    if (cursor) {
      // Cursor shape is validated before interpolation into PostgREST filters.
      query = query.or(
        `review_due_at.gt.${cursor.due},and(review_due_at.eq.${cursor.due},kind.gt.${cursor.kind}),and(review_due_at.eq.${cursor.due},kind.eq.${cursor.kind},id.gt.${cursor.id})`
      );
    }
    const { data, error } = await query;
    if (error)
      throw new InternalServerError('Unable to load retention reviews.');
    const records = (data ?? []).slice(0, 50);
    const last = records.at(-1);
    const next =
      data && data.length > 50 && last
        ? Buffer.from(
            JSON.stringify({
              due: last.review_due_at,
              kind: last.kind,
              id: last.id,
            })
          ).toString('base64url')
        : null;
    return NextResponse.json({ records, next });
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
    if (['PT409', '40001'].includes(error?.code ?? ''))
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
