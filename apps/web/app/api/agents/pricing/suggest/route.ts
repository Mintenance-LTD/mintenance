import { PricingAgent } from '@/lib/services/agents/PricingAgent';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@mintenance/shared';

const pricingSuggestSchema = z.object({
  jobId: z.string().uuid(),
  proposedPrice: z.number().positive().max(1_000_000).optional(),
});

export const dynamic = 'force-dynamic';

export const POST = withApiHandler({ roles: ['contractor'], rateLimit: { maxRequests: 30 } }, async (request, { user }) => {
  const body = await request.json();
  const parsed = pricingSuggestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'jobId (UUID) is required. proposedPrice must be a positive number if provided.' },
      { status: 400 }
    );
  }
  const { jobId, proposedPrice } = parsed.data;

  logger.info('Generating pricing suggestion', { service: 'PricingSuggestionAPI', jobId, contractorId: user.id, hasProposedPrice: !!proposedPrice });

  const recommendation = await PricingAgent.generateRecommendation(jobId, user.id, proposedPrice);

  if (!recommendation) {
    logger.warn('No pricing recommendation available', { service: 'PricingSuggestionAPI', jobId, contractorId: user.id });
    return NextResponse.json(
      { error: 'Unable to generate pricing suggestion', message: 'Not enough market data available for this job category and location. Please use your best judgment.' },
      { status: 404 }
    );
  }

  const response = {
    success: true,
    suggestion: {
      priceRange: { min: recommendation.recommendedMinPrice, recommended: recommendation.recommendedOptimalPrice, max: recommendation.recommendedMaxPrice },
      marketData: { averageBid: recommendation.marketAvgPrice, medianBid: recommendation.marketMedianPrice, rangeMin: recommendation.marketRangeMin, rangeMax: recommendation.marketRangeMax },
      winProbability: Math.round((1 - recommendation.competitivenessScore / 100) * 100),
      competitivenessLevel: recommendation.competitivenessLevel,
      competitivenessScore: recommendation.competitivenessScore,
      confidenceScore: Math.round(recommendation.confidenceScore * 100),
      reasoning: recommendation.reasoning,
      factors: recommendation.factors,
      recommendationId: recommendation.id,
      costBreakdown: recommendation.costBreakdown,
    },
  };

  logger.info('Pricing suggestion generated successfully', { service: 'PricingSuggestionAPI', jobId, contractorId: user.id, recommendedPrice: recommendation.recommendedOptimalPrice, confidence: response.suggestion.confidenceScore });

  return NextResponse.json(response);
});
