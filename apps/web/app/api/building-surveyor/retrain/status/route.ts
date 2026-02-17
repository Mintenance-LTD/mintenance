/**
 * API Route: YOLO Retraining Status
 * 
 * Returns current status of YOLO continuous learning system
 */

import { NextResponse } from 'next/server';
import { YOLOCorrectionService } from '@/lib/services/building-surveyor/YOLOCorrectionService';
import { YOLORetrainingService } from '@/lib/services/building-surveyor/YOLORetrainingService';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * GET /api/building-surveyor/retrain/status
 * Get YOLO learning status
 */
export async function GET(request: Request) {
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
    if (!user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    // Get correction counts
    const correctionCounts = await YOLOCorrectionService.getCorrectionCounts();

    // Get last retraining job
    const lastJob = await YOLORetrainingService.getLastJob();

    // Check if continuous learning is enabled
    // Try multiple ways to read the env var (Next.js can be tricky)
    const envVarValue = 
      process.env.YOLO_CONTINUOUS_LEARNING_ENABLED || 
      process.env['YOLO_CONTINUOUS_LEARNING_ENABLED'] ||
      '';
    
    const continuousLearningEnabled = 
      envVarValue === 'true' || 
      String(envVarValue).toLowerCase() === 'true';
    
    logger.info('YOLO Continuous Learning Status', {
      service: 'YOLORetrainingStatusAPI',
      envVar: envVarValue,
      enabled: continuousLearningEnabled,
    });

    // Calculate progress to next retrain
    const MIN_CORRECTIONS = 100; // From YOLORetrainingService
    const correctionsNeeded = Math.max(0, MIN_CORRECTIONS - correctionCounts.approved);

    return NextResponse.json({
      correctionsCount: {
        total: correctionCounts.total,
        pending: correctionCounts.pending,
        approved: correctionCounts.approved,
        rejected: correctionCounts.rejected,
      },
      retrainingStatus: {
        lastJob: lastJob ? {
          status: lastJob.status,
          modelVersion: lastJob.modelVersion,
          correctionsCount: lastJob.correctionsCount,
          startedAt: lastJob.startedAt?.toISOString(),
          completedAt: lastJob.completedAt?.toISOString(),
        } : undefined,
        nextRetrainThreshold: MIN_CORRECTIONS,
        correctionsNeeded,
      },
      continuousLearningEnabled,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

