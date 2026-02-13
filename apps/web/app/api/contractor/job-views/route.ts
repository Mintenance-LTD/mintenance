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
    const jobId = typeof body?.jobId === 'string' ? body.jobId.trim() : null;

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
    // Schema: job_views columns: id, job_id, viewer_id, ip_address, user_agent, referrer, viewed_at
    const { data: existingView } = await serverSupabase
      .from('job_views')
      .select('id, job_id, viewer_id, viewed_at')
      .eq('job_id', jobId)
      .eq('viewer_id', user.id)
      .single();

    if (existingView) {
      // Update existing view timestamp
      const { error: updateError } = await serverSupabase
        .from('job_views')
        .update({
          viewed_at: new Date().toISOString(),
        })
        .eq('job_id', jobId)
        .eq('viewer_id', user.id);

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
          viewer_id: user.id,
          viewed_at: new Date().toISOString(),
        });

      if (insertError) {
        logger.error('Error creating job view', insertError);
        throw new InternalServerError('Failed to track view');
      }

      // Create notification for homeowner (only on first view)
      const { data: contractor } = await serverSupabase
        .from('profiles')
        .select('first_name, last_name, company_name, email')
        .eq('id', user.id)
        .single();

      const contractorName = contractor?.company_name ||
        (contractor?.first_name && contractor?.last_name
          ? `${contractor.first_name} ${contractor.last_name}`
          : contractor?.email || 'A contractor');

      // Create notification in notifications table
      const { error: notificationError } = await serverSupabase
        .from('notifications')
        .insert({
          user_id: job.homeowner_id,
          type: 'job_viewed',
          title: 'Job Viewed',
          message: `${contractorName} viewed your job: ${job.title}`,
          read: false,
          action_url: `/jobs/${jobId}`,
          created_at: new Date().toISOString(),
        });

      if (notificationError) {
        logger.error('Error creating notification', notificationError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Job view tracked successfully',
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
        .select('id, job_id, viewer_id, viewed_at')
        .eq('job_id', jobId)
        .eq('viewer_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching job view', error);
        throw new InternalServerError('Failed to fetch view data');
      }

      return NextResponse.json({ viewed: !!data, viewData: data });
    } else {
      // Get all viewed jobs for contractor
      // Schema: job_views columns: id, job_id, viewer_id, viewed_at
      const { data: views, error: viewsError } = await serverSupabase
        .from('job_views')
        .select('id, job_id, viewer_id, viewed_at')
        .eq('viewer_id', user.id)
        .order('viewed_at', { ascending: false });

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
          homeowner:profiles!jobs_homeowner_id_fkey(
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

      // Combine views with flattened job data (matching my-jobs response format)
      interface HomeownerProfile {
        id?: string;
        first_name?: string;
        last_name?: string;
        profile_image_url?: string;
      }
      interface JobWithHomeowner {
        id: string;
        title: string;
        description?: string;
        budget: number;
        status: string;
        location?: string;
        category?: string;
        priority?: string;
        created_at: string;
        homeowner_id: string;
        photos?: string[];
        homeowner?: HomeownerProfile | HomeownerProfile[];
      }

      const viewsWithJobs = views.map((view: Record<string, unknown>) => {
        const job = jobs?.find((j: Record<string, unknown>) => j.id === view.job_id) as JobWithHomeowner | undefined;
        if (!job) return null;
        const hw = job.homeowner;
        const homeowner = Array.isArray(hw) ? hw[0] : hw;
        return {
          ...view,
          job: {
            id: job.id,
            title: job.title,
            description: job.description,
            location: job.location,
            category: job.category,
            priority: job.priority || 'medium',
            budget: job.budget,
            status: job.status,
            photos: job.photos || [],
            created_at: job.created_at,
            homeowner_id: job.homeowner_id,
            homeowner_name: homeowner
              ? `${homeowner.first_name || ''} ${homeowner.last_name || ''}`.trim() || 'Unknown'
              : 'Unknown',
            homeowner_avatar: homeowner?.profile_image_url,
          },
        };
      }).filter(Boolean);

      return NextResponse.json({ views: viewsWithJobs });
    }

  } catch (error) {
    return handleAPIError(error);
  }
}