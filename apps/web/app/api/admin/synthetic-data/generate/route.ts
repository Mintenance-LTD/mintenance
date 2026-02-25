import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { SyntheticDataService } from '@/lib/services/building-surveyor/SyntheticDataService';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';

const generateSyntheticDataSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1).max(50),
  variationsPerImage: z.number().int().min(1).max(10).default(2),
  includeEdgeCases: z.boolean().default(true),
});

/**
 * POST /api/admin/synthetic-data/generate
 *
 * Generate synthetic training data using GPT-4
 * Requires admin authentication
 */
export const POST = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 10 } }, async (request, { user }) => {
  const body = await request.json();
  const parsed = generateSyntheticDataSchema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestError('imageUrls (array of valid URLs, 1-50) is required');
  }
  const { imageUrls, variationsPerImage, includeEdgeCases } = parsed.data;

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
});
