import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { PricingAgent } from '@/lib/services/agents/PricingAgent';

/**
 * GET /api/jobs/[id]/pricing-recommendation
 * Get pricing recommendation for a job
 */
export const GET = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user, params }) => {
    const searchParams = request.nextUrl.searchParams;
    const proposedPrice = searchParams.get('proposedPrice');
    const proposedPriceNumber = proposedPrice ? parseFloat(proposedPrice) : undefined;

    const recommendation = await PricingAgent.generateRecommendation(
      params.id,
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
  }
);
