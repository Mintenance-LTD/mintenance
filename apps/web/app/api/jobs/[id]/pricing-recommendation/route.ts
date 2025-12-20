import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PricingAgent } from '@/lib/services/agents/PricingAgent';
import { logger } from '@mintenance/shared';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only contractors can get pricing recommendations
    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can get pricing recommendations' }, { status: 403 });
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
      return NextResponse.json({ error: 'Failed to generate pricing recommendation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      recommendation,
    });
  } catch (error) {
    logger.error('Error getting pricing recommendation', error, {
      service: 'pricing-recommendation',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

