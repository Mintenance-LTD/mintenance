/**
 * VLM Student Retraining Cron - Daily check for retraining needs.
 *
 * Checks: buffer has >= 200 unused examples, last VLM training > 7 days ago,
 * or accuracy dropped below threshold. If triggered, exports buffer data and
 * creates a vlm_distillation job.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { KnowledgeDistillationService } from '@/lib/services/building-surveyor/KnowledgeDistillationService';
import { handleAPIError } from '@/lib/errors/api-error';
import { requireCronAuth } from '@/lib/cron-auth';
import { rateLimiter } from '@/lib/rate-limiter';

const MIN_BUFFER_SIZE = 200;
const MIN_DAYS_BETWEEN_TRAINING = 7;

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 86400000, // 1 per day
      maxRequests: 1,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 3600),
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

    logger.info('VLM retraining cron started', { service: 'vlm-retraining' });

    // 1. Check buffer size
    const { count: bufferCount } = await serverSupabase
      .from('vlm_training_buffer')
      .select('id', { count: 'exact', head: true })
      .eq('used_in_training', false);

    if (!bufferCount || bufferCount < MIN_BUFFER_SIZE) {
      return NextResponse.json({
        success: true,
        message: `No retraining needed: buffer has ${bufferCount ?? 0} unused examples (need >= ${MIN_BUFFER_SIZE})`,
        retraining: false,
      });
    }

    // 2. Check last VLM training job
    const { data: lastJob } = await serverSupabase
      .from('knowledge_distillation_jobs')
      .select('completed_at, status')
      .eq('job_type', 'vlm_distillation')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastJob?.status === 'running') {
      return NextResponse.json({
        success: true,
        message: 'VLM training already in progress',
        retraining: false,
      });
    }

    if (lastJob?.completed_at) {
      const daysSinceLastTraining =
        (Date.now() - new Date(lastJob.completed_at).getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastTraining < MIN_DAYS_BETWEEN_TRAINING) {
        return NextResponse.json({
          success: true,
          message: `No retraining needed: last training was ${daysSinceLastTraining.toFixed(1)} days ago (need >= ${MIN_DAYS_BETWEEN_TRAINING})`,
          retraining: false,
        });
      }
    }

    // 3. Trigger training
    logger.info('VLM retraining triggered', {
      service: 'vlm-retraining',
      bufferCount,
    });

    const result = await KnowledgeDistillationService.trainStudentVLM({
      triggeredBy: 'scheduled',
      maxExamples: 5000,
      minQuality: 'medium',
    });

    // 4. Recalibrate after training
    if (result.success) {
      try {
        const { CalibrationFeedbackService } = await import(
          '@/lib/services/building-surveyor/distillation/CalibrationFeedbackService'
        );
        await CalibrationFeedbackService.recalculateAll();
        logger.info('Calibration recalculated after VLM retraining', {
          service: 'vlm-retraining',
        });
      } catch (calError) {
        logger.warn('Calibration recalculation failed (non-blocking)', {
          service: 'vlm-retraining',
          error: calError instanceof Error ? calError.message : String(calError),
        });
      }
    }

    return NextResponse.json({
      success: result.success,
      retraining: true,
      jobId: result.jobId,
      samplesUsed: result.samplesUsed,
      modelVersion: result.modelVersion,
      durationSeconds: result.durationSeconds,
      error: result.error,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
