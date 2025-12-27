import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PricingAgent } from '@/lib/services/agents/PricingAgent';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError } from '@/lib/errors/api-error';

/**
 * GET /api/jobs/[id]/pricing-recommendation
 * Get pricing recommendation for a job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

