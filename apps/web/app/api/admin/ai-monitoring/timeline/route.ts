import { NextRequest, NextResponse } from 'next/server';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { logger } from '@mintenance/shared';

/**
 * GET /api/admin/ai-monitoring/timeline
 * Returns decision timeline for the last 24 hours
 * Query params:
 * - agentName: filter by agent name (optional)
 */
export async function GET(request: NextRequest) {
  try {
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
