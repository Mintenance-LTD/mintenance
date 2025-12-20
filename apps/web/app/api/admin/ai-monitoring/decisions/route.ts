import { NextRequest, NextResponse } from 'next/server';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';

/**
 * GET /api/admin/ai-monitoring/decisions
 * Returns decision logs with pagination
 * Query params:
 * - agentName: filter by agent name (optional)
 * - limit: number of records (default: 50, max: 200)
 * - offset: pagination offset (default: 0)
 * - errorsOnly: boolean (default: false)
 * REQUIRES: Admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication & Authorization check
    const user = await getCurrentUserFromCookies();

    if (!user) {
      logger.warn('Unauthorized attempt to access AI monitoring decisions - no user', {
        service: 'AIMonitoringAPI',
        endpoint: '/api/admin/ai-monitoring/decisions',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      logger.warn('Forbidden attempt to access AI monitoring decisions - non-admin user', {
        service: 'AIMonitoringAPI',
        endpoint: '/api/admin/ai-monitoring/decisions',
        userId: user.id,
        userRole: user.role,
      });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get('agentName') || null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    const errorsOnly = searchParams.get('errorsOnly') === 'true';

    const { logs, total } = await AgentAnalytics.getDecisionLogs(
      agentName,
      limit,
      offset,
      errorsOnly
    );

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching decision logs', error, {
      service: 'AIMonitoringAPI',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch decision logs',
      },
      { status: 500 }
    );
  }
}
