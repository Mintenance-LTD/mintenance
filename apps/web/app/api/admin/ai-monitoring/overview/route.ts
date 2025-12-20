import { NextRequest, NextResponse } from 'next/server';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';

/**
 * GET /api/admin/ai-monitoring/overview
 * Returns overview metrics for all AI agents
 * REQUIRES: Admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication & Authorization check
    const user = await getCurrentUserFromCookies();

    if (!user) {
      logger.warn('Unauthorized attempt to access AI monitoring overview - no user', {
        service: 'AIMonitoringAPI',
        endpoint: '/api/admin/ai-monitoring/overview',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      logger.warn('Forbidden attempt to access AI monitoring overview - non-admin user', {
        service: 'AIMonitoringAPI',
        endpoint: '/api/admin/ai-monitoring/overview',
        userId: user.id,
        userRole: user.role,
      });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const metrics = await AgentAnalytics.getOverviewMetrics();

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching AI monitoring overview', error, {
      service: 'AIMonitoringAPI',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch overview metrics',
      },
      { status: 500 }
    );
  }
}
