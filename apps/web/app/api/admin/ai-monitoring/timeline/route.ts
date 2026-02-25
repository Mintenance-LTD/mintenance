import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';

/**
 * GET /api/admin/ai-monitoring/timeline
 * Returns decision timeline for the last 24 hours
 * Query params: agentName (optional)
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request) => {
    const agentName = request.nextUrl.searchParams.get('agentName') || null;
    const timeline = await AgentAnalytics.getDecisionTimeline(agentName);

    return NextResponse.json({
      success: true,
      data: timeline,
      count: timeline.length,
      timestamp: new Date().toISOString(),
    });
  }
);
