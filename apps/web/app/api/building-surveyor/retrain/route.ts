/**
 * API Route: YOLO Retraining
 * 
 * Triggers manual retraining or checks retraining status
 */

import { NextRequest, NextResponse } from 'next/server';
import { YOLORetrainingService } from '@/lib/services/building-surveyor/YOLORetrainingService';
import { YOLOCorrectionService } from '@/lib/services/building-surveyor/YOLOCorrectionService';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * POST /api/building-surveyor/retrain
 * Trigger manual retraining
 */
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

    const user = await getCurrentUserFromCookies();
    if (!user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    // TODO: Check if user has permission (admin only)
    // For now, allow any authenticated user

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    if (force) {
      // Force retraining (ignore checks) - use checkAndRetrain but it will check conditions
      // For true force, we'd need to add a force parameter to checkAndRetrain
      await YOLORetrainingService.checkAndRetrain();
      return NextResponse.json({
        success: true,
        message: 'Retraining check initiated',
      });
    } else {
      // Check and retrain (respects conditions)
      await YOLORetrainingService.checkAndRetrain();
      return NextResponse.json({
        success: true,
        message: 'Retraining check initiated',
      });
    }
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * GET /api/building-surveyor/retrain
 * Get retraining status
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
    if (!user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const status = YOLORetrainingService.getStatus();
    const lastJob = await YOLORetrainingService.getLastJob();
    const correctionCounts = await YOLOCorrectionService.getCorrectionCounts();

    return NextResponse.json({
      success: true,
      status,
      lastJob,
      correctionCounts,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

