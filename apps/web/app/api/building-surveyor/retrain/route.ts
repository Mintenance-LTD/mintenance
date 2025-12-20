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

/**
 * POST /api/building-surveyor/retrain
 * Trigger manual retraining
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
    logger.error('Failed to trigger retraining', error, {
      service: 'YOLORetrainingAPI',
    });

    return NextResponse.json(
      { 
        error: 'Failed to trigger retraining',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/building-surveyor/retrain
 * Get retraining status
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
    logger.error('Failed to get retraining status', error, {
      service: 'YOLORetrainingAPI',
    });

    return NextResponse.json(
      { error: 'Failed to get retraining status' },
      { status: 500 }
    );
  }
}

