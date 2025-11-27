import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { SyntheticDataService } from '@/lib/services/building-surveyor/SyntheticDataService';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

/**
 * POST /api/admin/synthetic-data/generate
 * 
 * Generate synthetic training data using GPT-4
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
    const { imageUrls, variationsPerImage = 2, includeEdgeCases = true } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'imageUrls array is required' },
        { status: 400 }
      );
    }

    // Generate synthetic data
    const syntheticAssessments = await SyntheticDataService.generateTrainingBatch(
      imageUrls,
      variationsPerImage,
      includeEdgeCases
    );

    logger.info('Synthetic data generated', {
      service: 'synthetic-data-api',
      userId: user.id,
      imageCount: imageUrls.length,
      generatedCount: syntheticAssessments.length,
    });

    return NextResponse.json({
      success: true,
      count: syntheticAssessments.length,
      assessments: syntheticAssessments,
    });
  } catch (error: unknown) {
    logger.error('Error generating synthetic data', error, {
      service: 'synthetic-data-api',
    });

    return NextResponse.json(
      {
        error: error.message || 'Failed to generate synthetic data',
      },
      { status: 500 }
    );
  }
}

