/**
 * Admin review-moderation queue — R7 #19 deferred follow-up #9.
 *
 * GET    /api/admin/review-moderation         list pending replies
 * POST   /api/admin/review-moderation          { reviewId, action: 'approve' | 'block' }
 *
 * "Pending" = a reply the contractor submitted (response_at IS NOT NULL)
 * that's still inside the 48-hour moderation window
 * (response_published_at IS NULL) and hasn't already been blocked.
 * `approve` publishes the reply immediately (sets response_published_at = now()).
 * `block`   flips response_blocked_by_admin = true so the cron skips it.
 *
 * Admin-only + requires a fresh MFA step-up for mutations to prevent a
 * long-lived session from silently censoring a reply.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';

export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 60 } },
  async (_request, { user }) => {
    const { data: rows, error } = await serverSupabase
      .from('reviews')
      .select(
        `id, rating, comment, response, response_at, response_blocked_by_admin,
         reviewee_id,
         reviewer:profiles!reviews_reviewer_id_fkey ( id, first_name, last_name ),
         contractor:profiles!reviews_reviewee_id_fkey ( id, first_name, last_name, company_name ),
         job:jobs!reviews_job_id_fkey ( id, title )`
      )
      .not('response_at', 'is', null)
      .is('response_published_at', null)
      .eq('response_blocked_by_admin', false)
      .order('response_at', { ascending: true })
      .limit(50);

    if (error) {
      throw error;
    }

    const out = (rows || []).map((r) => {
      const reviewer = Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer;
      const contractor = Array.isArray(r.contractor)
        ? r.contractor[0]
        : r.contractor;
      const job = Array.isArray(r.job) ? r.job[0] : r.job;
      const respondedAt = r.response_at as string;
      const publishAt = new Date(
        new Date(respondedAt).getTime() + 48 * 3600 * 1000
      ).toISOString();
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment || '',
        response: r.response || '',
        respondedAt,
        publishesAt: publishAt,
        reviewerName: reviewer
          ? `${reviewer.first_name ?? ''} ${reviewer.last_name ?? ''}`.trim() ||
            'Homeowner'
          : 'Homeowner',
        contractorId: r.reviewee_id,
        contractorName: contractor
          ? `${contractor.first_name ?? ''} ${contractor.last_name ?? ''}`.trim() ||
            contractor.company_name ||
            'Contractor'
          : 'Contractor',
        jobTitle: job?.title || null,
      };
    });

    return NextResponse.json({ adminUserId: user.id, reviews: out });
  }
);

const actionSchema = z.object({
  reviewId: z.string().uuid(),
  action: z.enum(['approve', 'block']),
});

export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 30 },
    requireMfaVerifiedWithinMinutes: 15,
  },
  async (request, { user }) => {
    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('Invalid payload');
    }
    const { reviewId, action } = parsed.data;

    const { data: review } = await serverSupabase
      .from('reviews')
      .select(
        'id, response, response_at, response_published_at, response_blocked_by_admin'
      )
      .eq('id', reviewId)
      .maybeSingle();
    if (!review) throw new NotFoundError('Review not found');
    if (!review.response || !review.response_at) {
      throw new BadRequestError('No reply to moderate on this review yet');
    }

    const update: Record<string, unknown> = {};
    if (action === 'approve') {
      if (review.response_published_at) {
        throw new BadRequestError('This reply is already published');
      }
      update.response_published_at = new Date().toISOString();
      update.response_blocked_by_admin = false;
    } else {
      // 'block'
      update.response_blocked_by_admin = true;
      update.response_published_at = null;
    }

    const { error: updErr } = await serverSupabase
      .from('reviews')
      .update(update)
      .eq('id', reviewId);
    if (updErr) throw updErr;

    // Append a small audit row so the admin console can show who did what.
    await serverSupabase.from('admin_activity_log').insert({
      admin_id: user.id,
      action_type:
        action === 'approve' ? 'review_reply_approved' : 'review_reply_blocked',
      action_category: 'moderation',
      target_type: 'review',
      target_id: reviewId,
      description:
        action === 'approve'
          ? 'Admin approved a review reply (early publish)'
          : 'Admin blocked a review reply from publication',
      metadata: { via: 'review-moderation-queue' },
    });

    return NextResponse.json({ success: true, action });
  }
);
