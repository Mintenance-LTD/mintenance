import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { ProfileBoostService } from '@/lib/services/verification/ProfileBoostService';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * GET /api/contractor/profile-boost
 * Get profile boost breakdown for the authenticated contractor
 */
export async function GET(request: NextRequest) {
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
      throw new UnauthorizedError('Authentication required');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can access profile boost data');
    }

    const boost = await ProfileBoostService.getBoost(user.id);

    if (!boost) {
      // If no boost exists, calculate it
      const calculatedBoost = await ProfileBoostService.calculateBoost(user.id);

      if (!calculatedBoost) {
        throw new InternalServerError('Failed to calculate profile boost');
      }

      return NextResponse.json({
        boost: {
          baseTrustScore: calculatedBoost.baseTrustScore,
          verificationBoosts: {
            dbsCheck: calculatedBoost.dbsCheckBoost,
            adminVerified: calculatedBoost.adminVerifiedBoost,
            phoneVerified: calculatedBoost.phoneVerifiedBoost,
            emailVerified: calculatedBoost.emailVerifiedBoost,
          },
          qualityBoosts: {
            personalityAssessment: calculatedBoost.personalityAssessmentBoost,
            portfolioCompleteness: calculatedBoost.portfolioCompletenessBoost,
            certifications: calculatedBoost.certificationsBoost,
            insuranceVerified: calculatedBoost.insuranceVerifiedBoost,
          },
          totalBoostPercentage: calculatedBoost.totalBoostPercentage,
          rankingScore: calculatedBoost.rankingScore,
          tier: calculatedBoost.tier,
          lastCalculatedAt: calculatedBoost.lastCalculatedAt,
        },
      });
    }

    // Get missing verifications to show what can be improved
    const missingVerifications = await ProfileBoostService.getMissingVerifications(user.id);

    return NextResponse.json({
      boost: {
        baseTrustScore: boost.baseTrustScore,
        verificationBoosts: {
          dbsCheck: boost.dbsCheckBoost,
          adminVerified: boost.adminVerifiedBoost,
          phoneVerified: boost.phoneVerifiedBoost,
          emailVerified: boost.emailVerifiedBoost,
        },
        qualityBoosts: {
          personalityAssessment: boost.personalityAssessmentBoost,
          portfolioCompleteness: boost.portfolioCompletenessBoost,
          certifications: boost.certificationsBoost,
          insuranceVerified: boost.insuranceVerifiedBoost,
        },
        totalBoostPercentage: boost.totalBoostPercentage,
        rankingScore: boost.rankingScore,
        tier: boost.tier,
        lastCalculatedAt: boost.lastCalculatedAt,
      },
      recommendations: missingVerifications,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * POST /api/contractor/profile-boost/recalculate
 * Force recalculation of profile boost
 */
export async function POST(request: NextRequest) {
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
      throw new UnauthorizedError('Authentication required');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can recalculate profile boost');
    }

    const boost = await ProfileBoostService.calculateBoost(user.id);

    if (!boost) {
      throw new InternalServerError('Failed to recalculate profile boost');
    }

    return NextResponse.json({
      success: true,
      message: 'Profile boost recalculated successfully',
      boost: {
        rankingScore: boost.rankingScore,
        tier: boost.tier,
        totalBoostPercentage: boost.totalBoostPercentage,
        lastCalculatedAt: boost.lastCalculatedAt,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
