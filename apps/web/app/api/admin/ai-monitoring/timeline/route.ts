import { NextRequest, NextResponse } from 'next/server';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';

/**
 * GET /api/admin/ai-monitoring/timeline
 * Returns decision timeline for the last 24 hours
 * Query params:
 * - agentName: filter by agent name (optional)
 * REQUIRES: Admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication & Authorization check
    const user = await getCurrentUserFromCookies();

    if (\!user) {
      logger.warn('Unauthorized attempt to access AI monitoring timeline - no user', {
        service: 'AIMonitoringAPI',
        endpoint: '/api/admin/ai-monitoring/timeline',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role \!== 'admin') {
      logger.warn('Forbidden attempt to access AI monitoring timeline - non-admin user', {
        service: 'AIMonitoringAPI',
        endpoint: '/api/admin/ai-monitoring/timeline',
        userId: user.id,
        userRole: user.role,
      });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get('agentName') || null;

    const timeline = await AgentAnalytics.getDecisionTimeline(agentName);

    return NextResponse.json({
      success: true,
      data: timeline,
      count: timeline.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching decision timeline', error, {
      service: 'AIMonitoringAPI',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch decision timeline',
      },
      { status: 500 }
    );
  }
}
