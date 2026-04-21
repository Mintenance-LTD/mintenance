import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { enableLocationSharingSchema } from '@/lib/validation/schemas';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { EmailService } from '@/lib/email-service';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

/**
 * POST /api/jobs/[id]/enable-location-sharing - toggle location sharing for a job.
 */
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user, params }) => {
    const jobId = params.id;

    const validation = await validateRequest(
      request,
      enableLocationSharingSchema
    );
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
      throw new ForbiddenError(
        'Not authorized to enable location sharing for this job'
      );
    }

    if (!enabled) {
      await serverSupabase
        .from('contractor_locations')
        .update({ is_sharing_location: false, is_active: false })
        .eq('contractor_id', user.id)
        .eq('job_id', jobId);
    }

    // "Contractor is on the way" is one of the most time-sensitive
    // notifications the platform fires — without push, a homeowner who
    // isn't actively watching the app has no signal that someone's
    // arriving. Route through NotificationService for push + preference
    // checks. Previously the direct table insert silently skipped push.
    if (enabled) {
      try {
        await NotificationService.createNotification({
          userId: job.homeowner_id,
          type: 'location_sharing_enabled',
          title: 'Location Sharing Enabled',
          message: `Contractor has enabled location sharing for "${job.title || 'the job'}". You can now track their location.`,
          actionUrl: `/jobs/${jobId}`,
          metadata: { jobId, contractorId: user.id },
        });
      } catch (notificationError) {
        logger.error('Failed to create notification', notificationError, {
          service: 'jobs',
          jobId,
          contractorId: user.id,
          homeownerId: job.homeowner_id,
        });
      }

      // Send email to homeowner about location sharing
      try {
        const { data: homeownerProfile } = await serverSupabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', job.homeowner_id)
          .single();

        const { data: contractorProfile } = await serverSupabase
          .from('profiles')
          .select('first_name, last_name, company_name')
          .eq('id', user.id)
          .single();

        if (homeownerProfile?.email) {
          const homeownerName =
            homeownerProfile.first_name && homeownerProfile.last_name
              ? `${homeownerProfile.first_name} ${homeownerProfile.last_name}`
              : 'there';
          const contractorName = contractorProfile
            ? contractorProfile.first_name && contractorProfile.last_name
              ? `${contractorProfile.first_name} ${contractorProfile.last_name}`
              : contractorProfile.company_name || 'Your contractor'
            : 'Your contractor';

          await EmailService.sendLocationSharingEmail(homeownerProfile.email, {
            homeownerName,
            contractorName,
            jobTitle: job.title || 'Job',
            viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com'}/jobs/${jobId}`,
          });
        }
      } catch (emailError) {
        logger.error('Failed to send location sharing email', emailError, {
          service: 'jobs',
          jobId,
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
  }
);
