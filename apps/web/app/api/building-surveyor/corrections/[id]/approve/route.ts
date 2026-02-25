/**
 * API Route: Approve YOLO Correction
 *
 * Approves a correction for use in training (expert review)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { YOLOCorrectionService } from '@/lib/services/building-surveyor/YOLOCorrectionService';
import { BadRequestError } from '@/lib/errors/api-error';

const approveSchema = z.object({
  notes: z.string().optional(),
});

/**
 * POST /api/building-surveyor/corrections/[id]/approve
 * Approve a correction
 */
export const POST = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 30 } }, async (request, { user, params }) => {
  const { id } = params as { id: string };

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
});
