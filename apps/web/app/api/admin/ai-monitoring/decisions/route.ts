import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';

/**
 * GET /api/admin/ai-monitoring/decisions
 * Returns decision logs with pagination
 * Query params: agentName, limit (max 200), offset, errorsOnly
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async (request) => {
    const searchParams = request.nextUrl.searchParams;
    const agentName = searchParams.get('agentName') || null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    const errorsOnly = searchParams.get('errorsOnly') === 'true';

    const { logs, total } = await AgentAnalytics.getDecisionLogs(agentName, limit, offset, errorsOnly);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
      timestamp: new Date().toISOString(),
    });
  }
);
