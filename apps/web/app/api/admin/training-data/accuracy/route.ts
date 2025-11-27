import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { DataCollectionService } from '@/lib/services/building-surveyor/DataCollectionService';
import { logger } from '@mintenance/shared';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import { requireCSRF } from '@/lib/csrf';

/**
 * POST /api/admin/training-data/track-accuracy
 * 
 * Track GPT-4 accuracy by comparing GPT-4 output with human validation
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
// Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { assessmentId, humanValidatedAssessment } = body;

    if (!assessmentId || !humanValidatedAssessment) {
      return NextResponse.json(
        { error: 'Missing assessmentId or humanValidatedAssessment' },
        { status: 400 }
      );
    }

    // Track accuracy
    const accuracyMetrics = await DataCollectionService.trackGPT4Accuracy(
      assessmentId,
      humanValidatedAssessment as Phase1BuildingAssessment
    );

    logger.info('GPT-4 accuracy tracked', {
      service: 'training-data-accuracy-api',
      assessmentId,
      accuracy: accuracyMetrics.accuracy,
    });

    return NextResponse.json(accuracyMetrics);
  } catch (error: unknown) {
    logger.error('Error tracking GPT-4 accuracy', error, {
      service: 'training-data-accuracy-api',
    });

    return NextResponse.json(
      {
        error: error.message || 'Failed to track accuracy',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/training-data/accuracy-stats
 * 
 * Get GPT-4 accuracy statistics
 * Requires admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get accuracy statistics
    const stats = await DataCollectionService.getGPT4AccuracyStatistics();

    return NextResponse.json(stats);
  } catch (error: unknown) {
    logger.error('Error fetching accuracy statistics', error, {
      service: 'training-data-accuracy-api',
    });

    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch accuracy statistics',
      },
      { status: 500 }
    );
  }
}

