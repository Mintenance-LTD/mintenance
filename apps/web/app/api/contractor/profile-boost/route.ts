import { NextResponse } from 'next/server';
import { ProfileBoostService } from '@/lib/services/verification/ProfileBoostService';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/contractor/profile-boost
 * Get profile boost breakdown for the authenticated contractor
 */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const boost = await ProfileBoostService.getBoost(user.id);

    if (!boost) {
      const calculatedBoost = await ProfileBoostService.calculateBoost(user.id);
      if (!calculatedBoost) throw new InternalServerError('Failed to calculate profile boost');

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
  }
);

/**
 * POST /api/contractor/profile-boost
 * Force recalculation of profile boost
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const boost = await ProfileBoostService.calculateBoost(user.id);
    if (!boost) throw new InternalServerError('Failed to recalculate profile boost');

    logger.info('Profile boost recalculated', { service: 'profile-boost', userId: user.id });

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
  }
);
