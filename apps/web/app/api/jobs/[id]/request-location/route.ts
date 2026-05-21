import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@/lib/errors/api-error';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 30 } },
  async (_request, { user, params }) => {
    const { id: jobId } = params as { id: string };

    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, title, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError(
        'Not authorized to request location for this job'
      );
    }

    if (!job.contractor_id) {
      throw new BadRequestError('No contractor assigned to this job');
    }

    if (job.status !== 'assigned' && job.status !== 'in_progress') {
      throw new BadRequestError(
        'Job must be assigned or in progress to request location'
      );
    }

    // 2026-05-01 audit follow-up: route through NotificationService so the
    // contractor actually gets the push (this was previously dropping push
    // + ignoring the user's notification preferences).
    // 2026-05-21 Mint Editorial voice — frame as an ask, not a demand;
    // optional language preserves contractor agency.
    await NotificationService.createNotification({
      userId: job.contractor_id,
      type: 'location_sharing_request',
      title: `Homeowner asked if they can follow you in`,
      message: `Optional — turn on location sharing for ${job.title || 'the job'} and they'll see when you're close.`,
      actionUrl: `/contractor/jobs/${jobId}`,
      metadata: { jobId, event: 'location_request' },
    });

    return NextResponse.json({
      success: true,
      message: 'Location sharing request sent to contractor',
      status: 'pending',
    });
  }
);
