/**
 * GET   /api/jobs/[id]/bids/[bidId] — Fetch a single bid (participants + admin)
 * PATCH /api/jobs/[id]/bids/[bidId] — Update a bid (contractor only, while pending)
 */

import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { z } from 'zod';

/**
 * GET a single bid.
 *
 * Authorized for the bid's own contractor, the job's homeowner, or an admin.
 * Returns the canonical bid row including `updated_at`, which the mobile
 * offline-sync ConflictManager uses to fetch current server state for a queued
 * bid mutation (conflict detection). Reads via the service-role client and
 * enforces access with an explicit participant check (mirrors the PATCH handler
 * below and the bid-list route's app-layer authorization).
 */
export const GET = withApiHandler(
  {
    roles: ['homeowner', 'contractor', 'admin'],
    csrf: false,
    rateLimit: { maxRequests: 60 },
  },
  async (_request, { user, params }) => {
    const { id: jobId, bidId } = params;

    const { data: bid, error } = await serverSupabase
      .from('bids')
      .select(
        `id, job_id, contractor_id, status, amount, message, description,
         estimated_duration_days, proposed_start_date, warranty_months,
         materials_included, quote_id, created_at, updated_at,
         job:job_id ( homeowner_id )`
      )
      .eq('id', bidId)
      .eq('job_id', jobId)
      .single();

    if (error || !bid) {
      throw new NotFoundError('Bid not found');
    }

    // PostgREST embeds the related row under the table-alias key. Depending on
    // the relationship cardinality it may arrive as an object or a 1-element
    // array — normalize both.
    const jobRel = (bid as { job?: unknown }).job;
    const homeownerId = Array.isArray(jobRel)
      ? (jobRel[0] as { homeowner_id?: string } | undefined)?.homeowner_id
      : (jobRel as { homeowner_id?: string } | null)?.homeowner_id;

    const isOwnerContractor = bid.contractor_id === user.id;
    const isJobHomeowner = homeownerId != null && homeownerId === user.id;
    if (user.role !== 'admin' && !isOwnerContractor && !isJobHomeowner) {
      throw new ForbiddenError('You do not have access to this bid');
    }

    // Strip the join helper so we return only the canonical bid shape.
    const { job: _job, ...bidRow } = bid as Record<string, unknown>;
    return NextResponse.json({ bid: bidRow });
  }
);

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
