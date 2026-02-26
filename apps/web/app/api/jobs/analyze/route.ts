import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { JobAnalysisService } from '@/lib/services/JobAnalysisService';
import { validateURLs } from '@/lib/security/url-validation';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { jobAnalysisSchema } from '@/lib/validation/schemas';

/**
 * Analyze job description and return suggestions
 * POST /api/jobs/analyze
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, jobAnalysisSchema);
    if ('headers' in validation) return validation;

    const { title, description, location, imageUrls } = validation.data;

    // SECURITY: Validate image URLs to prevent SSRF attacks
    let validatedImageUrls: string[] = [];
    if (imageUrls && imageUrls.length > 0) {
      const urlValidation = await validateURLs(imageUrls, true);
      if (urlValidation.invalid.length > 0) {
        logger.warn('Invalid image URLs rejected in job analysis', {
          service: 'jobs-analyze',
          userId: user.id,
          invalidUrls: urlValidation.invalid,
        });
        throw new BadRequestError(`Invalid image URLs: ${urlValidation.invalid.map(i => i.error).join(', ')}`);
      }
      validatedImageUrls = urlValidation.valid;
    }

    const analysis = await JobAnalysisService.analyzeJobWithImages(
      title || '',
      description || '',
      validatedImageUrls,
      location
    );

    return NextResponse.json(analysis);
  }
);
