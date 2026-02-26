import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const swipeSchema = z.object({
  action: z.enum(['like', 'pass', 'super_like', 'maybe']),
  itemId: z.string().uuid(),
  itemType: z.enum(['job', 'contractor']),
});

/**
 * POST /api/discover/swipe
 * Handle swipe actions on the Discover page
 * For contractors: tracks job views and creates bid/interest
 * For homeowners: tracks contractor matches
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, swipeSchema);
    if (validation instanceof NextResponse) return validation;
    const { action, itemId, itemType } = validation.data;

    const isContractor = user.role === 'contractor';
    const isHomeowner = user.role === 'homeowner';

    // For contractors swiping on jobs
    if (isContractor && itemType === 'job') {
      const { requireSubscriptionForAction } = await import('@/lib/middleware/subscription-check');
      const subscriptionCheck = await requireSubscriptionForAction(request, 'swipe_job');
      if (subscriptionCheck) return subscriptionCheck;

      // Always track view when contractor sees a job
      await serverSupabase
        .from('job_views')
        .upsert({ job_id: itemId, contractor_id: user.id, viewed_at: new Date().toISOString() }, { onConflict: 'job_id,contractor_id' });

      if (action === 'like' || action === 'super_like') {
        const { data: existingBid } = await serverSupabase
          .from('bids')
          .select('id')
          .eq('job_id', itemId)
          .eq('contractor_id', user.id)
          .single();

        if (!existingBid) {
          const { data: job } = await serverSupabase.from('jobs').select('budget').eq('id', itemId).single();
          const bidAmount = job?.budget ? parseFloat(job.budget.toString()) : 0;

          await serverSupabase.from('bids').insert({
            job_id: itemId,
            contractor_id: user.id,
            amount: bidAmount,
            status: 'pending',
            message: action === 'super_like' ? 'Super interested in this job!' : '',
          });
        }

        return NextResponse.json({ success: true, action: 'like', matched: false });
      }

      return NextResponse.json({ success: true, action: 'pass' });
    }

    // For homeowners swiping on contractors
    if (isHomeowner && itemType === 'contractor') {
      const matchAction = action === 'like' || action === 'super_like' ? 'like' : 'pass';

      const { error: matchError } = await serverSupabase
        .from('contractor_matches')
        .upsert({
          homeowner_id: user.id,
          contractor_id: itemId,
          action: matchAction,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'homeowner_id,contractor_id' });

      if (matchError) {
        logger.error('Error saving contractor match', matchError, { service: 'discover', userId: user.id, contractorId: itemId });
        throw new InternalServerError('Failed to save match');
      }

      return NextResponse.json({ success: true, action: matchAction, matched: false });
    }

    throw new BadRequestError('Invalid user role or item type combination');
  }
);
