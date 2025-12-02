import { NextRequest, NextResponse } from 'next/server';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { logger } from '@mintenance/shared';

/**
 * GET /api/admin/ai-monitoring/learning-metrics
 * Returns learning progress metrics for an agent
 * Query params:
 * - agentName: agent name (required)
 */
export async function GET(request: NextRequest) {
  try {
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
