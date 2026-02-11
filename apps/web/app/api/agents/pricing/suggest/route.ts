import { PricingAgent } from '@/lib/services/agents/PricingAgent';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';

const pricingSuggestSchema = z.object({
  jobId: z.string().uuid(),
  proposedPrice: z.number().positive().max(1_000_000).optional(),
});

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
    const parsed = pricingSuggestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'jobId (UUID) is required. proposedPrice must be a positive number if provided.' },
        { status: 400 }
      );
    }
    const { jobId, proposedPrice } = parsed.data;

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

        // Cost breakdown (materials, labor, overhead, profit)
        costBreakdown: recommendation.costBreakdown,
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
