import { NextRequest, NextResponse } from 'next/server';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';

/**
 * GET /api/admin/ai-monitoring/agents
 * Returns metrics for all agents
 * Query params:
 * - timeRange: 24h | 7d | 30d (default: 30d)
 * REQUIRES: Admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication & Authorization check
    const user = await getCurrentUserFromCookies();

    if (!user) {
      logger.warn('Unauthorized attempt to access AI monitoring agents - no user', {
        service: 'AIMonitoringAPI',
        endpoint: '/api/admin/ai-monitoring/agents',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      logger.warn('Forbidden attempt to access AI monitoring agents - non-admin user', {
        service: 'AIMonitoringAPI',
        endpoint: '/api/admin/ai-monitoring/agents',
        userId: user.id,
        userRole: user.role,
      });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

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
