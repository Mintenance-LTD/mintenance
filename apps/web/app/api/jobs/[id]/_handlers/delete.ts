import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { serverSupabase, createRequestScopedClient } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import type { Params } from './shared';

export async function handleDelete(request: NextRequest, context: Params) {
  try {
    // CSRF protection (skip for mobile Bearer token auth)
    const hasBearerToken = request.headers.get('authorization')?.startsWith('Bearer ');
    if (!hasBearerToken) {
      await requireCSRF(request);
    }

    const user = await getUserFromRequest(request);
    if (!user) {
      throw new UnauthorizedError('Authentication required to delete job');
    }
    const { id } = await context.params;

    // Use RLS-enforced client for user-scoped operations; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    // Fetch the job to verify ownership and status
    const { data: existing, error: fetchError } = await userDb
      .from('jobs')
      .select('id, homeowner_id, status, contractor_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        logger.warn('Job not found for deletion', {
          service: 'jobs',
          userId: user.id,
          jobId: id
        });
        throw new NotFoundError('Job not found');
      }
      logger.error('Failed to fetch job for deletion', fetchError, {
        service: 'jobs',
        userId: user.id,
        jobId: id
      });
      throw fetchError;
    }

    // Verify ownership - only homeowner can delete their own job
    if (!existing || existing.homeowner_id !== user.id) {
      logger.warn('Unauthorized job deletion attempt', {
        service: 'jobs',
        userId: user.id,
        jobId: id,
        homeownerId: existing?.homeowner_id
      });
      throw new ForbiddenError('You can only delete your own jobs');
    }

    // Block deletion if contract has been accepted by both parties
    const { data: acceptedContract } = await userDb
      .from('contracts')
      .select('id')
      .eq('job_id', id)
      .eq('status', 'accepted')
      .limit(1);

    if (acceptedContract && acceptedContract.length > 0) {
      throw new BadRequestError('Cannot delete job with a fully signed contract. Please cancel the job instead.');
    }

    // Only allow deletion of posted jobs (jobs without assigned contractors or accepted bids)
    // For posted jobs, allow deletion (pending bids are OK)
    // For other statuses, check restrictions
    if (existing.status !== 'posted') {
      // Check if there are accepted bids
      const { data: acceptedBids } = await userDb
        .from('bids')
        .select('id')
        .eq('job_id', id)
        .eq('status', 'accepted')
        .limit(1);

      if (acceptedBids && acceptedBids.length > 0) {
        throw new BadRequestError('Cannot delete job with accepted bids. Please cancel the job instead');
      }

      // If contractor is assigned, don't allow deletion
      if (existing.contractor_id) {
        throw new BadRequestError('Cannot delete job with assigned contractor. Please cancel the job instead');
      }
    } else {
      // For posted jobs, also check if contractor is assigned (shouldn't happen, but safety check)
      if (existing.contractor_id) {
        throw new BadRequestError('Cannot delete job with assigned contractor. Please cancel the job instead');
      }
    }

    // Delete the job (cascade will handle related records like bids, attachments, etc.)
    const { error: deleteError } = await userDb
      .from('jobs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Failed to delete job', deleteError, {
        service: 'jobs',
        userId: user.id,
        jobId: id
      });
      throw deleteError;
    }

    logger.info('Job deleted successfully', {
      service: 'jobs',
      userId: user.id,
      jobId: id
    });

    return NextResponse.json({ message: 'Job deleted successfully' }, { status: 200 });
  } catch (err) {
    return handleAPIError(err);
  }
}
