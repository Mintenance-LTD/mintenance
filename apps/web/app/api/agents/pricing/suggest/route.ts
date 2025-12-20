import { PricingAgent } from '@/lib/services/agents/PricingAgent';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

export const dynamic = 'force-dynamic';

/**
 * POST /api/agents/pricing/suggest
 *
 * Get AI-powered pricing suggestion for a bid
 *
 * Request body:
 * - jobId: string (required)
 * - proposedPrice?: number (optional, for competitiveness analysis)
 *
 * Response:
 * - PricingRecommendation object with suggested price ranges, market data, and insights
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    if (user.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Only contractors can request pricing suggestions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { jobId, proposedPrice } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      );
    }

    logger.info('Generating pricing suggestion', {
      service: 'PricingSuggestionAPI',
      jobId,
      contractorId: user.id,
      hasProposedPrice: !!proposedPrice,
    });

    // Generate pricing recommendation using PricingAgent
    const recommendation = await PricingAgent.generateRecommendation(
      jobId,
      user.id,
      proposedPrice
    );

    if (!recommendation) {
      logger.warn('No pricing recommendation available', {
        service: 'PricingSuggestionAPI',
        jobId,
        contractorId: user.id,
      });

      return NextResponse.json(
        {
          error: 'Unable to generate pricing suggestion',
          message: 'Not enough market data available for this job category and location. Please use your best judgment.',
        },
        { status: 404 }
      );
    }

    // Transform to friendly format for frontend
    const response = {
      success: true,
      suggestion: {
        // Price range
        priceRange: {
          min: recommendation.recommendedMinPrice,
          recommended: recommendation.recommendedOptimalPrice,
          max: recommendation.recommendedMaxPrice,
        },

        // Market insights
        marketData: {
          averageBid: recommendation.marketAvgPrice,
          medianBid: recommendation.marketMedianPrice,
          rangeMin: recommendation.marketRangeMin,
          rangeMax: recommendation.marketRangeMax,
        },

        // Win probability and competitiveness
        winProbability: Math.round((1 - recommendation.competitivenessScore / 100) * 100), // Invert score for win probability
        competitivenessLevel: recommendation.competitivenessLevel,
        competitivenessScore: recommendation.competitivenessScore,

        // Confidence and reasoning
        confidenceScore: Math.round(recommendation.confidenceScore * 100),
        reasoning: recommendation.reasoning,

        // Additional metadata
        factors: recommendation.factors,
        recommendationId: recommendation.id,
      },
    };

    logger.info('Pricing suggestion generated successfully', {
      service: 'PricingSuggestionAPI',
      jobId,
      contractorId: user.id,
      recommendedPrice: recommendation.recommendedOptimalPrice,
      confidence: response.suggestion.confidenceScore,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error generating pricing suggestion', error, {
      service: 'PricingSuggestionAPI',
    });

    return NextResponse.json(
      {
        error: 'Failed to generate pricing suggestion',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
