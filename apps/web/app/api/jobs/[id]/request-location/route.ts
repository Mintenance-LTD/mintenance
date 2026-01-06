import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

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
      throw new UnauthorizedError('Authentication required to request location');
    }

    if (user.role !== 'homeowner') {
      throw new ForbiddenError('Only homeowners can request location sharing');
    }

    // Verify job exists and belongs to homeowner
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

    // Create notification for contractor
    const { error: notificationError } = await serverSupabase
      .from('notifications')
      .insert({
        user_id: job.contractor_id,
        title: 'Location Sharing Request 📍',
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
  } catch (error) {
    return handleAPIError(error);
  }
}

