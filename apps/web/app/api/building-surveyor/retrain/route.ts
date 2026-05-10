/**
 * API Route: YOLO Retraining
 *
 * Triggers manual retraining or checks retraining status
 */

import { NextResponse } from 'next/server';
import { YOLORetrainingService } from '@/lib/services/building-surveyor/YOLORetrainingService';
import { YOLOCorrectionService } from '@/lib/services/building-surveyor/YOLOCorrectionService';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { RATE_LIMIT_TIERS } from '@/lib/api/rate-limit-tiers';

/**
 * POST /api/building-surveyor/retrain
 * Trigger manual retraining (admin only)
 *
 * Audit P2 (2026-05-10):
 *   - Tightened rate limit from 30/min to STRICT (5/min). Manual
 *     retraining is a heavyweight operation; an admin should not be
 *     hitting it dozens of times per minute.
 *   - Added MFA step-up gate. Retraining burns GPT-4 Vision + GPU
 *     compute and rewrites the production YOLO model — same risk
 *     class as the synthetic-data / RAG-embedding admin routes that
 *     already enforce MFA.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: RATE_LIMIT_TIERS.STRICT,
    requireMfaVerifiedWithinMinutes: 15,
  },
  async (request) => {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // Both force and normal paths use checkAndRetrain
    await YOLORetrainingService.checkAndRetrain();

    return NextResponse.json({
      success: true,
      message: force
        ? 'Retraining check initiated (force)'
        : 'Retraining check initiated',
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
