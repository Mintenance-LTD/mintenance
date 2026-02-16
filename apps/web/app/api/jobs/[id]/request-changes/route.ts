/**
 * POST /api/jobs/:id/request-changes
 * Homeowner requests changes instead of approving completed work.
 * Notifies contractor with comments.
 */

import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotFoundError, BadRequestError, ForbiddenError } from '@/lib/errors/api-error';

export const POST = withApiHandler(
  { roles: ['homeowner'] },
  async (request, { user, params }) => {
    const jobId = params.id;
    const body = await request.json();
    const comments = typeof body.comments === 'string' ? body.comments.trim() : '';

    if (!comments) {
      throw new BadRequestError('Please provide details about what changes are needed');
    }

    // 1. Fetch job and verify ownership
    const { data: job, error } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, title, status')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Only the homeowner can request changes');
    }

    if (job.status !== 'completed') {
      throw new BadRequestError('Can only request changes on completed jobs');
    }

    // 2. Notify contractor
    await serverSupabase.from('notifications').insert({
      user_id: job.contractor_id,
      title: 'Changes Requested',
      message: `The homeowner has requested changes on "${job.title}": ${comments}`,
      type: 'changes_requested',
      read: false,
      action_url: `/contractor/jobs/${jobId}`,
    });

    logger.info('Homeowner requested changes', {
      service: 'jobs',
      jobId,
      homeownerId: user.id,
      contractorId: job.contractor_id,
    });

    return NextResponse.json({
      success: true,
      message: 'Change request sent to contractor',
    });
  }
);
