import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';

/**
 * GET /api/admin/ai-monitoring/agents
 * Returns metrics for all agents
 * Query params: timeRange (24h | 7d | 30d, default: 30d)
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async () => {
    const agents = await AgentAnalytics.getAllAgentsOverview();
    return NextResponse.json({
      success: true,
      data: agents,
      count: agents.length,
      timestamp: new Date().toISOString(),
    });
  }
);
