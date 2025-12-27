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

