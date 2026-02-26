import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';

/**
 * GET /api/admin/ai-monitoring/overview
 * Returns overview metrics for all AI agents
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async () => {
    const metrics = await AgentAnalytics.getOverviewMetrics();
    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  }
);
