import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { logger } from '@mintenance/shared';
import { handleAPIError, NotFoundError } from '@/lib/errors/api-error';

/**
 * GET /api/admin/ai-monitoring/agent/[name]
 * Returns detailed metrics for a specific agent
 * Query params:
 * - timeRange: 24h | 7d | 30d (default: 30d)
 * REQUIRES: Admin authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const { name } = await params;
    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get('timeRange') || '30d') as '24h' | '7d' | '30d';

    const metrics = await AgentAnalytics.getAgentMetrics(name, timeRange);

    if (!metrics) {
      throw new NotFoundError('Agent not found or no data available');
    }

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
