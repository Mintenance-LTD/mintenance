import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';

/**
 * GET /api/admin/hybrid-inference/stats
 * Returns hybrid inference routing statistics and model info.
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const range = request.nextUrl.searchParams.get('range') || '30d';

    logger.info('Hybrid inference stats requested', {
      service: 'hybrid_inference_stats',
      userId: user.id,
      range,
    });

    // Return empty/default stats — no inference data exists yet
    return NextResponse.json({
      stats: {
        totalAssessments: 0,
        routeDistribution: { internal: 0, gpt4_vision: 0, hybrid: 0 },
        averageConfidence: { internal: 0, gpt4_vision: 0, hybrid: 0 },
        averageInferenceTime: { internal: 0, gpt4_vision: 0, hybrid: 0 },
        agreementScores: [],
      },
      modelInfo: {
        version: '0.0.0',
        accuracy: 0,
        sampleCount: 0,
        trainingDate: new Date().toISOString(),
        isReady: false,
      },
    });
  }
);
