import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { enableLocationSharingSchema } from '@/lib/validation/schemas';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * POST /api/jobs/[id]/enable-location-sharing - toggle location sharing for a job.
 */
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user, params }) => {
    const jobId = params.id;

    const validation = await validateRequest(request, enableLocationSharingSchema);
    if ('headers' in validation) return validation;
    const { enabled } = validation.data;

    // Verify job exists and contractor is assigned
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, contractor_id, title, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.contractor_id !== user.id) {
      throw new ForbiddenError('Not authorized to enable location sharing for this job');
    }

    if (!enabled) {
      await serverSupabase
        .from('contractor_locations')
        .update({ is_sharing_location: false, is_active: false })
        .eq('contractor_id', user.id)
        .eq('job_id', jobId);
    }

    // Create notification for homeowner
    if (enabled) {
      try {
        await serverSupabase.from('notifications').insert({
          user_id: job.homeowner_id,
          title: 'Location Sharing Enabled',
          message: `Contractor has enabled location sharing for "${job.title || 'the job'}". You can now track their location.`,
          type: 'location_sharing_enabled',
          read: false,
          action_url: `/jobs/${jobId}`,
          created_at: new Date().toISOString(),
        });
      } catch (notificationError) {
        logger.error('Failed to create notification', notificationError, {
          service: 'jobs',
          jobId,
          contractorId: user.id,
          homeownerId: job.homeowner_id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      enabled,
      message: enabled
        ? 'Location sharing enabled. Start updating your location to allow tracking.'
        : 'Location sharing disabled.',
    });
  },
);
