/**
 * API Route: YOLO Corrections
 * 
 * Handles submission and management of user corrections on YOLO detections
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { YOLOCorrectionService } from '@/lib/services/building-surveyor/YOLOCorrectionService';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { handleAPIError, UnauthorizedError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const correctionSchema = z.object({
  assessmentId: z.string().uuid(),
  imageUrl: z.string().url(),
  imageIndex: z.number().optional(),
  originalDetections: z.array(z.any()),
  correctedDetections: z.array(z.any()), // Can be RoboflowDetection[] or CorrectedDetection[]
  correctionsMade: z.object({
    added: z.array(z.any()).optional(),
    removed: z.array(z.any()).optional(),
    adjusted: z.array(z.any()).optional(),
    classChanged: z.array(z.any()).optional(),
  }).optional(),
  correctionQuality: z.enum(['expert', 'verified', 'user']).optional(),
});

/**
 * POST /api/building-surveyor/corrections
 * Submit a new correction
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
      throw new UnauthorizedError('Authentication required to submit corrections');
    }

    const body = await request.json();
    const validated = correctionSchema.parse(body);

    const correctionId = await YOLOCorrectionService.submitCorrection({
      ...validated,
      correctedBy: user.id,
    });

    return NextResponse.json({
      success: true,
      correctionId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError('Invalid request data');
    }
    return handleAPIError(error);
  }
}

/**
 * GET /api/building-surveyor/corrections
 * Get corrections (with optional filters)
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
      throw new UnauthorizedError('Authentication required to view corrections');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') ? Number.parseInt(searchParams.get('limit')!, 10) : undefined;

    // For now, return approved corrections ready for training
    // In production, add more filtering options
    if (status === 'approved') {
      const corrections = await YOLOCorrectionService.getApprovedCorrections(limit);
      return NextResponse.json({
        success: true,
        corrections,
        count: corrections.length,
      });
    }

    // Get stats
    const stats = await YOLOCorrectionService.getCorrectionStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

