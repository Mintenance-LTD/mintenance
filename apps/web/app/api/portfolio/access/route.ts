import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { checkPortfolioModeAccess } from '@/lib/middleware/subscription-check';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Returns whether the current user can access Portfolio Mode.
 * Intended for paywall-aware UI gating before calling protected portfolio APIs.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 30,
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
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const access = await checkPortfolioModeAccess(user.id);

    return NextResponse.json({
      feature: 'portfolio_mode',
      allowed: access.allowed,
      requiresSubscription: access.requiresSubscription,
      subscriptionStatus: access.subscriptionStatus,
      earlyAccessEligible: access.earlyAccessEligible || false,
      reasonCode: access.reasonCode || null,
      message: access.message || null,
      upgradeUrl: '/pricing?feature=portfolio_mode',
    });
  } catch (err) {
    return handleAPIError(err);
  }
}
