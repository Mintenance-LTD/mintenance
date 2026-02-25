/**
 * API Route: YOLO Retraining
 *
 * Triggers manual retraining or checks retraining status
 */

import { NextResponse } from 'next/server';
import { YOLORetrainingService } from '@/lib/services/building-surveyor/YOLORetrainingService';
import { YOLOCorrectionService } from '@/lib/services/building-surveyor/YOLOCorrectionService';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * POST /api/building-surveyor/retrain
 * Trigger manual retraining (admin only)
 */
export const POST = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 30 } },
  async (request) => {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // Both force and normal paths use checkAndRetrain
    await YOLORetrainingService.checkAndRetrain();

    return NextResponse.json({
      success: true,
      message: force ? 'Retraining check initiated (force)' : 'Retraining check initiated',
    });
  }
);

/**
 * GET /api/building-surveyor/retrain
 * Get retraining status (authenticated users)
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async () => {
    const status = YOLORetrainingService.getStatus();
    const lastJob = await YOLORetrainingService.getLastJob();
    const correctionCounts = await YOLOCorrectionService.getCorrectionCounts();

    return NextResponse.json({
      success: true,
      status,
      lastJob,
      correctionCounts,
    });
  }
);
