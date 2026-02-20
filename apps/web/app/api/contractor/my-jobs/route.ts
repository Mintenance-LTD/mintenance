import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { handleAPIError, UnauthorizedError, ForbiddenError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const statusSchema = z.enum(['active', 'bid', 'completed', 'all']).optional();

interface JobApiResponse {
  id: string;
  title: string;
  description?: string;
  location?: string;
  category?: string;
  priority?: string;
  urgency?: string;
  budget?: number;
  budget_min?: number;
  budget_max?: number;
  status: string;
  photos?: string[];
  created_at: string;
  homeowner_id: string;
  homeowner?: {
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  } | Array<{
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  }>;
  job_attachments?: Array<{ file_url: string }>;
}

function getJobPhotos(job: JobApiResponse): string[] {
  if (job.photos && job.photos.length > 0) return job.photos;
  if (job.job_attachments && job.job_attachments.length > 0) {
    return job.job_attachments.map(a => a.file_url);
  }
  return [];
}

/**
 * GET /api/contractor/my-jobs
 * Get jobs for the authenticated contractor
 * Query params:
 * - status: 'active' | 'bid' | 'completed' | 'all' (optional)
 */
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

    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to view jobs');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can view their jobs');
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');

    // Validate status parameter
    let status: 'active' | 'bid' | 'completed' | 'all' | undefined;
    if (statusParam) {
      try {
        status = statusSchema.parse(statusParam);
      } catch (error) {
        throw new BadRequestError('Invalid status parameter. Must be: active, bid, completed, or all');
      }
    }

    // Build query based on status
    if (status === 'bid') {
      // Get jobs where contractor has placed a bid
      const { data: bids, error: bidsError } = await serverSupabase
        .from('bids')
        .select('job_id')
        .eq('contractor_id', user.id);

      if (bidsError) {
        logger.error('Failed to fetch contractor bids', bidsError, {
          service: 'contractor-api',
          contractorId: user.id,
        });
        throw bidsError;
      }

      const jobIds = (bids || []).map(b => b.job_id).filter(Boolean);

      if (jobIds.length === 0) {
        return NextResponse.json({ jobs: [] });
      }

      // Fetch jobs for which contractor has placed bids
      const { data: jobs, error: jobsError } = await serverSupabase
        .from('jobs')
        .select(`
          id,
          title,
          description,
          budget,
          budget_min,
          budget_max,
          location,
          category,
          priority,
          urgency,
          status,
          photos,
          created_at,
          homeowner_id,
          homeowner:profiles!homeowner_id (
            id,
            first_name,
            last_name,
            profile_image_url
          ),
          job_attachments (
            file_url
          )
        `)
        .in('id', jobIds)
        .order('created_at', { ascending: false });

      if (jobsError) {
        logger.error('Failed to fetch jobs with bids', jobsError, {
          service: 'contractor-api',
          contractorId: user.id,
        });
        throw jobsError;
      }

      // Transform DB columns to match frontend expected format
      const transformedJobs = (jobs || []).map((job: JobApiResponse) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        location: job.location,
        category: job.category,
        priority: job.priority || job.urgency || 'medium',
        budget: job.budget || job.budget_max || job.budget_min || 0,
        status: job.status,
        photos: getJobPhotos(job),
        created_at: job.created_at,
        homeowner_id: job.homeowner_id,
        homeowner_name: job.homeowner
          ? Array.isArray(job.homeowner)
            ? `${job.homeowner[0]?.first_name || ''} ${job.homeowner[0]?.last_name || ''}`.trim() || 'Unknown'
            : `${job.homeowner.first_name || ''} ${job.homeowner.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown',
        homeowner_avatar: Array.isArray(job.homeowner) ? job.homeowner[0]?.profile_image_url : job.homeowner?.profile_image_url,
      }));

      return NextResponse.json({ jobs: transformedJobs });
    } else {
      // Get jobs assigned to contractor or filter by status
      let query = serverSupabase
        .from('jobs')
        .select(`
          id,
          title,
          description,
          budget,
          budget_min,
          budget_max,
          location,
          category,
          priority,
          urgency,
          status,
          photos,
          created_at,
          homeowner_id,
          homeowner:profiles!homeowner_id (
            id,
            first_name,
            last_name,
            profile_image_url
          ),
          job_attachments (
            file_url
          )
        `)
        .eq('contractor_id', user.id);

      // Apply status filter
      if (status === 'active') {
        query = query.in('status', ['in_progress', 'assigned', 'pending']);
      } else if (status === 'completed') {
        query = query.eq('status', 'completed');
      }
      // If status is 'all' or undefined, return all jobs for contractor

      query = query.order('created_at', { ascending: false });

      const { data: jobs, error: jobsError } = await query;

      if (jobsError) {
        logger.error('Failed to fetch contractor jobs', jobsError, {
          service: 'contractor-api',
          contractorId: user.id,
          status,
        });
        throw jobsError;
      }

      // Transform DB columns to match frontend expected format
      const transformedJobs = (jobs || []).map((job: JobApiResponse) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        location: job.location,
        category: job.category,
        priority: job.priority || job.urgency || 'medium',
        budget: job.budget || job.budget_max || job.budget_min || 0,
        status: job.status,
        photos: getJobPhotos(job),
        created_at: job.created_at,
        homeowner_id: job.homeowner_id,
        homeowner_name: job.homeowner
          ? Array.isArray(job.homeowner)
            ? `${job.homeowner[0]?.first_name || ''} ${job.homeowner[0]?.last_name || ''}`.trim() || 'Unknown'
            : `${job.homeowner.first_name || ''} ${job.homeowner.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown',
        homeowner_avatar: Array.isArray(job.homeowner) ? job.homeowner[0]?.profile_image_url : job.homeowner?.profile_image_url,
      }));

      return NextResponse.json({ jobs: transformedJobs });
    }
  } catch (error) {
    return handleAPIError(error);
  }
}
