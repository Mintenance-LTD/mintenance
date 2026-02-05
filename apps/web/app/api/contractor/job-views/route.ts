import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
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

    // Check authentication
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      throw new BadRequestError('Job ID is required');
    }

    // Check if job exists and get homeowner info
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, title, homeowner_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    // Try to insert or update job view
    const { data: existingView } = await serverSupabase
      .from('job_views')
      .select('*')
      .eq('job_id', jobId)
      .eq('contractor_id', user.id)
      .single();

    if (existingView) {
      // Update existing view
      const { error: updateError } = await serverSupabase
        .from('job_views')
        .update({
          last_viewed_at: new Date().toISOString(),
          view_count: existingView.view_count + 1,
        })
        .eq('job_id', jobId)
        .eq('contractor_id', user.id);

      if (updateError) {
        logger.error('Error updating job view', updateError);
        throw new InternalServerError('Failed to update view');
      }
    } else {
      // Create new view record
      const { error: insertError } = await serverSupabase
        .from('job_views')
        .insert({
          job_id: jobId,
          contractor_id: user.id,
          viewed_at: new Date().toISOString(),
          last_viewed_at: new Date().toISOString(),
          view_count: 1,
        });

      if (insertError) {
        logger.error('Error creating job view', insertError);
        throw new InternalServerError('Failed to track view');
      }

      // Create notification for homeowner (only on first view)
      const { data: contractor } = await serverSupabase
        .from('users')
        .select('first_name, last_name, company_name, email')
        .eq('id', user.id)
        .single();

      const contractorName = contractor?.company_name ||
        (contractor?.first_name && contractor?.last_name
          ? `${contractor.first_name} ${contractor.last_name}`
          : contractor?.email || 'A contractor');

      const { error: notificationError } = await serverSupabase
        .from('job_interaction_notifications')
        .insert({
          job_id: jobId,
          homeowner_id: job.homeowner_id,
          contractor_id: user.id,
          interaction_type: 'viewed',
          message: `${contractorName} viewed your job: ${job.title}`,
        });

      if (notificationError) {
        logger.error('Error creating notification', notificationError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Job view tracked successfully',
      viewCount: existingView ? existingView.view_count + 1 : 1
    });

  } catch (error) {
    return handleAPIError(error);
  }
}

// GET endpoint to retrieve job views for a contractor
export async function GET(request: NextRequest) {
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

    // Check authentication and role
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can view job views');
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (jobId) {
      // Get view info for specific job
      const { data, error } = await serverSupabase
        .from('job_views')
        .select('*')
        .eq('job_id', jobId)
        .eq('contractor_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching job view', error);
        throw new InternalServerError('Failed to fetch view data');
      }

      return NextResponse.json({ viewed: !!data, viewData: data });
    } else {
      // Get all viewed jobs for contractor
      // First, get the job_views records
      const { data: views, error: viewsError } = await serverSupabase
        .from('job_views')
        .select('*')
        .eq('contractor_id', user.id)
        .order('last_viewed_at', { ascending: false });

      if (viewsError) {
        logger.error('Error fetching job views', viewsError, {
          service: 'contractor-api',
          contractorId: user.id,
        });
        throw new InternalServerError('Failed to fetch views');
      }

      if (!views || views.length === 0) {
        return NextResponse.json({ views: [] });
      }

      // Get job IDs from views
      const jobIds = views.map(v => v.job_id).filter(Boolean);

      if (jobIds.length === 0) {
        return NextResponse.json({ views: [] });
      }

      // Fetch jobs with homeowner data
      const { data: jobs, error: jobsError } = await serverSupabase
        .from('jobs')
        .select(`
          id,
          title,
          description,
          budget,
          status,
          location,
          category,
          priority,
          created_at,
          homeowner_id,
          photos,
          homeowner:users!jobs_homeowner_id_fkey(
            id,
            first_name,
            last_name,
            profile_image_url
          )
        `)
        .in('id', jobIds);

      if (jobsError) {
        logger.error('Error fetching jobs for views', jobsError, {
          service: 'contractor-api',
          contractorId: user.id,
          jobIds,
        });
        throw new InternalServerError('Failed to fetch job details');
      }

      // Combine views with job data
      const viewsWithJobs = views.map((view: Record<string, unknown>) => {
        const job = jobs?.find((j: Record<string, unknown>) => j.id === view.job_id);
        return {
          ...view,
          job: job || null,
        };
      }).filter((view: Record<string, unknown>) => view.job !== null); // Filter out views where job was deleted

      return NextResponse.json({ views: viewsWithJobs });
    }

  } catch (error) {
    return handleAPIError(error);
  }
}