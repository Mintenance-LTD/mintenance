/**
 * Knowledge Distillation Job Processor - Cron Endpoint
 *
 * Picks up pending distillation jobs and executes training.
 * Closes the loop: checkAndTriggerTraining() creates pending jobs ->
 * this cron processor picks them up -> training executes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { KnowledgeDistillationService } from '@/lib/services/building-surveyor/KnowledgeDistillationService';
import { handleAPIError } from '@/lib/errors/api-error';
import { requireCronAuth } from '@/lib/cron-auth';
import { rateLimiter } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 1,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(1),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    const authError = requireCronAuth(request);
    if (authError) {
      return authError;
    }

    logger.info('Starting distillation job processor', {
      service: 'distillation-processor',
    });

    // Pick the oldest pending distillation job
    const { data: pendingJob, error: fetchError } = await serverSupabase
      .from('knowledge_distillation_jobs')
      .select('id, job_type')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (fetchError || !pendingJob) {
      return NextResponse.json({
        success: true,
        message: 'No pending distillation jobs',
        processed: false,
      });
    }

    logger.info('Processing distillation job', {
      service: 'distillation-processor',
      jobId: pendingJob.id,
      jobType: pendingJob.job_type,
    });

    try {
      const result = await KnowledgeDistillationService.trainDamageClassifier(pendingJob.id);

      return NextResponse.json({
        success: result.success,
        processed: true,
        jobId: pendingJob.id,
        modelVersion: result.modelVersion,
        samplesUsed: result.samplesUsed,
        durationSeconds: result.durationSeconds,
      });
    } catch (trainingError) {
      // Update job status to failed
      await KnowledgeDistillationService.updateJobStatus(pendingJob.id, 'failed', {
        errorMessage: trainingError instanceof Error ? trainingError.message : 'Unknown error',
        errorStack: trainingError instanceof Error ? trainingError.stack : undefined,
      });

      logger.error('Distillation job failed', trainingError, {
        service: 'distillation-processor',
        jobId: pendingJob.id,
      });

      return NextResponse.json({
        success: false,
        processed: true,
        jobId: pendingJob.id,
        error: trainingError instanceof Error ? trainingError.message : 'Unknown error',
      });
    }
  } catch (error) {
    return handleAPIError(error);
  }
}
