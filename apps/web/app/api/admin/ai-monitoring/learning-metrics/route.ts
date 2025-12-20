import { NextRequest, NextResponse } from 'next/server';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';

/**
 * GET /api/admin/ai-monitoring/learning-metrics
 * Returns learning progress metrics for an agent
 * Query params:
 * - agentName: agent name (required)
 * REQUIRES: Admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication & Authorization check
    const user = await getCurrentUserFromCookies();

    if (!user) {
      logger.warn('Unauthorized attempt to access AI monitoring learning metrics - no user', {
        service: 'AIMonitoringAPI',
        endpoint: '/api/admin/ai-monitoring/learning-metrics',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      logger.warn('Forbidden attempt to access AI monitoring learning metrics - non-admin user', {
        service: 'AIMonitoringAPI',
        endpoint: '/api/admin/ai-monitoring/learning-metrics',
        userId: user.id,
        userRole: user.role,
      });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get('agentName');

    if (!agentName) {
      return NextResponse.json(
        {
          success: false,
          error: 'agentName query parameter is required',
        },
        { status: 400 }
      );
    }

    const learningData = await AgentAnalytics.getLearningProgress(agentName);

    if (!learningData) {
      return NextResponse.json(
        {
          success: false,
          error: 'No learning data available for this agent',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: learningData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching learning metrics', error, {
      service: 'AIMonitoringAPI',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch learning metrics',
      },
      { status: 500 }
    );
  }
}
