import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const swipeSchema = z
  .object({
    action: z.enum(['like', 'pass', 'super_like', 'maybe']),
    itemId: z.string().uuid(),
    itemType: z.literal('job'),
  })
  .strict();

/**
 * POST /api/discover/swipe
 *
 * Contractor-only. Tracks job views and, on a "like" or "super_like",
 * auto-creates a draft bid so the contractor can iterate on the
 * amount/message later.
 *
 * The homeowner swipe path was removed 2026-05-10 — homeowners don't
 * discover contractors; they post jobs and accept bids. The legacy
 * homeowner branch wrote to `contractor_matches` with columns that did
 * not exist (homeowner_id, action) and a unique constraint that never
 * existed, so every call 500'd. See audit notes in CLAUDE.md.
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 }, roles: ['contractor'] },
  async (request, { user }) => {
    const validation = await validateRequest(request, swipeSchema);
    if (validation instanceof NextResponse) return validation;
    const { action, itemId } = validation.data;

    const { requireSubscriptionForAction } =
      await import('@/lib/middleware/subscription-check');
    const subscriptionCheck = await requireSubscriptionForAction(
      request,
      'swipe_job'
    );
    if (subscriptionCheck) return subscriptionCheck;

    // Always track view when contractor sees a job
    await serverSupabase.from('job_views').upsert(
      {
        job_id: itemId,
        contractor_id: user.id,
        viewed_at: new Date().toISOString(),
      },
      { onConflict: 'job_id,contractor_id' }
    );

    if (action === 'like' || action === 'super_like') {
      const { data: existingBid } = await serverSupabase
        .from('bids')
        .select('id')
        .eq('job_id', itemId)
        .eq('contractor_id', user.id)
        .single();

      if (!existingBid) {
        const { data: job } = await serverSupabase
          .from('jobs')
          .select('budget')
          .eq('id', itemId)
          .single();
        const bidAmount = job?.budget ? parseFloat(job.budget.toString()) : 0;

        await serverSupabase.from('bids').insert({
          job_id: itemId,
          contractor_id: user.id,
          amount: bidAmount,
          status: 'pending',
          message:
            action === 'super_like' ? 'Super interested in this job!' : '',
        });
      }

      return NextResponse.json({
        success: true,
        action: 'like',
        matched: false,
      });
    }

    if (action === 'pass') {
      return NextResponse.json({ success: true, action: 'pass' });
    }

    throw new BadRequestError(`Unsupported swipe action: ${action}`);
  }
);
