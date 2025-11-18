/**
 * API Route: YOLO Retraining Status
 * 
 * Returns current status of YOLO continuous learning system
 */

import { NextResponse } from 'next/server';
import { YOLOCorrectionService } from '@/lib/services/building-surveyor/YOLOCorrectionService';
import { YOLORetrainingService } from '@/lib/services/building-surveyor/YOLORetrainingService';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';

/**
 * GET /api/building-surveyor/retrain/status
 * Get YOLO learning status
 */
export async function GET() {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get correction counts
    const correctionCounts = await YOLOCorrectionService.getCorrectionCounts();

    // Get last retraining job
    const lastJob = await YOLORetrainingService.getLastJob();

    // Check if continuous learning is enabled
    // Try multiple ways to read the env var (Next.js can be tricky)
    const envVarValue = 
      process.env.YOLO_CONTINUOUS_LEARNING_ENABLED || 
      process.env['YOLO_CONTINUOUS_LEARNING_ENABLED'] ||
      '';
    
    const continuousLearningEnabled = 
      envVarValue === 'true' || 
      envVarValue === true ||
      String(envVarValue).toLowerCase() === 'true';
    
    // Debug log (remove after verification)
    console.log('[YOLO Status API] Environment variable check:', {
      rawValue: envVarValue,
      type: typeof envVarValue,
      isTrue: envVarValue === 'true',
      enabled: continuousLearningEnabled,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('YOLO')),
      cwd: process.cwd(),
    });
    
    logger.info('YOLO Continuous Learning Status', {
      service: 'YOLORetrainingStatusAPI',
      envVar: envVarValue,
      enabled: continuousLearningEnabled,
    });

    // Calculate progress to next retrain
    const MIN_CORRECTIONS = 100; // From YOLORetrainingService
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
      // Debug info (remove after fixing)
      _debug: {
        envVarValue,
        envVarType: typeof envVarValue,
        allYoloEnvKeys: Object.keys(process.env).filter(k => k.includes('YOLO')),
        cwd: process.cwd(),
      },
    });
  } catch (error) {
    logger.error('Failed to get YOLO retraining status', {
      service: 'YOLORetrainingStatusAPI',
      error,
    });

    return NextResponse.json(
      { error: 'Failed to get retraining status' },
      { status: 500 }
    );
  }
}

