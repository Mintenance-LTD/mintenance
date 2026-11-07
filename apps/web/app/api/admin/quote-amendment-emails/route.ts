import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';
import { emailReviewRequest } from '@/lib/operations/quote-amendment-email-review';
const headers = { 'Cache-Control': 'private, no-store' };
const params = z
  .object({
    view: z.enum(['open', 'reviewed']).default('open'),
    before: z.coerce
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
    amendment_id: z.string().uuid().optional(),
    version: z.coerce.number().int().positive().optional(),
  })
  .strict()
  .refine((v) => Boolean(v.amendment_id) === Boolean(v.version));

export const GET = withApiHandler(
  { roles: ['admin'], requireDbAdmin: true },
  async (request, { user }) => {
    const admin = await serverSupabase
      .from('profiles')
      .select('role,deleted_at')
      .eq('id', user.id)
      .maybeSingle();
    if (admin.error || admin.data?.role !== 'admin' || admin.data.deleted_at)
      throw new ForbiddenError('Current active admin access required.');
    const input = params.safeParse(
      Object.fromEntries(new URL(request.url).searchParams)
    );
    if (!input.success) throw new BadRequestError('Invalid review filter.');
    const p = input.data;
    if (p.amendment_id && p.version) {
      const { data, error } = await serverSupabase
        .from('quote_amendment_email_reviews')
        .select(
          'request_id,amendment_id,version,review_version,action,evidence,note,result_status,previous_status,previous_attempts,previous_error_code,created_at'
        )
        .eq('amendment_id', p.amendment_id)
        .eq('version', p.version)
        .order('review_version', { ascending: false })
        .limit(20);
      if (error)
        throw new InternalServerError('Email review history unavailable.');
      return NextResponse.json({ reviews: data ?? [] }, { headers });
    }
    let query = serverSupabase
      .from('quote_amendment_email_outbox')
      .select(
        'amendment_id,version,job_id,action,status,attempts,error_code,created_at,review_version,review_sequence'
      )
      .order('review_sequence', { ascending: false })
      .limit(26);
    query =
      p.view === 'open'
        ? query.in('status', ['failed', 'needs_review'])
        : query.neq('review_version', 0);
    if (p.before) query = query.lt('review_sequence', p.before);
    const { data, error } = await query;
    if (error)
      throw new InternalServerError('Email recovery queue unavailable.');
    const rows = (data ?? []).slice(0, 25);
    return NextResponse.json(
      {
        rows,
        next_before: (data?.length ?? 0) > 25 ? rows[24].review_sequence : null,
      },
      { headers }
    );
  }
);

export const POST = withApiHandler(
  { roles: ['admin'], requireDbAdmin: true },
  async (request, { user }) => {
    const input = emailReviewRequest.safeParse(await request.json());
    if (!input.success)
      throw new BadRequestError(
        'Confirm the action and enter matching evidence with a note of 20 to 2,000 characters.'
      );
    const p = input.data;
    const { data, error } = await serverSupabase.rpc(
      'review_quote_amendment_email',
      {
        p_actor: user.id,
        p_request: p.request_id,
        p_amendment: p.amendment_id,
        p_version: p.version,
        p_expected_review: p.expected_review_version,
        p_action: p.action,
        p_evidence: p.evidence,
        p_note: p.note,
      }
    );
    if (error?.code === '42501')
      throw new ForbiddenError('Current admin access required.');
    if (error?.code === 'P0002') throw new NotFoundError('Email not found.');
    if (['40001', '23505'].includes(error?.code ?? ''))
      throw new ConflictError(
        'The email or amendment changed. Refresh before reviewing again.'
      );
    if (error?.code === '22023')
      throw new BadRequestError('Review evidence is invalid.');
    if (error || !data)
      throw new InternalServerError(
        'Review could not be confirmed. Retry the same request or reload its history.'
      );
    return NextResponse.json({ review: data }, { headers });
  }
);
