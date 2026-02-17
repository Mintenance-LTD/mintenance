import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { JobDetail } from '@mintenance/types/src/contracts';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { validateStatusTransition, type JobStatus } from '@/lib/job-state-machine';
import { sanitizeText, sanitizeJobDescription } from '@/lib/sanitizer';
import { rateLimiter } from '@/lib/rate-limiter';
// Heavy AI/ML services loaded dynamically to avoid breaking GET handler if deps are missing
import crypto from 'crypto';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, RateLimitError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';

interface Params { params: Promise<{ id: string }> }

interface JobAttachment {
  id: string;
  file_url: string;
  file_type: string;
  uploaded_at: string;
}

// Cache AI analysis results for 24 hours
const aiAnalysisCache = new Map<string, { timestamp: number; data: unknown }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(jobId: string, imageUrls: string[]): string {
  const hash = crypto.createHash('sha256');
  hash.update(jobId);
  hash.update(imageUrls.sort().join(','));
  return hash.digest('hex');
}

const jobSelectFields = 'id,title,description,status,homeowner_id,contractor_id,category,budget,created_at,updated_at';

type JobRow = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  homeowner_id: string;
  contractor_id?: string | null;
  category?: string | null;
  budget?: number | null;
  created_at: string;
  updated_at: string;
};

const mapRowToJobDetail = (row: JobRow): JobDetail => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  status: (row.status as JobDetail['status']) ?? 'posted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Enhanced schema for job editing with AI features
const updateJobSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional().transform(val => val ? sanitizeText(val, 200) : val),
  description: z.string().max(5000).optional().transform(val => val ? sanitizeJobDescription(val) : val),
  status: z.string().optional(),
  category: z.string().max(128).optional().transform(val => val ? sanitizeText(val, 128) : val),
  budget: z.coerce.number().positive().optional(),
  // New fields for comprehensive job editing
  budgetMin: z.coerce.number().positive().optional(),
  budgetMax: z.coerce.number().positive().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  propertyType: z.string().optional(),
  accessInfo: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'emergency']).optional(),
  images: z.array(z.string().url()).optional(),
  requirements: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  flexibleTimeline: z.boolean().optional(),
  // AI analysis options
  analyzeWithAI: z.boolean().default(true),
  runBuildingSurvey: z.boolean().default(false),
}).refine((data: Record<string, unknown>) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export const GET = withApiHandler(
  { csrf: false },
  async (_req, { user, params }) => {
    const { id } = params;

    // Explicit column selection to avoid leaking sensitive data
    const { data, error } = await serverSupabase
      .from('jobs')
      .select('id, title, description, status, homeowner_id, contractor_id, category, budget, budget_min, budget_max, priority, location, city, postcode, latitude, longitude, start_date, end_date, flexible_timeline, access_info, requirements, images, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn('Job not found', {
          service: 'jobs',
          userId: user.id,
          jobId: id
        });
        throw new NotFoundError('Job not found');
      }
      logger.error('Failed to load job', error, {
        service: 'jobs',
        userId: user.id,
        jobId: id
      });
      throw error;
    }

    const row = data as Record<string, unknown>;
    if (row.homeowner_id !== user.id && row.contractor_id !== user.id) {
      logger.warn('Unauthorized job access attempt', {
        service: 'jobs',
        userId: user.id,
        jobId: id,
        homeownerId: row.homeowner_id,
        contractorId: row.contractor_id
      });
      throw new ForbiddenError('You do not have permission to view this job');
    }

    logger.info('Job retrieved', {
      service: 'jobs',
      userId: user.id,
      jobId: id
    });

    // Format comprehensive job data for frontend
    const formattedJob = {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      status: row.status,
      urgency: row.priority || 'medium',
      budget: row.budget || 0,
      budget_min: row.budget_min || row.budget || 0,
      budget_max: row.budget_max || row.budget || 0,
      start_date: row.start_date,
      end_date: row.end_date,
      flexible_timeline: row.flexible_timeline || false,
      location: row.location || '',
      city: row.city || '',
      postcode: row.postcode || '',
      propertyType: 'house',
      accessInfo: row.access_info || '',
      images: [],
      requirements: row.requirements || [],
      latitude: row.latitude,
      longitude: row.longitude,
      homeowner_id: row.homeowner_id,
      contractor_id: row.contractor_id,
      homeowner: null,
      contractor: null,
      bidCount: 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as Record<string, unknown>;

    // Check if we have cached AI analysis
    const cacheKey = getCacheKey(id, formattedJob.images as string[]);
    const cached = aiAnalysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      formattedJob.aiAnalysis = cached.data;
    }

    return NextResponse.json({ job: formattedJob });
  }
);

