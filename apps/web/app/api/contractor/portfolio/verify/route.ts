import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { PortfolioVerificationService } from '@/lib/services/verification/PortfolioVerificationService';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{}> }
) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);

    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      throw new UnauthorizedError('Authentication required');
    }

    const body = await request.json();
    const { portfolioId, action } = body;

    if (!portfolioId) {
      throw new BadRequestError('Portfolio ID is required');
    }

    if (action === 'verify') {
      const success = await PortfolioVerificationService.verifyPortfolioItem(portfolioId, user.id);
      if (!success) {
        throw new InternalServerError('Failed to verify portfolio item');
      }
      return NextResponse.json({ message: 'Portfolio item verified successfully' });
    }

    if (action === 'unverify') {
      const success = await PortfolioVerificationService.unverifyPortfolioItem(portfolioId);
      if (!success) {
        throw new InternalServerError('Failed to unverify portfolio item');
      }
      return NextResponse.json({ message: 'Portfolio item unverified successfully' });
    }

    throw new BadRequestError('Invalid action');
  } catch (error) {
    logger.error('Error verifying portfolio', error, { service: 'contractor' });
    throw new InternalServerError('Internal server error');
  }
}

