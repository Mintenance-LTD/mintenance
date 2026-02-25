import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';

/**
 * GET /api/admin/ai-monitoring/learning-metrics
 * Returns learning progress metrics for an agent
 * Query params: agentName (required)
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request) => {
    const agentName = request.nextUrl.searchParams.get('agentName');

    if (!agentName) {
      throw new BadRequestError('agentName query parameter is required');
    }

    const learningData = await AgentAnalytics.getLearningProgress(agentName);

    if (!learningData) {
      throw new NotFoundError('No learning data available for this agent');
    }

    return NextResponse.json({
      success: true,
      data: learningData,
      timestamp: new Date().toISOString(),
    });
  }
);
