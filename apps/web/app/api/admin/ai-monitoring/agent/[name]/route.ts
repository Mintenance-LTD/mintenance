import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { NotFoundError } from '@/lib/errors/api-error';

/**
 * GET /api/admin/ai-monitoring/agent/[name]
 * Returns detailed metrics for a specific agent
 * Query params: timeRange (24h | 7d | 30d, default: 30d)
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request, { params }) => {
    const { name } = params;
    const timeRange = (request.nextUrl.searchParams.get('timeRange') || '30d') as '24h' | '7d' | '30d';

    const metrics = await AgentAnalytics.getAgentMetrics(name, timeRange);

    if (!metrics) {
      throw new NotFoundError('Agent not found or no data available');
    }

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  }
);
