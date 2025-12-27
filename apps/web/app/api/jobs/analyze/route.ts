import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { JobAnalysisService } from '@/lib/services/JobAnalysisService';
import { validateURLs } from '@/lib/security/url-validation';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, BadRequestError } from '@/lib/errors/api-error';

/**
 * Analyze job description and return suggestions
 * POST /api/jobs/analyze
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to analyze jobs');
    }

    const body = await request.json();
    const { title, description, location, imageUrls } = body;

    if (!title && !description && (!imageUrls || imageUrls.length === 0)) {
      throw new BadRequestError('Title, description, or image URLs are required');
    }

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

    // Analyze the job with text and images
    const analysis = await JobAnalysisService.analyzeJobWithImages(
      title || '',
      description || '',
      validatedImageUrls,
      location
    );

    return NextResponse.json(analysis);

  } catch (error) {
    return handleAPIError(error);
  }
}

