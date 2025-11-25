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
    const { id } = await params;
    const user = await getCurrentUserFromCookies();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Check if user has permission to approve (admin/expert role)
    // For now, allow any authenticated user

    const body = await request.json().catch(() => ({}));
    const validated = approveSchema.parse(body);

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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Failed to approve correction', error, {
      service: 'YOLOCorrectionsAPI',
      correctionId: 'unknown',
    });

    return NextResponse.json(
      { error: 'Failed to approve correction' },
      { status: 500 }
    );
  }
}

