import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError, NotFoundError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * POST /api/contractor/job-views
 * Track a job view by any authenticated user
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
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
  }
);

// ── Types for GET response ────────────────────────────────────────────────────

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

/**
 * GET /api/contractor/job-views
 * Retrieve job views for a contractor
 */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
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
          homeowner:profiles!homeowner_id(
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

      // Combine views with flattened job data
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
  }
);
