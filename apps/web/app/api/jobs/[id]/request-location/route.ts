import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';

export const POST = withApiHandler({ roles: ['homeowner'], rateLimit: { maxRequests: 30 } }, async (_request, { user, params }) => {
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
    throw new ForbiddenError('Not authorized to request location for this job');
  }

  if (!job.contractor_id) {
    throw new BadRequestError('No contractor assigned to this job');
  }

  if (job.status !== 'assigned' && job.status !== 'in_progress') {
    throw new BadRequestError('Job must be assigned or in progress to request location');
  }

  const { error: notificationError } = await serverSupabase
    .from('notifications')
    .insert({
      user_id: job.contractor_id,
      title: 'Location Sharing Request',
      message: `Homeowner has requested to track your location for "${job.title || 'the job'}". Enable location sharing to allow tracking.`,
      type: 'location_sharing_request',
      read: false,
      action_url: `/contractor/jobs/${jobId}`,
      created_at: new Date().toISOString(),
    });

  if (notificationError) {
    logger.error('Error creating location request notification', notificationError, {
      service: 'jobs',
      jobId,
      homeownerId: user.id,
      contractorId: job.contractor_id,
    });
    throw notificationError;
  }

  return NextResponse.json({
    success: true,
    message: 'Location sharing request sent to contractor',
    status: 'pending',
  });
});
