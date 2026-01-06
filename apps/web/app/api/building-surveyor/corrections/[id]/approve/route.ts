/**
 * API Route: Approve YOLO Correction
 * 
 * Approves a correction for use in training (expert review)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { YOLOCorrectionService } from '@/lib/services/building-surveyor/YOLOCorrectionService';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { handleAPIError, UnauthorizedError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const approveSchema = z.object({
  notes: z.string().optional(),
});

/**
 * POST /api/building-surveyor/corrections/[id]/approve
 * Approve a correction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const user = await getCurrentUserFromCookies();
    if (!user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    // TODO: Check if user has permission to approve (admin/expert role)
    // For now, allow any authenticated user

    const body = await request.json().catch(() => ({}));
    const validation = approveSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestError('Invalid request');
    }
    const validated = validation.data;

    await YOLOCorrectionService.approveCorrection(
      id,
      user.id,
      validated.notes
    );

    return NextResponse.json({
      success: true,
      message: 'Correction approved',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

