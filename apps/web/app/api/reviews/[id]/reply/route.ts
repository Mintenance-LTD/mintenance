/**
 * POST /api/reviews/:id/reply — R7 #19 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Contractor right-of-reply. Writes `reviews.response` +
 * `reviews.response_at`. The `publish-review-replies` cron promotes
 * `response_published_at` 48 hours later, unless an admin intervenes.
 *
 * Only the contractor the review is ABOUT can reply. One reply per review.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors/api-error';
import { sanitizeText } from '@/lib/sanitizer';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const bodySchema = z.object({
  response: z
    .string()
    .min(10, 'Your reply needs at least 10 characters')
    .max(2000, 'Your reply cannot exceed 2000 characters')
    .transform((v) => sanitizeText(v, 2000)),
});

export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      throw new BadRequestError('Invalid review id');
    }
    const reviewId = parsedParams.data.id;

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message ?? 'Invalid reply'
      );
    }

    const { data: review, error: fetchErr } = await serverSupabase
      .from('reviews')
      .select(
        'id, contractor_id, response, response_at, response_blocked_by_admin'
      )
      .eq('id', reviewId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!review) throw new NotFoundError('Review not found');

    if (review.contractor_id !== user.id) {
      throw new ForbiddenError('Only the reviewed contractor can reply');
    }
    if (review.response_blocked_by_admin) {
      throw new ForbiddenError('Replies on this review have been blocked');
    }
    if (review.response) {
      throw new BadRequestError(
        'You have already replied to this review; edit support coming later'
      );
    }

    const { data: updated, error: updErr } = await serverSupabase
      .from('reviews')
      .update({
        response: parsed.data.response,
        response_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select('id, response, response_at')
      .single();
    if (updErr || !updated) throw updErr ?? new Error('Failed to store reply');

    return NextResponse.json({
      success: true,
      review: updated,
      publishedIn: '48 hours',
    });
  }
);
