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
    const user = await getCurrentUserFromCookies();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Failed to submit correction', error, {
      service: 'YOLOCorrectionsAPI',
    });

    return NextResponse.json(
      { error: 'Failed to submit correction' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/building-surveyor/corrections
 * Get corrections (with optional filters)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
    logger.error('Failed to get corrections', error, {
      service: 'YOLOCorrectionsAPI',
    });

    return NextResponse.json(
      { error: 'Failed to get corrections' },
      { status: 500 }
    );
  }
}

