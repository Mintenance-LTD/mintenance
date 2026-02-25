/**
 * API Route: YOLO Corrections
 *
 * Handles submission and management of user corrections on YOLO detections
 */

import { NextResponse } from 'next/server';
import { YOLOCorrectionService } from '@/lib/services/building-surveyor/YOLOCorrectionService';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { buildingCorrectionSchema } from '@/lib/validation/schemas';

/**
 * POST /api/building-surveyor/corrections
 * Submit a new correction
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, buildingCorrectionSchema);
    if (validation instanceof NextResponse) return validation;
    const { data: validated } = validation;

    const correctionId = await YOLOCorrectionService.submitCorrection({
      ...validated,
      correctedBy: user.id,
    });

    return NextResponse.json({
      success: true,
      correctionId,
    });
  }
);

/**
 * GET /api/building-surveyor/corrections
 * Get corrections (with optional filters)
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') ? Number.parseInt(searchParams.get('limit')!, 10) : undefined;

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
  }
);
