/**
 * PATCH /api/jobs/[id]/bids/[bidId] — Update a bid (contractor only, while pending)
 */

import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { z } from 'zod';

const updateBidSchema = z.object({
  amount: z.number().positive().optional(),
  message: z.string().max(2000).optional(),
  estimated_duration_days: z.number().positive().optional(),
  proposed_start_date: z.string().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export const PATCH = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user, params }) => {
    const { id: jobId, bidId } = params;

    // Verify the bid exists, belongs to this contractor, and is still pending
    const { data: bid, error: fetchError } = await serverSupabase
      .from('bids')
      .select('id, contractor_id, status, job_id')
      .eq('id', bidId)
      .eq('job_id', jobId)
      .single();

    if (fetchError || !bid) {
      throw new NotFoundError('Bid not found');
    }

    if (bid.contractor_id !== user.id) {
      throw new ForbiddenError('You can only update your own bids');
    }

    if (bid.status !== 'pending') {
      throw new BadRequestError('Only pending bids can be updated');
    }

    const body = await request.json();
    const parsed = updateBidSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid bid data');
    }

    const updates: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await serverSupabase
      .from('bids')
      .update(updates)
      .eq('id', bidId)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update bid', updateError, { service: 'bids', bidId });
      throw updateError;
    }

    return NextResponse.json({ bid: updated });
  }
);
