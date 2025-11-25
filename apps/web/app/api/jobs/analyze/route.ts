import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { JobAnalysisService } from '@/lib/services/JobAnalysisService';
import { validateURLs } from '@/lib/security/url-validation';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, location, imageUrls } = body;

    if (!title && !description && (!imageUrls || imageUrls.length === 0)) {
      return NextResponse.json(
        { error: 'Title, description, or image URLs are required' },
        { status: 400 }
      );
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
        return NextResponse.json(
          { error: `Invalid image URLs: ${urlValidation.invalid.map(i => i.error).join(', ')}` },
          { status: 400 }
        );
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
    logger.error('Error analyzing job', error, {
      service: 'jobs-analyze',
    });
    return NextResponse.json(
      { error: 'Failed to analyze job description' },
      { status: 500 }
    );
  }
}