/**
 * PUT /api/jobs/[id] - Update job with comprehensive AI analysis
 */
export const PUT = withApiHandler(
  { roles: ['homeowner'] },
  async (request, { user, params }) => {
    const { id: jobId } = params;

    // Check job ownership and fetch necessary fields for fallback values
    const { data: existingJob, error: fetchError } = await serverSupabase
      .from('jobs')
      .select('homeowner_id, status, location, title, description, city, postcode')
      .eq('id', jobId)
      .single();

    if (fetchError || !existingJob) {
      throw new NotFoundError('Job not found');
    }

    if (existingJob.homeowner_id !== user.id) {
      throw new ForbiddenError('You do not have permission to update this job');
    }

    if (existingJob.status !== 'posted') {
      throw new BadRequestError('Cannot edit job that is already in progress or completed');
    }

    // Rate limiting for AI analysis (business-specific, separate from middleware rate limit)
    const rateLimitResult = await rateLimiter.checkRateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 30,
      identifier: `ai-analysis:${user.id}`,
    });

    if (!rateLimitResult.allowed) {
      throw new RateLimitError(rateLimitResult.retryAfter);
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, updateJobSchema);
    if ('headers' in validation) {
      return validation;
    }

    const payload = validation.data;
    let aiAnalysisResult = null;
    let buildingSurveyResult = null;
    let geocodeResult = null;

    // Validate and secure image URLs
    if (payload.images && payload.images.length > 0) {
      const { validateURLs } = await import('@/lib/security/url-validation');
      const urlValidation = await validateURLs(payload.images, true);
      if (urlValidation.invalid.length > 0) {
        throw new BadRequestError(`Invalid image URLs: ${urlValidation.invalid.map(i => i.error).join(', ')}`);
      }
      payload.images = urlValidation.valid;
    }

    // Run AI analysis if requested
    if (payload.analyzeWithAI) {
      try {
        // Check cache first
        const cacheKey = getCacheKey(jobId, payload.images || []);
        const cached = aiAnalysisCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          aiAnalysisResult = cached.data;
        } else {
          // Run job analysis with images
          const fullAddress = payload.location && payload.city && payload.postcode
            ? `${payload.location}, ${payload.city}, ${payload.postcode}`
            : existingJob.location || '';

          const { JobAnalysisService } = await import('@/lib/services/JobAnalysisService');
          const jobAnalysis = await JobAnalysisService.analyzeJobWithImages(
            payload.title || existingJob.title,
            payload.description || existingJob.description || '',
            payload.images,
            fullAddress
          );

          // Run building survey if images are provided and requested
          if (payload.runBuildingSurvey && payload.images && payload.images.length > 0) {
            // Map property type to AssessmentContext enum values
            const mapPropertyType = (type: string | undefined): 'residential' | 'commercial' | 'industrial' => {
              const t = (type || 'house').toLowerCase();
              if (t === 'commercial' || t === 'office' || t === 'retail') return 'commercial';
              if (t === 'industrial' || t === 'warehouse' || t === 'factory') return 'industrial';
              return 'residential'; // default for house, apartment, flat, etc.
            };

            const surveyContext = {
              propertyType: mapPropertyType(payload.propertyType),
              ageOfProperty: 0, // Could be fetched from property data
              location: payload.city || '',
              region: payload.city || '',
              userId: user.id,
              assessmentId: jobId,
            };

            const { BuildingSurveyorService } = await import('@/lib/services/building-surveyor/BuildingSurveyorService');
            buildingSurveyResult = await BuildingSurveyorService.assessDamage(
              payload.images,
              surveyContext
            );
          }

          // Combine results
          aiAnalysisResult = {
            jobAnalysis,
            buildingSurvey: buildingSurveyResult,
            timestamp: Date.now(),
          };

          // Cache the result
          aiAnalysisCache.set(cacheKey, {
            timestamp: Date.now(),
            data: aiAnalysisResult,
          });
        }
      } catch (aiError) {
        logger.error('AI analysis failed', aiError, {
          service: 'jobs',
          jobId,
          userId: user.id,
        });
        // Continue with update even if AI analysis fails
      }
    }

    // Geocode location if address changed
    if (payload.location || payload.city || payload.postcode) {
      const fullAddress = `${payload.location || ''}, ${payload.city || ''}, ${payload.postcode || ''}`.trim();
      if (fullAddress.length > 2) {
        try {
          const geocodeResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/geocode?address=${encodeURIComponent(fullAddress)}`
          );

          if (geocodeResponse.ok) {
            geocodeResult = await geocodeResponse.json();
          }
        } catch (geocodeError) {
          logger.warn('Geocoding failed', {
            error: geocodeError,
            service: 'jobs',
            jobId,
            address: fullAddress,
          });
        }
      }
    }

    // Update job in database
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Add fields if provided
    if (payload.title) updatePayload.title = payload.title;
    if (payload.description !== undefined) updatePayload.description = payload.description;
    if (payload.category !== undefined) updatePayload.category = payload.category;
    if (payload.priority) updatePayload.priority = payload.priority;
    if (payload.budget !== undefined) updatePayload.budget = payload.budget;
    if (payload.budgetMin !== undefined) updatePayload.budget_min = payload.budgetMin;
    if (payload.budgetMax !== undefined) updatePayload.budget_max = payload.budgetMax || payload.budget;
    if (payload.startDate !== undefined) updatePayload.start_date = payload.startDate;
    if (payload.endDate !== undefined) updatePayload.end_date = payload.endDate;
    if (payload.flexibleTimeline !== undefined) updatePayload.flexible_timeline = payload.flexibleTimeline;
    if (payload.location || payload.city || payload.postcode) {
      const fullAddress = `${payload.location || ''}, ${payload.city || ''}, ${payload.postcode || ''}`.trim();
      updatePayload.location = fullAddress;
    }
    if (payload.city !== undefined) updatePayload.city = payload.city;
    if (payload.postcode !== undefined) updatePayload.postcode = payload.postcode;
    if (payload.accessInfo !== undefined) updatePayload.access_info = payload.accessInfo;
    if (payload.requirements !== undefined) updatePayload.requirements = payload.requirements;

    if (geocodeResult) {
      updatePayload.latitude = geocodeResult.latitude;
      updatePayload.longitude = geocodeResult.longitude;
    }

    // Get current job status before update
    const { data: currentJob } = await serverSupabase
      .from('jobs')
      .select('status, title, homeowner_id, contractor_id')
      .eq('id', jobId)
      .single();

    const oldStatus = currentJob?.status || 'posted';

    const { data: updatedJob, error: updateError } = await serverSupabase
      .from('jobs')
      .update(updatePayload)
      .eq('id', jobId)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update job', updateError, {
        service: 'jobs',
        jobId,
        userId: user.id,
      });
      throw updateError;
    }

    // Notify about status changes
    if (payload.status && updatedJob.status !== oldStatus && currentJob) {
      try {
        const { notifyJobStatusChange } = await import('@/lib/services/notifications/NotificationHelper');
        await notifyJobStatusChange({
          jobId,
          jobTitle: currentJob.title || updatedJob.title || 'Job',
          oldStatus,
          newStatus: updatedJob.status,
          homeownerId: currentJob.homeowner_id || updatedJob.homeowner_id,
          contractorId: currentJob.contractor_id || updatedJob.contractor_id || null,
        });
      } catch (notificationError) {
        logger.error('Failed to create status change notification', notificationError, {
          service: 'jobs',
          jobId,
          oldStatus,
          newStatus: updatedJob.status,
        });
        // Don't fail the request if notification fails
      }
    }

    // Update job attachments if images changed
    if (payload.images !== undefined) {
      // Delete existing attachments
      await serverSupabase
        .from('job_attachments')
        .delete()
        .eq('job_id', jobId)
        .eq('file_type', 'image');

      // Insert new attachments
      if (payload.images && payload.images.length > 0) {
        const attachments = payload.images.map((url: string) => ({
          job_id: jobId,
          file_url: url,
          file_type: 'image',
          uploaded_by: user.id,
        }));

        await serverSupabase
          .from('job_attachments')
          .insert(attachments);
      }
    }

    // Trigger agent analysis after job update (dynamic imports to avoid module resolution issues)
    (async () => {
      try {
        const [{ PredictiveAgent }, { JobStatusAgent }] = await Promise.all([
          import('@/lib/services/agents/PredictiveAgent'),
          import('@/lib/services/agents/JobStatusAgent'),
        ]);
        await Promise.allSettled([
          PredictiveAgent.analyzeJob(jobId, { jobId, userId: user.id }),
          JobStatusAgent.evaluateAutoCancel(jobId, { jobId, userId: user.id }),
        ]);
      } catch (error) {
        logger.error('Error in agent analysis', error, { service: 'jobs', jobId });
      }
    })();

    // Log the update
    logger.info('Job updated successfully', {
      service: 'jobs',
      jobId,
      userId: user.id,
      hasAIAnalysis: !!aiAnalysisResult,
      hasBuildingSurvey: !!buildingSurveyResult,
      hasGeocoding: !!geocodeResult,
    });

    return NextResponse.json({
      job: updatedJob,
      aiAnalysis: aiAnalysisResult,
      geocode: geocodeResult,
    });
  }
);

export async function PATCH(request: NextRequest, context: Params) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to update job');
    }
    const { id } = await context.params;

    // Validate and sanitize input using Zod schema
    const patchValidation = await validateRequest(request, updateJobSchema);
    if ('headers' in patchValidation) {
      return patchValidation;
    }

    const { data: existing, error: fetchError } = await serverSupabase
      .from('jobs')
      .select(jobSelectFields)
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        logger.warn('Job not found for update', {
          service: 'jobs',
          userId: user.id,
          jobId: id
        });
        throw new NotFoundError('Job not found');
      }
      logger.error('Failed to fetch job for update', fetchError, {
        service: 'jobs',
        userId: user.id,
        jobId: id
      });
      throw fetchError;
    }

    if (!existing || existing.homeowner_id !== user.id) {
      logger.warn('Unauthorized job update attempt', {
        service: 'jobs',
        userId: user.id,
        jobId: id,
        homeownerId: existing?.homeowner_id
      });
      throw new ForbiddenError('You do not have permission to update this job');
    }

    const payload = patchValidation.data;
    const updatePayload: {
      title?: string;
      description?: string | null;
      status?: string;
      category?: string | null;
      budget?: number;
      updated_at: string;
    } = { updated_at: new Date().toISOString() };
    if (typeof payload.title === 'string') {
      updatePayload.title = payload.title.trim();
    }
    if (payload.description !== undefined) {
      const trimmed = payload.description.trim();
      updatePayload.description = trimmed.length > 0 ? trimmed : null;
    }
    if (payload.status) {
      const newStatus = payload.status.trim() as JobStatus;
      const currentStatus = existing.status as JobStatus;

      // Validate status transition using state machine
      try {
        validateStatusTransition(currentStatus, newStatus);
        updatePayload.status = newStatus;
      } catch (error) {
        logger.warn('Invalid job status transition attempt', {
          service: 'jobs',
          userId: user.id,
          jobId: id,
          currentStatus,
          attemptedStatus: newStatus,
          error: (error as Error).message
        });
        throw new BadRequestError((error as Error).message);
      }
    }
    if (payload.category !== undefined) {
      const trimmedCategory = payload.category.trim();
      updatePayload.category = trimmedCategory.length > 0 ? trimmedCategory : null;
    }

    // SECURITY: Prevent budget reduction if bids exist
    if (payload.budget !== undefined) {
      const newBudget = payload.budget;
      const currentBudget = existing.budget;

      // Check if budget is being reduced
      if (currentBudget !== null && newBudget < currentBudget) {
        // Check if there are any active bids
        const { count: bidCount } = await serverSupabase
          .from('bids')
          .select('id', { count: 'exact', head: true })
          .eq('job_id', id)
          .neq('status', 'withdrawn');

        if (bidCount && bidCount > 0) {
          // Check if any bids would exceed the new budget
          const { data: existingBids } = await serverSupabase
            .from('bids')
            .select('amount, contractor_id, status')
            .eq('job_id', id)
            .neq('status', 'withdrawn');

          const bidsExceedNewBudget = existingBids?.some((bid: { amount: number; contractor_id: string; status: string }) => {
            const bidAmountCents = Math.round(bid.amount * 100);
            const newBudgetCents = Math.round(newBudget * 100);
            return bidAmountCents > newBudgetCents;
          });

          if (bidsExceedNewBudget) {
            logger.warn('Budget reduction blocked - existing bids exceed new budget', {
              service: 'jobs',
              userId: user.id,
              jobId: id,
              currentBudget,
              newBudget,
              bidCount,
            });
            throw new BadRequestError('Cannot reduce budget below existing bid amounts. Please reject or withdraw bids first');
          }
        }
      }

      updatePayload.budget = payload.budget;
    }

        const { data, error } = await serverSupabase
      .from('jobs')
      .update(updatePayload)
      .eq('id', id)
      .select(jobSelectFields)
      .single();

    if (error) {
      logger.error('Failed to update job', error, {
        service: 'jobs',
        userId: user.id,
        jobId: id
      });
      throw error;
    }

    logger.info('Job updated successfully', {
      service: 'jobs',
      userId: user.id,
      jobId: id
    });

    // Trigger agent analysis after job update (dynamic imports to avoid module resolution issues)
    (async () => {
      try {
        const [{ PredictiveAgent }, { JobStatusAgent }] = await Promise.all([
          import('@/lib/services/agents/PredictiveAgent'),
          import('@/lib/services/agents/JobStatusAgent'),
        ]);
        await Promise.allSettled([
          PredictiveAgent.analyzeJob(id, { jobId: id, userId: user.id }),
          JobStatusAgent.evaluateAutoCancel(id, { jobId: id, userId: user.id }),
        ]);
      } catch (error) {
        logger.error('Error in agent analysis', error, { service: 'jobs', jobId: id });
      }
    })();

    return NextResponse.json({ job: mapRowToJobDetail(data as JobRow) });
  } catch (err) {
    return handleAPIError(err);
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to delete job');
    }
    const { id } = await context.params;

    // Fetch the job to verify ownership and status
    const { data: existing, error: fetchError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, status, contractor_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        logger.warn('Job not found for deletion', {
          service: 'jobs',
          userId: user.id,
          jobId: id
        });
        throw new NotFoundError('Job not found');
      }
      logger.error('Failed to fetch job for deletion', fetchError, {
        service: 'jobs',
        userId: user.id,
        jobId: id
      });
      throw fetchError;
    }

    // Verify ownership - only homeowner can delete their own job
    if (!existing || existing.homeowner_id !== user.id) {
      logger.warn('Unauthorized job deletion attempt', {
        service: 'jobs',
        userId: user.id,
        jobId: id,
        homeownerId: existing?.homeowner_id
      });
      throw new ForbiddenError('You can only delete your own jobs');
    }

    // Only allow deletion of posted jobs (jobs without assigned contractors or accepted bids)
    // For posted jobs, allow deletion (pending bids are OK)
    // For other statuses, check restrictions
    if (existing.status !== 'posted') {
      // Check if there are accepted bids
      const { data: acceptedBids } = await serverSupabase
        .from('bids')
        .select('id')
        .eq('job_id', id)
        .eq('status', 'accepted')
        .limit(1);

      if (acceptedBids && acceptedBids.length > 0) {
        throw new BadRequestError('Cannot delete job with accepted bids. Please cancel the job instead');
      }

      // If contractor is assigned, don't allow deletion
      if (existing.contractor_id) {
        throw new BadRequestError('Cannot delete job with assigned contractor. Please cancel the job instead');
      }
    } else {
      // For posted jobs, also check if contractor is assigned (shouldn't happen, but safety check)
      if (existing.contractor_id) {
        throw new BadRequestError('Cannot delete job with assigned contractor. Please cancel the job instead');
      }
    }

    // Delete the job (cascade will handle related records like bids, attachments, etc.)
    const { error: deleteError } = await serverSupabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Failed to delete job', deleteError, {
        service: 'jobs',
        userId: user.id,
        jobId: id
      });
      throw deleteError;
    }

    logger.info('Job deleted successfully', {
      service: 'jobs',
      userId: user.id,
      jobId: id
    });

    return NextResponse.json({ message: 'Job deleted successfully' }, { status: 200 });
  } catch (err) {
    return handleAPIError(err);
  }
}

