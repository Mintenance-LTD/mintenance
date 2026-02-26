import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { YOLOCorrectionService } from '@/lib/services/building-surveyor/YOLOCorrectionService';
import { YOLORetrainingService } from '@/lib/services/building-surveyor/YOLORetrainingService';
import { logger } from '@mintenance/shared';

/**
 * GET /api/building-surveyor/retrain/status
 * Get YOLO continuous learning status
 */
export const GET = withApiHandler({}, async () => {
  const correctionCounts = await YOLOCorrectionService.getCorrectionCounts();
  const lastJob = await YOLORetrainingService.getLastJob();

  // Check if continuous learning is enabled
  const envVarValue =
    process.env.YOLO_CONTINUOUS_LEARNING_ENABLED ||
    process.env['YOLO_CONTINUOUS_LEARNING_ENABLED'] ||
    '';

  const continuousLearningEnabled =
    envVarValue === 'true' ||
    String(envVarValue).toLowerCase() === 'true';

  logger.info('YOLO Continuous Learning Status', {
    service: 'YOLORetrainingStatusAPI',
    envVar: envVarValue,
    enabled: continuousLearningEnabled,
  });

  const MIN_CORRECTIONS = 100;
  const correctionsNeeded = Math.max(0, MIN_CORRECTIONS - correctionCounts.approved);

  return NextResponse.json({
    correctionsCount: {
      total: correctionCounts.total,
      pending: correctionCounts.pending,
      approved: correctionCounts.approved,
      rejected: correctionCounts.rejected,
    },
    retrainingStatus: {
      lastJob: lastJob ? {
        status: lastJob.status,
        modelVersion: lastJob.modelVersion,
        correctionsCount: lastJob.correctionsCount,
        startedAt: lastJob.startedAt?.toISOString(),
        completedAt: lastJob.completedAt?.toISOString(),
      } : undefined,
      nextRetrainThreshold: MIN_CORRECTIONS,
      correctionsNeeded,
    },
    continuousLearningEnabled,
  });
});
