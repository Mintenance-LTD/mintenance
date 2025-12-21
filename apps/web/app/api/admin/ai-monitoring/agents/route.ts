import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { logger } from '@mintenance/shared';

/**
 * GET /api/admin/ai-monitoring/agents
 * Returns metrics for all agents
 * Query params:
 * - timeRange: 24h | 7d | 30d (default: 30d)
 * REQUIRES: Admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const agents = await AgentAnalytics.getAllAgentsOverview();

    return NextResponse.json({
      success: true,
      data: agents,
      count: agents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching all agents metrics', error, {
      service: 'AIMonitoringAPI',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch agents metrics',
      },
      { status: 500 }
    );
  }
}
