import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { SyntheticDataService } from '@/lib/services/building-surveyor/SyntheticDataService';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, BadRequestError } from '@/lib/errors/api-error';

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

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const body = await request.json();
    const { imageUrls, variationsPerImage = 2, includeEdgeCases = true } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new BadRequestError('imageUrls array is required');
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
    return handleAPIError(error);
  }
}

