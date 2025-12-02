import { NextRequest, NextResponse } from 'next/server';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { logger } from '@mintenance/shared';

/**
 * GET /api/admin/ai-monitoring/overview
 * Returns overview metrics for all AI agents
 */
export async function GET(request: NextRequest) {
  try {
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
