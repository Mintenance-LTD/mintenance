import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { logger } from '@mintenance/shared';
import { handleAPIError, BadRequestError, NotFoundError } from '@/lib/errors/api-error';

/**
 * GET /api/admin/ai-monitoring/learning-metrics
 * Returns learning progress metrics for an agent
 * Query params:
 * - agentName: agent name (required)
 * REQUIRES: Admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get('agentName');

    if (!agentName) {
      throw new BadRequestError('agentName query parameter is required');
    }

    const learningData = await AgentAnalytics.getLearningProgress(agentName);

    if (!learningData) {
      throw new NotFoundError('No learning data available for this agent');
    }

    return NextResponse.json({
      success: true,
      data: learningData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
