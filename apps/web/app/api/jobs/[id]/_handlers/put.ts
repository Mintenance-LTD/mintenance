import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase, createRequestScopedClient } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';
import { ForbiddenError, NotFoundError, BadRequestError, RateLimitError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { AIResponseCache } from '@/lib/services/cache/AIResponseCache';
import { getAppUrl } from '@/lib/env';
import { updateJobSchema } from './shared';

export async function handlePut(
  request: NextRequest,
  { user, params }: { user: { id: string; [k: string]: unknown }; params: Record<string, string> }
): Promise<NextResponse> {
  // Use RLS-enforced client for user-scoped operations; fall back to service role
  const userDb = createRequestScopedClient(request) ?? serverSupabase;

  const { id: jobId } = params;

  // Check job ownership and fetch necessary fields for fallback values
  const { data: existingJob, error: fetchError } = await userDb
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
      const cacheInput = { jobId, images: payload.images || [], runBuildingSurvey: payload.runBuildingSurvey ?? false };
      aiAnalysisResult = await AIResponseCache.get(
        'maintenance-assessment',
        cacheInput,
        async () => {
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
          let surveyResult = null;
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
            surveyResult = await BuildingSurveyorService.assessDamage(
              payload.images,
              surveyContext
            );
          }

          return {
            jobAnalysis,
            buildingSurvey: surveyResult,
            timestamp: Date.now(),
          };
        }
      );
      buildingSurveyResult = (aiAnalysisResult as { buildingSurvey: unknown } | null)?.buildingSurvey ?? null;
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
          `${getAppUrl()}/api/geocode?address=${encodeURIComponent(fullAddress)}`
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
  const { data: currentJob } = await userDb
    .from('jobs')
    .select('status, title, homeowner_id, contractor_id')
    .eq('id', jobId)
    .single();

  const oldStatus = currentJob?.status || 'posted';

  const { data: updatedJob, error: updateError } = await userDb
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
    await userDb
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

      await userDb
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
