import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { enableLocationSharingSchema } from '@/lib/validation/schemas';

export async function POST(  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);
    const { id: jobId } = await params;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to enable location sharing');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can enable location sharing');
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, enableLocationSharingSchema);
    if ('headers' in validation) {
      return validation;
    }

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

    // Update or create location sharing record
    // Deactivate all previous locations for this job
    if (!enabled) {
      await serverSupabase
        .from('contractor_locations')
        .update({ is_sharing_location: false, is_active: false })
        .eq('contractor_id', user.id)
        .eq('job_id', jobId);
    } else {
      // Create a new location sharing record (actual location will be updated via POST /api/contractors/[id]/location)
      // For now, we'll just mark that sharing is enabled
      // The actual location updates will come from the contractor's device
    }

    // Create notification for homeowner
    if (enabled) {
      try {
        await serverSupabase
          .from('notifications')
          .insert({
            user_id: job.homeowner_id,
            title: 'Location Sharing Enabled 📍',
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
        // Don't fail the request
      }
    }

    return NextResponse.json({
      success: true,
      enabled,
      message: enabled 
        ? 'Location sharing enabled. Start updating your location to allow tracking.' 
        : 'Location sharing disabled.',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

