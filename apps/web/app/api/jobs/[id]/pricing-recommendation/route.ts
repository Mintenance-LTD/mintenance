import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PricingAgent } from '@/lib/services/agents/PricingAgent';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * GET /api/jobs/[id]/pricing-recommendation
 * Get pricing recommendation for a job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required for pricing recommendations');
    }

    // Only contractors can get pricing recommendations
    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can get pricing recommendations');
    }

    const { id: jobId } = await params;

    // Get optional proposed price from query params
    const searchParams = request.nextUrl.searchParams;
    const proposedPrice = searchParams.get('proposedPrice');
    const proposedPriceNumber = proposedPrice ? parseFloat(proposedPrice) : undefined;

    // Generate recommendation
    const recommendation = await PricingAgent.generateRecommendation(
      jobId,
      user.id,
      proposedPriceNumber
    );

    if (!recommendation) {
      throw new Error('Failed to generate pricing recommendation');
    }

    return NextResponse.json({
      success: true,
      recommendation,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

