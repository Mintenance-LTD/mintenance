import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { ProfileBoostService } from '@/lib/services/verification/ProfileBoostService';
import { logger } from '@mintenance/shared';

/**
 * GET /api/contractor/profile-boost
 * Get profile boost breakdown for the authenticated contractor
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Only contractors can access profile boost data' },
        { status: 403 }
      );
    }

    const boost = await ProfileBoostService.getBoost(user.id);

    if (!boost) {
      // If no boost exists, calculate it
      const calculatedBoost = await ProfileBoostService.calculateBoost(user.id);

      if (!calculatedBoost) {
        return NextResponse.json(
          { error: 'Failed to calculate profile boost' },
          { status: 500 }
        );
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
    logger.error('Error fetching profile boost', error, { service: 'contractor-api' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contractor/profile-boost/recalculate
 * Force recalculation of profile boost
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Only contractors can recalculate profile boost' },
        { status: 403 }
      );
    }

    const boost = await ProfileBoostService.calculateBoost(user.id);

    if (!boost) {
      return NextResponse.json(
        { error: 'Failed to recalculate profile boost' },
        { status: 500 }
      );
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
    logger.error('Error recalculating profile boost', error, { service: 'contractor-api' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
